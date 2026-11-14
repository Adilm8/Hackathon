/**
 * Export / import backup (FR-B1, docs/SPEC.md 6.2): one JSON file `{ schemaVersion, exportedOn, child, events }`
 * without photos and recordings. Import validates with zod; the screen asks for a confirmation and then replaces the document.
 */
import { z } from 'zod';
import { FAMILY_DOC_SCHEMA_VERSION, BigEventSchema, ChildProfileSchema } from '../engine/schemas';
import type { FamilyDoc } from '../engine/types';

export const BackupSchema = z.strictObject({
  schemaVersion: z.number().int().min(1),
  exportedOn: z.string().max(40),
  child: ChildProfileSchema.nullable(),
  events: z.array(BigEventSchema).max(100),
});

export const MAX_BACKUP_BYTES = 512 * 1024;

export function createBackup(doc: FamilyDoc, now: Date): string {
  const body = {
    schemaVersion: doc.schemaVersion,
    exportedOn: now.toISOString(),
    child: doc.child,
    // Photos live only in this browser; their captions would point to nothing after import.
    events: doc.events.map((e) => ({ ...e, photos: [] })),
  };
  return JSON.stringify(body, null, 2);
}

export function backupFileName(now: Date): string {
  return `big-day-stories-backup-${now.toISOString().slice(0, 10)}.json`;
}

export type ParseResult =
  | { ok: true; doc: FamilyDoc }
  | { ok: false; reason: 'too_big' | 'not_json' | 'invalid' | 'newer_version' };

export function parseBackup(text: string, nowMs: number): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, reason: 'too_big' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not_json' };
  }
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  const b = parsed.data;
  if (b.schemaVersion > FAMILY_DOC_SCHEMA_VERSION) return { ok: false, reason: 'newer_version' };
  return { ok: true, doc: { schemaVersion: b.schemaVersion, child: b.child, events: b.events, updatedAt: nowMs } };
}

export const BACKUP_ERRORS: Record<Exclude<ParseResult, { ok: true }>['reason'], string> = {
  too_big: 'This file is too big to be a Big Day Stories backup.',
  not_json: 'This file is not a backup. Choose the .json file you exported.',
  invalid: 'This backup is damaged or not from Big Day Stories.',
  newer_version: 'This backup comes from a newer version of the app.',
};
