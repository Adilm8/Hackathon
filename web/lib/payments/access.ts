/**
 * Turns confirmed Stripe payments into access rows (docs/SPEC.md 10.2, 10.4). Server-only.
 * Rows are inserted through `grantPaidAccess` (persistence stream); subscription rows are
 * kept in step with Stripe here: on verify, by the webhook, and when a row is within
 * 3 days of its end.
 */
import 'server-only';
import { and, desc, eq, inArray, isNotNull, lt } from 'drizzle-orm';
import { getDb } from '../db/client';
import { grantPaidAccess, listEntitlements } from '../db/entitlements';
import { entitlements } from '../db/schema';
import type { Entitlement } from '../engine/types';
import { gateway, type CheckoutInfo, type SubscriptionInfo } from './gateway';
import { GOLD_EXTRAS, hasGoldExtra, PLANS } from './plans';

const DAY = 86_400_000;
export const REFRESH_WINDOW_MS = 3 * DAY;

export type RecordResult =
  | { ok: true; plan: CheckoutInfo['plan']; eventId?: string }
  | { ok: false; reason: 'not_paid' | 'wrong_family' | 'bad_metadata' };

/** Writes the access row of a paid Checkout Session. Idempotent on the session id. */
export async function recordCheckout(s: CheckoutInfo, familyId: string | null, now = Date.now()): Promise<RecordResult> {
  if (familyId && s.familyId !== familyId) return { ok: false, reason: 'wrong_family' };
  if (!s.paid) return { ok: false, reason: 'not_paid' };
  if (!s.familyId || !s.plan) return { ok: false, reason: 'bad_metadata' };
  const p = PLANS[s.plan];
  if (p.grants === 'event' && !s.eventId) return { ok: false, reason: 'bad_metadata' };
  const fallbackEnd = now + (p.interval === 'month' ? 31 : 366) * DAY;
  const expiresAt =
    p.mode === 'payment' ? now + (p.accessDays ?? 90) * DAY : s.periodEnd && s.periodEnd > now ? s.periodEnd : fallbackEnd;
  await grantPaidAccess({
    familyId: s.familyId,
    plan: p.grants,
    ...(p.grants === 'event' ? { eventId: s.eventId } : {}),
    stripeSessionId: s.id,
    stripeCustomerId: s.customerId,
    stripeSubscriptionId: s.subscriptionId,
    expiresAt: new Date(expiresAt),
  });
  return { ok: true, plan: s.plan, eventId: s.eventId };
}

/** Status of our row for a Stripe subscription state. */
export function rowStatus(sub: SubscriptionInfo): 'active' | 'canceled' | 'expired' {
  if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) return 'expired';
  return sub.cancelAtPeriodEnd ? 'canceled' : 'active';
}

/** Applies a subscription change (renewal, cancellation, end) to every row of that subscription. */
export async function applySubscription(sub: SubscriptionInfo, now = Date.now()): Promise<number> {
  const db = await getDb();
  const status = rowStatus(sub);
  const expiresAt = new Date(status === 'expired' ? Math.min(sub.periodEnd || now, now) : sub.periodEnd);
  const rows = await db
    .update(entitlements)
    .set({ status, expiresAt })
    .where(eq(entitlements.stripeSubscriptionId, sub.id))
    .returning({ id: entitlements.id });
  return rows.length;
}

/** Refreshes this family's subscription rows that end within 3 days (SPEC 10.4). Never throws. */
export async function refreshSubscriptions(familyId: string, now = Date.now()): Promise<void> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ sub: entitlements.stripeSubscriptionId })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.familyId, familyId),
          isNotNull(entitlements.stripeSubscriptionId),
          inArray(entitlements.status, ['active', 'canceled']),
          lt(entitlements.expiresAt, new Date(now + REFRESH_WINDOW_MS)),
        ),
      );
    const ids = [...new Set(rows.map((r) => r.sub).filter((s): s is string => !!s))];
    if (!ids.length) return;
    const gw = gateway();
    for (const id of ids) {
      const sub = await gw.getSubscription(id);
      if (sub) await applySubscription(sub, now);
    }
  } catch (e) {
    console.warn('[payments] subscription refresh failed:', (e as Error).message);
  }
}

/** The family's access after a refresh: what /api/chapter, /api/ritual and /api/state should use. */
export async function accessFor(familyId: string, now = Date.now()): Promise<Entitlement[]> {
  await refreshSubscriptions(familyId, now);
  return listEntitlements(familyId, now);
}

/** The Stripe customer of the family's newest subscription, for the portal. */
export async function customerOf(familyId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ customer: entitlements.stripeCustomerId })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.familyId, familyId),
        isNotNull(entitlements.stripeCustomerId),
        isNotNull(entitlements.stripeSubscriptionId),
      ),
    )
    .orderBy(desc(entitlements.createdAt))
    .limit(1);
  return row?.customer ?? null;
}

/** Whether the family has a Gold extra right now (premium voice, voice clone). Never throws: false on a database error. */
export async function familyHasExtra(familyId: string, cap: (typeof GOLD_EXTRAS)[number], now = Date.now()): Promise<boolean> {
  try {
    return hasGoldExtra(await accessFor(familyId, now), cap, now);
  } catch (e) {
    console.warn('[payments] access lookup failed:', (e as Error).message);
    return false;
  }
}
