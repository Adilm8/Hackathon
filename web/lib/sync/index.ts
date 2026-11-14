/** Entry point for the screens: `startSync(...)` wires the stores to the server copy (docs/SPEC.md 6.2). */
import type { Entitlement, FamilyDoc, Workspace } from '../engine/types';
import { createSync, localStorageMeta, type Sync, type SyncStatus } from './engine';

export { api } from './api';
export type { SyncStatus } from './engine';

export interface StartSyncInput {
  workspace: Workspace;
  getDoc: () => FamilyDoc;
  replaceDoc: (doc: FamilyDoc) => void;
  subscribe: (cb: () => void) => () => void;
  setEntitlements?: (list: Entitlement[]) => void;
}

let current: Sync | null = null;
const statusListeners = new Set<(s: SyncStatus) => void>();
let lastStatus: SyncStatus = 'idle';

export function onSyncStatus(cb: (s: SyncStatus) => void): () => void {
  statusListeners.add(cb);
  cb(lastStatus);
  return () => statusListeners.delete(cb);
}

/** Starts (or restarts, after a workspace switch) syncing. Returns a stop function. */
export function startSync(input: StartSyncInput) {
  current?.stop();
  const sync = createSync({
    workspace: input.workspace,
    meta: localStorageMeta(input.workspace),
    stores: {
      getDoc: input.getDoc,
      replaceDoc: input.replaceDoc,
      subscribe: input.subscribe,
      setEntitlements: input.setEntitlements,
    },
  });
  current = sync;
  sync.onStatus((s) => {
    lastStatus = s;
    statusListeners.forEach((l) => l(s));
  });
  const online = () => void sync.retry();
  const hide = () => {
    if (document.visibilityState === 'hidden') void sync.flushNow();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', hide);
  }
  sync.start();
  const stop = () => {
    sync.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', hide);
    }
    if (current === sync) current = null;
  };
  return { stop, flushNow: () => sync.flushNow(), status: () => sync.status };
}
