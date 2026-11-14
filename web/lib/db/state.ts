/** Family document repository with optimistic versioning (docs/SPEC.md 6.2, 6.3). Server-only. */
import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from './client';
import { familyState } from './schema';
import { FAMILY_DOC_SCHEMA_VERSION } from '../engine/schemas';
import type { FamilyDoc } from '../engine/types';

export interface StateResult {
  doc: FamilyDoc;
  version: number;
}

/** What a family with no saved document looks like: version 0. */
export function emptyDoc(): FamilyDoc {
  return { schemaVersion: FAMILY_DOC_SCHEMA_VERSION, child: null, events: [], updatedAt: 0 };
}

export async function getState(familyId: string): Promise<StateResult> {
  const db = await getDb();
  const [row] = await db.select().from(familyState).where(eq(familyState.familyId, familyId)).limit(1);
  return row ? { doc: row.doc, version: row.version } : { doc: emptyDoc(), version: 0 };
}

/**
 * Saves the document when `baseVersion` is still the server's version.
 * Returns the new version, or the server copy when it moved on (HTTP 409).
 */
export async function putState(
  familyId: string,
  doc: FamilyDoc,
  baseVersion: number,
): Promise<{ ok: true; version: number } | { ok: false; current: StateResult }> {
  const db = await getDb();
  if (baseVersion === 0) {
    const inserted = await db
      .insert(familyState)
      .values({ familyId, doc, version: 1 })
      .onConflictDoNothing()
      .returning({ version: familyState.version });
    if (inserted.length) return { ok: true, version: inserted[0].version };
  } else {
    const updated = await db
      .update(familyState)
      .set({ doc, version: baseVersion + 1, updatedAt: new Date() })
      .where(and(eq(familyState.familyId, familyId), eq(familyState.version, baseVersion)))
      .returning({ version: familyState.version });
    if (updated.length) return { ok: true, version: updated[0].version };
  }
  return { ok: false, current: await getState(familyId) };
}

/** Replaces the document unconditionally (sample seed, import). */
export async function replaceState(familyId: string, doc: FamilyDoc): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .insert(familyState)
    .values({ familyId, doc, version: 1 })
    .onConflictDoUpdate({
      target: familyState.familyId,
      set: { doc, version: sql`${familyState.version} + 1`, updatedAt: new Date() },
    })
    .returning({ version: familyState.version });
  return row.version;
}
