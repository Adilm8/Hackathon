/** Web push subscriptions and their reminder times (lib/push). Server-only. */
import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { pushSubscriptions, type PushReminder } from './schema';
import type { Reminder } from '../push/reminders';

export async function savePushSubscription(familyId: string, endpoint: string, reminders: Reminder[]): Promise<void> {
  const db = await getDb();
  const now = new Date();
  // Keep the sent flag of reminders the browser sends again, so nothing is delivered twice.
  const [old] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1);
  const sent = new Set((old?.reminders ?? []).filter((r) => r.sent).map((r) => `${r.id}@${r.at}`));
  const list: PushReminder[] = reminders.map((r) => ({ ...r, sent: sent.has(`${r.id}@${r.at}`) || undefined }));
  await db
    .insert(pushSubscriptions)
    .values({ endpoint, familyId, reminders: list, updatedAt: now })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { familyId, reminders: list, updatedAt: now } });
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function lastPushReminder(endpoint: string): Promise<PushReminder | null> {
  const db = await getDb();
  const [row] = await db.select({ last: pushSubscriptions.last }).from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1);
  return row?.last ?? null;
}

/** Reminders older than this are not sent any more (the phone was off, the server asleep). */
export const STALE_MS = 3 * 3_600_000;

/**
 * Picks, per subscription, the newest reminder that is due and not sent yet; marks every due
 * one as sent. Pure, so the delivery rule is tested without a database.
 */
export function pickDue(reminders: PushReminder[], now: number): { send: PushReminder | null; next: PushReminder[] } {
  const due = reminders.filter((r) => !r.sent && r.at <= now);
  if (due.length === 0) return { send: null, next: reminders };
  const fresh = due.filter((r) => r.at > now - STALE_MS);
  const send = fresh.sort((a, b) => b.at - a.at)[0] ?? null;
  return { send, next: reminders.map((r) => (r.sent || r.at > now ? r : { ...r, sent: true })) };
}

export async function duePushes(now: number): Promise<{ endpoint: string; send: PushReminder }[]> {
  const db = await getDb();
  const rows = await db.select().from(pushSubscriptions);
  const out: { endpoint: string; send: PushReminder }[] = [];
  for (const row of rows) {
    const { send, next } = pickDue(row.reminders, now);
    if (next === row.reminders) continue;
    await db.update(pushSubscriptions).set({ reminders: next, ...(send ? { last: send } : {}) }).where(eq(pushSubscriptions.endpoint, row.endpoint));
    if (send) out.push({ endpoint: row.endpoint, send });
  }
  return out;
}
