/**
 * Paid and demo access rows (docs/SPEC.md 5.6, 10.4, 10.4a). Server-only.
 * Rows are written only by the server: after Stripe confirms (payments stream)
 * or as demo access for sample families.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { env } from '../env';
import { getDb } from './client';
import { entitlements, families, type EntitlementRow } from './schema';
import type { Entitlement, PlanId } from '../engine/types';

const DEMO_HOURS = 24;

function toEntitlement(r: EntitlementRow): Entitlement {
  return {
    plan: r.plan,
    ...(r.eventId ? { eventId: r.eventId } : {}),
    expiresAt: r.expiresAt.getTime(),
    renews: r.status === 'active' && r.plan !== 'event',
  };
}

/** Active (or cancelled but not yet expired) access of a family; demo rows included. */
export async function listEntitlements(familyId: string, now = Date.now()): Promise<Entitlement[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.familyId, familyId),
        inArray(entitlements.status, ['active', 'canceled', 'demo']),
        gt(entitlements.expiresAt, new Date(now)),
      ),
    );
  return rows.map(toEntitlement);
}

/** Rule of SPEC 5.6, applied to the server's own rows. */
export function grantsEventAccess(list: Entitlement[], eventId: string, now = Date.now()): boolean {
  return list.some(
    (e) => e.expiresAt > now && (e.plan === 'year' || e.plan === 'month' || (e.plan === 'event' && e.eventId === eventId)),
  );
}

export async function hasEventAccess(familyId: string, eventId: string, now = Date.now()): Promise<boolean> {
  return grantsEventAccess(await listEntitlements(familyId, now), eventId, now);
}

export interface GrantInput {
  familyId: string;
  plan: PlanId;
  eventId?: string;
  stripeSessionId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  expiresAt: Date;
}

/** Records paid access. Idempotent on the Stripe session id (verify and webhook may both arrive). */
export async function grantPaidAccess(g: GrantInput): Promise<void> {
  const db = await getDb();
  await db
    .insert(entitlements)
    .values({
      id: randomUUID(),
      familyId: g.familyId,
      plan: g.plan,
      eventId: g.eventId ?? null,
      stripeSessionId: g.stripeSessionId,
      stripeCustomerId: g.stripeCustomerId ?? null,
      stripeSubscriptionId: g.stripeSubscriptionId ?? null,
      status: 'active',
      expiresAt: g.expiresAt,
    })
    .onConflictDoNothing({ target: entitlements.stripeSessionId });
}

/** Demo access: sample families only, only while DEMO_MODE is on (10.4a). */
export async function grantDemoAccess(familyId: string, now = Date.now()): Promise<'ok' | 'forbidden'> {
  if (!env().demoMode) return 'forbidden';
  const db = await getDb();
  const [fam] = await db.select().from(families).where(eq(families.id, familyId)).limit(1);
  if (!fam || fam.kind !== 'sample') return 'forbidden';
  const expiresAt = new Date(now + DEMO_HOURS * 3_600_000);
  await db
    .insert(entitlements)
    .values({
      id: randomUUID(),
      familyId,
      plan: 'year',
      stripeSessionId: `demo:${familyId}`,
      status: 'demo',
      expiresAt,
    })
    .onConflictDoUpdate({ target: entitlements.stripeSessionId, set: { expiresAt, status: 'demo' } });
  return 'ok';
}

/** Removes every access row of a sample family (Reset demo). */
export async function resetSampleAccess(familyId: string): Promise<'ok' | 'forbidden'> {
  if (!env().demoMode) return 'forbidden';
  const db = await getDb();
  const [fam] = await db.select().from(families).where(eq(families.id, familyId)).limit(1);
  if (!fam || fam.kind !== 'sample') return 'forbidden';
  await db.delete(entitlements).where(eq(entitlements.familyId, familyId));
  return 'ok';
}

export async function countPurchases(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ id: entitlements.id }).from(entitlements).where(eq(entitlements.status, 'active'));
  return rows.length;
}
