/** Families repository (docs/SPEC.md 6.3). Server-only; route handlers contain no SQL. */
import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import { getDb } from './client';
import { families, type FamilyRow } from './schema';
import type { Workspace } from '../engine/types';

const DAY_MS = 86_400_000;
export const SAMPLE_RETENTION_DAYS = 7;
export const GUEST_RETENTION_DAYS = 365;

export async function createFamily(kind: Workspace): Promise<FamilyRow> {
  const db = await getDb();
  const [row] = await db.insert(families).values({ id: randomUUID(), kind }).returning();
  return row;
}

export async function getFamily(id: string): Promise<FamilyRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(families).where(eq(families.id, id)).limit(1);
  return row ?? null;
}

/** Marks the family as seen now (retention clock). */
export async function touchFamily(id: string): Promise<void> {
  const db = await getDb();
  await db.update(families).set({ lastSeenAt: new Date() }).where(eq(families.id, id));
}

/** Deletes the family and, by cascade, its document, access rows (llm_calls keep the cost only). */
export async function deleteFamily(id: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.delete(families).where(eq(families.id, id)).returning({ id: families.id });
  return rows.length > 0;
}

export function hashRestoreCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/** New restore code (32 random bytes). Replaces any earlier one; only the hash is stored. */
export async function createRestoreCode(familyId: string): Promise<string> {
  const code = randomBytes(32).toString('base64url');
  const db = await getDb();
  await db.update(families).set({ restoreHash: hashRestoreCode(code) }).where(eq(families.id, familyId));
  return code;
}

/** The real family a restore code belongs to, or null. */
export async function findFamilyByRestoreCode(code: string): Promise<FamilyRow | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(families)
    .where(and(eq(families.restoreHash, hashRestoreCode(code)), eq(families.kind, 'real')))
    .limit(1);
  return row ?? null;
}

/** Retention job (6.3): old sample families and guest families not seen for a year. */
export async function purgeStaleFamilies(now = Date.now()): Promise<{ samples: number; guests: number }> {
  const db = await getDb();
  const samples = await db
    .delete(families)
    .where(and(eq(families.kind, 'sample'), lt(families.createdAt, new Date(now - SAMPLE_RETENTION_DAYS * DAY_MS))))
    .returning({ id: families.id });
  const guests = await db
    .delete(families)
    .where(and(eq(families.kind, 'real'), lt(families.lastSeenAt, new Date(now - GUEST_RETENTION_DAYS * DAY_MS))))
    .returning({ id: families.id });
  return { samples: samples.length, guests: guests.length };
}

export async function countFamilies(): Promise<{ real: number; sample: number }> {
  const db = await getDb();
  const rows = await db
    .select({ kind: families.kind, n: sql<number>`count(*)::int` })
    .from(families)
    .groupBy(families.kind);
  return {
    real: rows.find((r) => r.kind === 'real')?.n ?? 0,
    sample: rows.find((r) => r.kind === 'sample')?.n ?? 0,
  };
}
