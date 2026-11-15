'use client';
/**
 * The family document as one piece, for the sync module (lib/sync), export/import and
 * deletion (docs/SPEC.md 6.2, 4.15). Screens use the individual stores.
 */
import { FAMILY_DOC_SCHEMA_VERSION } from '@/lib/engine/schemas';
import type { FamilyDoc } from '@/lib/engine/types';
import { useChild } from './child';
import { useRoster } from './children';
import { useEntitlements } from './entitlement';
import { useEvents } from './events';
import { getUpdatedAt, subscribeTouch } from './meta';
import { useSettings } from './settings';

export function getFamilyDoc(): FamilyDoc {
  return {
    schemaVersion: FAMILY_DOC_SCHEMA_VERSION,
    child: useChild.getState().child,
    events: useEvents.getState().events,
    updatedAt: getUpdatedAt(),
  };
}

/** Server copy (or an imported backup) replaces the local one; does not notify sync listeners. */
export function replaceFamilyDoc(doc: FamilyDoc): void {
  useChild.getState().replace(doc.child);
  useEvents.getState().replace(doc.events, doc.updatedAt);
}

/** Fires after every local change of family data. */
export function subscribeFamily(cb: () => void): () => void {
  return subscribeTouch(cb);
}

export { setEntitlements } from './entitlement';

/** Clears every store of the active workspace (Delete all data, Reset). */
export function clearLocalFamily(): void {
  useChild.getState().clear();
  useEvents.getState().clear();
  useEntitlements.getState().clear();
  useRoster.getState().set([]);
}

/** Removes every `bds:` key from localStorage and sessionStorage (both workspaces). */
export function wipeAllBrowserKeys(): void {
  for (const store of [safe(() => window.localStorage), safe(() => window.sessionStorage)]) {
    if (!store) continue;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith('bds')) keys.push(k);
    }
    keys.forEach((k) => store.removeItem(k));
  }
  useSettings.getState().reset();
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
