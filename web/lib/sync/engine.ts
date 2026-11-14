/**
 * Local-first sync (docs/SPEC.md 6.2). Framework-free: the stores are reached through an adapter,
 * so this file is testable without a browser.
 *  1. start: GET the server copy; newer version or newer updatedAt replaces local; dirty local is pushed.
 *  2. change: mark dirty, wait for 1.5 s of quiet, PUT { doc, baseVersion }.
 *  3. 409: the copy with the newer updatedAt wins as a whole and is written to both sides.
 *  4. offline/error: keep working locally, retry with backoff.
 */
import type { Entitlement, FamilyDoc, Workspace } from '../engine/types';
import { api as defaultApi, type SyncApi } from './api';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline';

export interface SyncMeta {
  version: number;
  lastSyncedAt: number;
  dirty: boolean;
}

export interface MetaStorage {
  load(): SyncMeta | null;
  save(meta: SyncMeta): void;
}

export interface SyncStores {
  getDoc(): FamilyDoc;
  /** Server copy wins; must not mark the store dirty. */
  replaceDoc(doc: FamilyDoc): void;
  /** Fires on every local change. */
  subscribe(cb: () => void): () => void;
  setEntitlements?(list: Entitlement[]): void;
}

export interface SyncOptions {
  workspace: Workspace;
  stores: SyncStores;
  meta: MetaStorage;
  api?: SyncApi;
  quietMs?: number;
  backoffMs?: number[];
  now?: () => number;
}

const DEFAULT_BACKOFF = [2000, 5000, 15000, 30000, 60000];

export function localStorageMeta(workspace: Workspace): MetaStorage {
  const key = workspace === 'sample' ? 'bds:sample:sync' : 'bds:sync';
  return {
    load() {
      try {
        const v = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (v && typeof v.version === 'number' && typeof v.dirty === 'boolean') return v;
      } catch {
        /* corrupt or unavailable: start over from the server copy */
      }
      return null;
    },
    save(meta) {
      try {
        localStorage.setItem(key, JSON.stringify(meta));
      } catch {
        /* storage full or blocked: the next sync starts from version 0 and resolves by updatedAt */
      }
    },
  };
}

export function isEmptyDoc(d: FamilyDoc): boolean {
  return d.child === null && d.events.length === 0;
}

export function createSync(opts: SyncOptions) {
  const api = opts.api ?? defaultApi;
  const quiet = opts.quietMs ?? 1500;
  const backoff = opts.backoffMs ?? DEFAULT_BACKOFF;
  const now = opts.now ?? Date.now;
  const ws = opts.workspace;

  let meta: SyncMeta = opts.meta.load() ?? { version: 0, lastSyncedAt: 0, dirty: false };
  let status: SyncStatus = 'idle';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let again = false;
  let attempts = 0;
  let stopped = false;
  let unsub: (() => void) | null = null;
  const listeners = new Set<(s: SyncStatus) => void>();

  const setStatus = (s: SyncStatus) => {
    if (s === status) return;
    status = s;
    listeners.forEach((l) => l(s));
  };
  const saveMeta = (patch: Partial<SyncMeta>) => {
    meta = { ...meta, ...patch };
    opts.meta.save(meta);
  };
  const schedule = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), ms);
  };

  function adopt(doc: FamilyDoc, version: number, entitlements?: Entitlement[]) {
    opts.stores.replaceDoc(doc);
    if (entitlements) opts.stores.setEntitlements?.(entitlements);
    saveMeta({ version, dirty: false, lastSyncedAt: now() });
  }

  /** One round: pull when needed, push when dirty. Never throws. */
  async function flush(): Promise<void> {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      let done = false;
      for (let guard = 0; guard < 4 && !done; guard++) {
        const local = opts.stores.getDoc();
        if (!meta.dirty && meta.version > 0 && guard > 0) break;
        setStatus('saving');
        if (meta.version === 0 || !meta.dirty) {
          const got = await api.getState(ws);
          if (got.kind === 'offline') throw new Error('offline');
          if (got.kind === 'no_session') {
            if (ws === 'real' && (await api.createFamily())) continue;
            throw new Error('offline');
          }
          opts.stores.setEntitlements?.(got.entitlements);
          const serverNewer = got.version > meta.version && got.doc.updatedAt >= local.updatedAt;
          if (serverNewer && !isEmptyDoc(got.doc)) {
            adopt(got.doc, got.version);
            done = true;
            break;
          }
          if (got.version === 0 && isEmptyDoc(local)) {
            saveMeta({ version: 0, dirty: false, lastSyncedAt: now() });
            done = true;
            break;
          }
          if (got.doc.updatedAt === local.updatedAt && got.version > 0) {
            saveMeta({ version: got.version, dirty: false, lastSyncedAt: now() });
            done = true;
            break;
          }
          // Local is newer or the server is empty: push on top of the server's version.
          saveMeta({ version: got.version, dirty: true });
        }
        const res = await api.putState(ws, opts.stores.getDoc(), meta.version);
        if (res.kind === 'ok') {
          saveMeta({ version: res.version, dirty: false, lastSyncedAt: now() });
          done = true;
        } else if (res.kind === 'conflict') {
          const mine = opts.stores.getDoc();
          if (res.doc.updatedAt > mine.updatedAt) {
            adopt(res.doc, res.version);
            done = true;
          } else {
            saveMeta({ version: res.version, dirty: true });
          }
        } else if (res.kind === 'rejected') {
          // The server refuses this document (too big or invalid): stay local, do not loop.
          saveMeta({ dirty: true });
          setStatus('offline');
          return;
        } else if (res.kind === 'no_session') {
          if (ws === 'real' && (await api.createFamily())) continue;
          throw new Error('offline');
        } else {
          throw new Error('offline');
        }
      }
      attempts = 0;
      setStatus('saved');
    } catch {
      setStatus('offline');
      schedule(backoff[Math.min(attempts++, backoff.length - 1)]);
    } finally {
      running = false;
      if (again && !stopped) {
        again = false;
        schedule(quiet);
      }
    }
  }

  return {
    get status() {
      return status;
    },
    get meta() {
      return meta;
    },
    onStatus(cb: (s: SyncStatus) => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    /** Pull, then watch the stores. */
    start() {
      stopped = false;
      unsub?.();
      unsub = opts.stores.subscribe(() => {
        saveMeta({ dirty: true });
        setStatus('saving');
        schedule(quiet);
      });
      void flush();
    },
    /** Push now, without waiting for the quiet period (e.g. on page hide). */
    flushNow() {
      if (timer) clearTimeout(timer);
      return flush();
    },
    /** Retry now (e.g. the browser came back online). */
    retry() {
      attempts = 0;
      return this.flushNow();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      unsub?.();
      unsub = null;
    },
  };
}

export type Sync = ReturnType<typeof createSync>;
