import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { closeDb, getDb } from '@/lib/db/client';
import { entitlements } from '@/lib/db/schema';
import { hasEventAccess } from '@/lib/db/entitlements';
import { resetEnvCache } from '@/lib/env';
import { resetRateLimits } from '@/lib/server/ratelimit';
import { gateway, gatewayMode, mockControls } from '@/lib/payments/gateway';
import { accessFor } from '@/lib/payments/access';
import { POST as familyPost } from '@/app/api/family/route';
import { POST as samplePost } from '@/app/api/sample/route';
import { POST as checkoutPost } from '@/app/api/checkout/route';
import { POST as verifyPost } from '@/app/api/verify/route';
import { POST as portalPost } from '@/app/api/portal/route';
import { POST as webhookPost } from '@/app/api/stripe/webhook/route';

afterAll(closeDb);
beforeEach(resetRateLimits);
afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  resetEnvCache();
});

function req(url: string, init: { body?: unknown; cookie?: string; ws?: string; raw?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', origin: 'http://localhost', ...init.headers };
  if (init.cookie) headers.cookie = init.cookie;
  if (init.ws) headers['x-bds-workspace'] = init.ws;
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers,
    body: init.raw ?? JSON.stringify(init.body ?? {}),
  });
}
const cookieOf = (res: Response, name: string) => {
  const m = (res.headers.get('set-cookie') ?? '').match(new RegExp(`${name}=([^;]+)`));
  return m ? `${name}=${m[1]}` : '';
};

async function newFamily() {
  const res = await familyPost(req('/api/family'));
  return { cookie: cookieOf(res, 'bds_session'), familyId: (await res.json()).familyId as string };
}

async function checkout(cookie: string, body: Record<string, unknown>) {
  return checkoutPost(req('/api/checkout', { cookie, body }));
}

function sessionIdOf(url: string) {
  return new URL(url).searchParams.get('session_id')!;
}

describe('payments in mock mode (no Stripe key)', () => {
  it('runs checkout → verify → access for a Big Day Pass, once per session', async () => {
    expect(gatewayMode()).toBe('mock');
    const { cookie, familyId } = await newFamily();
    expect(await hasEventAccess(familyId, 'ev1')).toBe(false);

    const r = await checkout(cookie, { plan: 'event', eventId: 'ev1' });
    expect(r.status).toBe(200);
    const { url } = await r.json();
    expect(url).toMatch(/^http:\/\/localhost(:\d+)?\/paid\?session_id=mock_cs_/);
    const sessionId = sessionIdOf(url);

    const v = await verifyPost(req('/api/verify', { cookie, body: { sessionId } }));
    expect(v.status).toBe(200);
    const body = await v.json();
    expect(body.purchase).toEqual({ plan: 'event', eventId: 'ev1' });
    expect(body.entitlements).toHaveLength(1);
    expect(body.entitlements[0]).toMatchObject({ plan: 'event', eventId: 'ev1', renews: false });
    expect(await hasEventAccess(familyId, 'ev1')).toBe(true);
    expect(await hasEventAccess(familyId, 'ev2')).toBe(false);

    // A second verify (reload of /paid) does not add a row.
    const again = await verifyPost(req('/api/verify', { cookie, body: { sessionId } }));
    expect((await again.json()).entitlements).toHaveLength(1);

    // Buying the same event again is refused.
    expect((await checkout(cookie, { plan: 'event', eventId: 'ev1' })).status).toBe(409);
  });

  it('requires a session and the renewal consent for subscriptions', async () => {
    expect((await checkout('', { plan: 'event', eventId: 'ev1' })).status).toBe(401);
    const { cookie } = await newFamily();
    expect((await checkout(cookie, { plan: 'year', eventId: 'ev1' })).status).toBe(400);
    expect((await checkout(cookie, { plan: 'month', eventId: 'ev1', renewalConsent: false })).status).toBe(400);
    expect((await checkout(cookie, { plan: 'gold', eventId: 'ev1' })).status).toBe(400);
    expect((await checkout(cookie, { plan: 'event', eventId: 'ev1', extra: 1 })).status).toBe(400);
  });

  it('refuses a payment of another family and an unpaid session', async () => {
    const a = await newFamily();
    const b = await newFamily();
    const { url } = await (await checkout(a.cookie, { plan: 'event', eventId: 'ev1' })).json();
    const sessionId = sessionIdOf(url);
    expect((await verifyPost(req('/api/verify', { cookie: b.cookie, body: { sessionId } }))).status).toBe(403);

    const { url: url2 } = await (await checkout(b.cookie, { plan: 'event', eventId: 'ev9' })).json();
    const unpaid = sessionIdOf(url2);
    mockControls.setPaid(unpaid, false);
    expect((await verifyPost(req('/api/verify', { cookie: b.cookie, body: { sessionId: unpaid } }))).status).toBe(402);
    expect((await verifyPost(req('/api/verify', { cookie: b.cookie, body: { sessionId: 'mock_cs_unknown' } }))).status).toBe(404);
  });

  it('Gold yearly unlocks every event, opens the portal and refreshes from Stripe', async () => {
    const { cookie, familyId } = await newFamily();
    expect((await portalPost(req('/api/portal', { cookie }))).status).toBe(404);

    const { url } = await (await checkout(cookie, { plan: 'year', eventId: 'ev1', renewalConsent: true })).json();
    const v = await verifyPost(req('/api/verify', { cookie, body: { sessionId: sessionIdOf(url) } }));
    const { entitlements: list } = await v.json();
    expect(list[0]).toMatchObject({ plan: 'year', renews: true });
    expect(list[0].expiresAt).toBeGreaterThan(Date.now() + 360 * 86_400_000);
    expect(await hasEventAccess(familyId, 'any-event')).toBe(true);
    expect((await checkout(cookie, { plan: 'month', eventId: 'ev1', renewalConsent: true })).status).toBe(409);

    const p = await portalPost(req('/api/portal', { cookie }));
    expect(p.status).toBe(200);
    expect((await p.json()).url).toMatch(/\/settings\?portal=mock$/);

    // Cancelled in the portal and close to the end: the next look-up refreshes the row.
    const db = await getDb();
    const [row] = await db.select().from(entitlements).where(eq(entitlements.familyId, familyId));
    const soon = Date.now() + 86_400_000;
    await db.update(entitlements).set({ expiresAt: new Date(soon) }).where(eq(entitlements.id, row.id));
    mockControls.updateSubscription(row.stripeSubscriptionId!, { cancelAtPeriodEnd: true, periodEnd: soon });
    const after = await accessFor(familyId);
    expect(after[0]).toMatchObject({ plan: 'year', renews: false });
  });

  it('offers the upgrade only to Big Day Pass owners', async () => {
    const { cookie } = await newFamily();
    expect((await checkout(cookie, { plan: 'upgrade', eventId: 'ev1', renewalConsent: true })).status).toBe(400);
    const { url } = await (await checkout(cookie, { plan: 'event', eventId: 'ev1' })).json();
    await verifyPost(req('/api/verify', { cookie, body: { sessionId: sessionIdOf(url) } }));
    const up = await checkout(cookie, { plan: 'upgrade', eventId: 'ev1', renewalConsent: true });
    expect(up.status).toBe(200);
    const v = await verifyPost(req('/api/verify', { cookie, body: { sessionId: sessionIdOf((await up.json()).url) } }));
    const { entitlements: list, purchase } = await v.json();
    expect(purchase.plan).toBe('upgrade');
    expect(list.map((e: { plan: string }) => e.plan).sort()).toEqual(['event', 'year']);
  });

  it('keeps the sample workspace on return from Stripe', async () => {
    const s = await samplePost(req('/api/sample', { ws: 'sample', body: { today: '2026-11-14' } }));
    const cookie = cookieOf(s, 'bds_sample_session');
    const r = await checkoutPost(req('/api/checkout', { cookie, ws: 'sample', body: { plan: 'event', eventId: 'ev1' } }));
    const { url } = await r.json();
    expect(new URL(url).searchParams.get('ws')).toBe('sample');
  });
});

describe('key handling', () => {
  it('refuses a live key', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_123';
    resetEnvCache();
    expect(gatewayMode()).toBe('live_key_refused');
    expect(() => gateway()).toThrow(/test mode only/);
    const { cookie } = await newFamily();
    const r = await checkout(cookie, { plan: 'event', eventId: 'ev1' });
    expect(r.status).toBe(503);
  });
});

describe('webhook', () => {
  const secret = 'whsec_test_secret';
  const stripe = new Stripe('sk_test_x');

  function signed(event: object) {
    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return req('/api/stripe/webhook', { raw: payload, headers: { 'stripe-signature': header } });
  }

  it('is off without STRIPE_WEBHOOK_SECRET and rejects bad signatures', async () => {
    expect((await webhookPost(signed({ id: 'evt', type: 'ping' }))).status).toBe(404);
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    resetEnvCache();
    const bad = req('/api/stripe/webhook', { raw: '{}', headers: { 'stripe-signature': 't=1,v1=00' } });
    expect((await webhookPost(bad)).status).toBe(400);
  });

  it('grants on checkout.session.completed and ends access on subscription.deleted', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    resetEnvCache();
    const { cookie, familyId } = await newFamily();
    const { url } = await (await checkout(cookie, { plan: 'month', eventId: 'ev1', renewalConsent: true })).json();
    const sessionId = sessionIdOf(url);

    const done = await webhookPost(
      signed({ id: 'evt_1', object: 'event', type: 'checkout.session.completed', data: { object: { id: sessionId, object: 'checkout.session' } } }),
    );
    expect(done.status).toBe(200);
    expect(await hasEventAccess(familyId, 'ev1')).toBe(true);

    const db = await getDb();
    const [row] = await db.select().from(entitlements).where(eq(entitlements.familyId, familyId));
    const del = await webhookPost(
      signed({
        id: 'evt_2',
        object: 'event',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: row.stripeSubscriptionId,
            object: 'subscription',
            status: 'canceled',
            cancel_at_period_end: false,
            items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86_400 }] },
          },
        },
      }),
    );
    expect(del.status).toBe(200);
    expect(await hasEventAccess(familyId, 'ev1')).toBe(false);
  });
});
