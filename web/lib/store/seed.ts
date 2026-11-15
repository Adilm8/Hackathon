'use client';
/** Writes a whole family into a workspace's keys before the reload that switches to it (Try a sample, restore). */
import type { ChildProfile, Entitlement, FamilyDoc, Workspace } from '@/lib/engine/types';
import { CHILD_VERSION } from './child';
import { EVENTS_VERSION } from './events';
import { prefixFor } from './workspace';

export function seedWorkspace(ws: Workspace, doc: FamilyDoc, entitlements: Entitlement[], serverVersion?: number, otherChildren: ChildProfile[] = []): void {
  const p = prefixFor(ws);
  const put = (k: string, v: unknown) => {
    try {
      window.localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode quota: the app still starts and pulls from the server */
    }
  };
  put(`${p}child`, { state: { child: doc.child }, version: CHILD_VERSION });
  put(`${p}events`, { state: { events: doc.events, updatedAt: doc.updatedAt }, version: EVENTS_VERSION });
  put(`${p}entitlement`, { state: { list: entitlements }, version: 1 });
  put(`${p}children`, { state: { others: otherChildren }, version: 1 });
  if (serverVersion !== undefined) put(`${p}sync`, { version: serverVersion, lastSyncedAt: Date.now(), dirty: false });
}

export function clearWorkspaceKeys(ws: Workspace): void {
  const p = prefixFor(ws);
  for (const k of ['child', 'events', 'entitlement', 'sync', 'settings', 'children']) {
    try {
      window.localStorage.removeItem(`${p}${k}`);
    } catch {
      /* ignore */
    }
  }
}
