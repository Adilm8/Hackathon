/**
 * The payment provider behind one small interface (docs/SPEC.md 10.2). Server-only.
 *
 * - `stripe`: the official Stripe SDK with a test key (`sk_test_…`). Hosted Checkout,
 *   inline `price_data`, the customer portal configuration created by code on first use.
 * - `mock`: no key in development, tests and the cloud sandbox. Checkout "pays" at once
 *   and returns straight to `/paid`. Never used in production unless STRIPE_MOCK=on.
 *
 * Live keys are refused (N10): the hackathon build only ever runs in test mode.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { env } from '../env';
import { PLANS, UPGRADE_DISCOUNT_CENTS, renewalTerms, type CheckoutPlan } from './plans';

export interface CheckoutRequest {
  plan: CheckoutPlan;
  familyId: string;
  eventId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
}

/** A Checkout Session as the app needs it. */
export interface CheckoutInfo {
  id: string;
  paid: boolean;
  familyId?: string;
  plan?: CheckoutPlan;
  eventId?: string;
  customerId?: string;
  subscriptionId?: string;
  /** End of the paid period of the subscription, ms since epoch. */
  periodEnd?: number;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  periodEnd: number;
  cancelAtPeriodEnd: boolean;
}

export interface Gateway {
  kind: 'stripe' | 'mock';
  createCheckout(r: CheckoutRequest): Promise<{ id: string; url: string }>;
  getCheckout(id: string): Promise<CheckoutInfo | null>;
  getSubscription(id: string): Promise<SubscriptionInfo | null>;
  createPortal(customerId: string, returnUrl: string): Promise<string>;
}

export class PaymentsUnavailable extends Error {}

const UPGRADE_COUPON_ID = 'bds-upgrade-10';
const PORTAL_TAG = 'big-day-stories';

// ---------- mapping (pure, unit-tested) ----------

function idOf(v: string | { id: string } | null | undefined): string | undefined {
  if (!v) return undefined;
  return typeof v === 'string' ? v : v.id;
}

function isPlan(v: unknown): v is CheckoutPlan {
  return typeof v === 'string' && v in PLANS;
}

export function subscriptionInfo(sub: Stripe.Subscription): SubscriptionInfo {
  // Since API 2025-03-31 the period lives on the items; older objects had it on the subscription.
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const ends = sub.items?.data?.map((i) => i.current_period_end).filter((n): n is number => typeof n === 'number') ?? [];
  const end = ends.length ? Math.min(...ends) : (legacy ?? 0);
  return {
    id: sub.id,
    status: sub.status,
    periodEnd: end * 1000,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end || !!sub.cancel_at,
  };
}

export function checkoutInfo(s: Stripe.Checkout.Session): CheckoutInfo {
  const md = s.metadata ?? {};
  const sub = s.subscription && typeof s.subscription !== 'string' ? subscriptionInfo(s.subscription) : undefined;
  return {
    id: s.id,
    paid: s.status === 'complete' && s.payment_status === 'paid',
    familyId: md.familyId || s.client_reference_id || undefined,
    plan: isPlan(md.plan) ? md.plan : undefined,
    eventId: md.eventId || undefined,
    customerId: idOf(s.customer as string | { id: string } | null),
    subscriptionId: idOf(s.subscription as string | { id: string } | null),
    periodEnd: sub?.periodEnd || undefined,
  };
}

// ---------- Stripe ----------

function stripeGateway(client: Stripe): Gateway {
  let portalConfig: string | null = null;

  async function upgradeCoupon(): Promise<string> {
    try {
      await client.coupons.retrieve(UPGRADE_COUPON_ID);
    } catch {
      await client.coupons.create({
        id: UPGRADE_COUPON_ID,
        name: 'Big Day Pass counts toward Gold',
        amount_off: UPGRADE_DISCOUNT_CENTS,
        currency: 'usd',
        duration: 'once',
      });
    }
    return UPGRADE_COUPON_ID;
  }

  async function portalConfiguration(): Promise<string> {
    if (portalConfig) return portalConfig;
    const list = await client.billingPortal.configurations.list({ active: true, limit: 20 });
    const found = list.data.find((c) => c.metadata?.app === PORTAL_TAG);
    if (found) return (portalConfig = found.id);
    const created = await client.billingPortal.configurations.create({
      business_profile: { headline: 'Big Day Stories: manage or cancel your plan' },
      features: {
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
      },
      metadata: { app: PORTAL_TAG },
    });
    return (portalConfig = created.id);
  }

  return {
    kind: 'stripe',
    async createCheckout(r) {
      const p = PLANS[r.plan];
      const metadata = { plan: r.plan, eventId: r.eventId, familyId: r.familyId };
      const unit = r.plan === 'upgrade' ? (p.renewalCents ?? p.amountCents) : p.amountCents;
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: p.mode,
        client_reference_id: r.familyId,
        metadata,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: unit,
              product_data: { name: `Big Day Stories ${p.name}`, description: p.headline },
              ...(p.interval ? { recurring: { interval: p.interval } } : {}),
            },
          },
        ],
        success_url: r.successUrl,
        cancel_url: r.cancelUrl,
        custom_text: { submit: { message: renewalTerms(r.plan) } },
        ...(r.customerId ? { customer: r.customerId } : {}),
      };
      if (p.mode === 'subscription') {
        params.subscription_data = { metadata };
      } else {
        params.payment_intent_data = { metadata };
      }
      if (r.plan === 'upgrade') params.discounts = [{ coupon: await upgradeCoupon() }];
      const s = await client.checkout.sessions.create(params);
      if (!s.url) throw new Error('Stripe returned no checkout URL');
      return { id: s.id, url: s.url };
    },
    async getCheckout(id) {
      try {
        const s = await client.checkout.sessions.retrieve(id, { expand: ['subscription'] });
        return checkoutInfo(s);
      } catch (e) {
        if (e instanceof Stripe.errors.StripeInvalidRequestError && e.statusCode === 404) return null;
        throw e;
      }
    },
    async getSubscription(id) {
      try {
        return subscriptionInfo(await client.subscriptions.retrieve(id));
      } catch (e) {
        if (e instanceof Stripe.errors.StripeInvalidRequestError && e.statusCode === 404) return null;
        throw e;
      }
    },
    async createPortal(customerId, returnUrl) {
      const s = await client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        configuration: await portalConfiguration(),
      });
      return s.url;
    },
  };
}

// ---------- mock ----------

interface MockSession extends CheckoutInfo {
  createdAt: number;
}

type MockStore = { sessions: Map<string, MockSession>; subs: Map<string, SubscriptionInfo> };

function mockStore(): MockStore {
  const g = globalThis as unknown as { __bdsMockPayments?: MockStore };
  g.__bdsMockPayments ??= { sessions: new Map(), subs: new Map() };
  return g.__bdsMockPayments;
}

const DAY = 86_400_000;

export function mockGateway(now: () => number = Date.now): Gateway {
  const store = mockStore();
  return {
    kind: 'mock',
    async createCheckout(r) {
      const id = `mock_cs_${randomUUID().replace(/-/g, '')}`;
      const p = PLANS[r.plan];
      const s: MockSession = {
        id,
        paid: true,
        familyId: r.familyId,
        plan: r.plan,
        eventId: r.eventId,
        customerId: r.customerId ?? `mock_cus_${r.familyId.slice(0, 8)}`,
        createdAt: now(),
      };
      if (p.mode === 'subscription') {
        const sub: SubscriptionInfo = {
          id: `mock_sub_${randomUUID().replace(/-/g, '')}`,
          status: 'active',
          periodEnd: now() + (p.interval === 'year' ? 365 : 30) * DAY,
          cancelAtPeriodEnd: false,
        };
        store.subs.set(sub.id, sub);
        s.subscriptionId = sub.id;
        s.periodEnd = sub.periodEnd;
      }
      store.sessions.set(id, s);
      return { id, url: r.successUrl.replace('{CHECKOUT_SESSION_ID}', id) };
    },
    async getCheckout(id) {
      return store.sessions.get(id) ?? null;
    },
    async getSubscription(id) {
      return store.subs.get(id) ?? null;
    },
    async createPortal(_customerId, returnUrl) {
      const u = new URL(returnUrl);
      u.searchParams.set('portal', 'mock');
      return u.toString();
    },
  };
}

/** Tests: marks a mock session unpaid or changes a mock subscription. */
export const mockControls = {
  setPaid(id: string, paid: boolean) {
    const s = mockStore().sessions.get(id);
    if (s) s.paid = paid;
  },
  updateSubscription(id: string, patch: Partial<SubscriptionInfo>) {
    const s = mockStore().subs.get(id);
    if (s) Object.assign(s, patch);
  },
};

// ---------- selection ----------

let override: Gateway | null = null;
let cachedStripe: { key: string; gw: Gateway } | null = null;

/** Tests only. */
export function setGatewayForTests(g: Gateway | null): void {
  override = g;
}

export function gatewayMode(): 'stripe' | 'mock' | 'live_key_refused' | 'off' {
  const { secretKey, isTestKey } = env().stripe;
  if (secretKey) return isTestKey ? 'stripe' : 'live_key_refused';
  const mockAllowed = !env().isProd || (process.env.STRIPE_MOCK ?? '').trim() === 'on';
  return mockAllowed ? 'mock' : 'off';
}

/** The gateway for this server, or throws PaymentsUnavailable with a message for the parent. */
export function gateway(): Gateway {
  if (override) return override;
  const mode = gatewayMode();
  if (mode === 'live_key_refused') throw new PaymentsUnavailable('Payments run in test mode only. The server has a live key.');
  if (mode === 'off') throw new PaymentsUnavailable('Payments are not set up on this server yet.');
  if (mode === 'mock') return mockGateway();
  const key = env().stripe.secretKey;
  if (cachedStripe?.key !== key) {
    cachedStripe = {
      key,
      gw: stripeGateway(new Stripe(key, { appInfo: { name: 'big-day-stories' }, maxNetworkRetries: 2, timeout: 20_000 })),
    };
  }
  return cachedStripe.gw;
}

/** Webhook verification works without network; any key string builds the client. */
export function webhookVerifier(): (payload: string, signature: string, secret: string) => Stripe.Event {
  const client = new Stripe(env().stripe.secretKey || 'sk_test_webhook_only');
  return (payload, signature, secret) => client.webhooks.constructEvent(payload, signature, secret);
}
