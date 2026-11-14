/**
 * Plans and prices (docs/SPEC.md 10.1, 17.2). Shared by the server and the paywall.
 * Prices are sent to Stripe as inline `price_data`, so nothing has to be created
 * in the Stripe dashboard.
 *
 * Display names follow the subscription levels of SPEC 17.2 (Big Day Pass, Gold);
 * the stored plan ids stay the contract ids `event | year | month` (SPEC 6.1).
 * Screens ask for a capability, never for a level name, so levels can be renamed later.
 */
import type { Entitlement, PlanId } from '../engine/types';

/** What the browser may ask for at checkout. `upgrade` buys a `year` plan with a discount. */
export type CheckoutPlan = PlanId | 'upgrade';
export const CHECKOUT_PLANS = ['event', 'year', 'month', 'upgrade'] as const satisfies readonly CheckoutPlan[];

export type Capability = 'chapters.all' | 'daycard';

export interface PlanInfo {
  id: CheckoutPlan;
  /** The entitlement this purchase writes. */
  grants: PlanId;
  name: string;
  /** Price in cents charged today. */
  amountCents: number;
  /** Price in cents of every later renewal (subscriptions only). */
  renewalCents?: number;
  mode: 'payment' | 'subscription';
  interval?: 'year' | 'month';
  /** Event Pack access length in days. */
  accessDays?: number;
  /**
   * Days before a renewal the reminder goes out (SPEC 10.5). California's
   * auto-renewal law asks for a notice 15 to 45 days before a yearly renewal.
   */
  reminderDays?: number;
  headline: string;
  perks: string[];
  capabilities: Capability[];
}

export const EVENT_PACK_DAYS = 90;
export const UPGRADE_DISCOUNT_CENTS = 1000;

export const PLANS: Record<CheckoutPlan, PlanInfo> = {
  event: {
    id: 'event',
    grants: 'event',
    name: 'Big Day Pass',
    amountCents: 999,
    mode: 'payment',
    accessDays: EVENT_PACK_DAYS,
    headline: 'Everything for this one big day',
    perks: [
      'Every chapter of this story',
      'The event-day card with a printable PDF',
      'One payment. No subscription, nothing renews',
    ],
    capabilities: ['chapters.all', 'daycard'],
  },
  year: {
    id: 'year',
    grants: 'year',
    name: 'Gold',
    amountCents: 4900,
    renewalCents: 4900,
    mode: 'subscription',
    interval: 'year',
    reminderDays: 30,
    headline: 'Ready for every big day',
    perks: [
      'Every chapter of every big day for 12 months',
      'Event-day cards with printable PDFs',
      'The story remembers what helped last time',
      'Cancel anytime in Settings',
    ],
    capabilities: ['chapters.all', 'daycard'],
  },
  month: {
    id: 'month',
    grants: 'month',
    name: 'Gold monthly',
    amountCents: 799,
    renewalCents: 799,
    mode: 'subscription',
    interval: 'month',
    headline: 'Ready for every big day',
    perks: ['Everything in Gold, paid month by month'],
    capabilities: ['chapters.all', 'daycard'],
  },
  upgrade: {
    id: 'upgrade',
    grants: 'year',
    name: 'Gold',
    amountCents: 4900 - UPGRADE_DISCOUNT_CENTS,
    renewalCents: 4900,
    mode: 'subscription',
    interval: 'year',
    reminderDays: 30,
    headline: 'Add $39 and get the full year',
    perks: ['Every big day for 12 months', 'Your Big Day Pass counts toward it'],
    capabilities: ['chapters.all', 'daycard'],
  },
};

export function isSubscription(plan: CheckoutPlan): boolean {
  return PLANS[plan].mode === 'subscription';
}

/** "$9.99", "$49". */
export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** Auto-renewal terms shown next to every plan (SPEC 10.5). */
export function renewalTerms(plan: CheckoutPlan): string {
  const p = PLANS[plan];
  if (p.mode !== 'subscription') return 'One payment. Nothing renews and you will never be charged again.';
  const price = formatUsd(p.renewalCents ?? p.amountCents);
  const per = p.interval === 'year' ? 'per year' : 'per month';
  const first = plan === 'upgrade' ? `${formatUsd(p.amountCents)} today for the first year, then it renews` : 'Renews';
  const reminder = p.reminderDays ? ` We'll remind you ${p.reminderDays} days before renewal.` : '';
  return `${first} automatically at ${price} ${per} until you cancel.${reminder} Cancel anytime in Settings.`;
}

/** Does a family's access include a capability for this event (SPEC 5.6). */
export function hasCapability(list: Entitlement[], cap: Capability, eventId: string, now = Date.now()): boolean {
  return list.some((e) => {
    if (e.expiresAt <= now) return false;
    if (!PLANS[e.plan].capabilities.includes(cap)) return false;
    return e.plan === 'year' || e.plan === 'month' || e.eventId === eventId;
  });
}

/** The longest-running subscription of a family, if any (for Settings). */
export function activeSubscription(list: Entitlement[], now = Date.now()): Entitlement | undefined {
  return list
    .filter((e) => (e.plan === 'year' || e.plan === 'month') && e.expiresAt > now)
    .sort((a, b) => b.expiresAt - a.expiresAt)[0];
}

export function ownsEventPack(list: Entitlement[], now = Date.now()): boolean {
  return list.some((e) => e.plan === 'event' && e.expiresAt > now);
}
