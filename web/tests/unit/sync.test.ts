import { describe, expect, it, vi } from 'vitest';
import { createSync, type MetaStorage, type SyncMeta } from '@/lib/sync/engine';
import type { SyncApi, StateGet, StatePut } from '@/lib/sync/api';
import type { FamilyDoc } from '@/lib/engine/types';

const doc = (updatedAt: number, tag = ''): FamilyDoc => ({
  schemaVersion: 1, child: null, updatedAt,
  events: tag ? [{ id: tag } as never] : [],
});

function setup(opts: { server?: { doc: FamilyDoc; version: number } | null; local: FamilyDoc; meta?: SyncMeta | null }) {
  let server = opts.server ?? { doc: doc(0), version: 0 };
  let local = opts.local;
  let meta = opts.meta ?? null;
  const listeners = new Set<() => void>();
  const calls: string[] = [];
  let down = false;
  const api = {
    async getState(): Promise<StateGet> {
      calls.push('get');
      return down ? { kind: 'offline' } : { kind: 'ok', ...server, entitlements: [] };
    },
    async putState(_ws: string, d: FamilyDoc, base: number): Promise<StatePut> {
      calls.push(`put@${base}`);
      if (down) return { kind: 'offline' };
      if (base !== server.version) return { kind: 'conflict', ...server };
      server = { doc: d, version: base + 1 };
      return { kind: 'ok', version: server.version };
    },
    async createFamily() { return { familyId: 'x' }; },
  } as unknown as SyncApi;
  const storage: MetaStorage = { load: () => meta, save: (m) => { meta = m; } };
  const sync = createSync({
    workspace: 'real', api, meta: storage, quietMs: 1500, backoffMs: [1000],
    stores: {
      getDoc: () => local,
      replaceDoc: (d) => { local = d; },
      subscribe: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    },
  });
  return {
    sync, calls,
    get local() { return local; }, get server() { return server; }, get meta() { return meta; },
    edit(d: FamilyDoc) { local = d; listeners.forEach((l) => l()); },
    setDown(v: boolean) { down = v; },
    setServer(s: { doc: FamilyDoc; version: number }) { server = s; },
  };
}

describe('sync engine', () => {
  it('pushes a local-only document to an empty server', async () => {
    vi.useFakeTimers();
    const t = setup({ local: doc(10, 'a') });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.server.version).toBe(1);
    expect(t.server.doc.updatedAt).toBe(10);
    expect(t.sync.status).toBe('saved');
    vi.useRealTimers();
  });

  it('pulls a newer server document on start', async () => {
    vi.useFakeTimers();
    const t = setup({ local: doc(5), meta: { version: 1, lastSyncedAt: 1, dirty: false }, server: { doc: doc(20, 'srv'), version: 3 } });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.local.updatedAt).toBe(20);
    expect(t.meta?.version).toBe(3);
    vi.useRealTimers();
  });

  it('debounces edits: one PUT after 1.5 s of quiet', async () => {
    vi.useFakeTimers();
    const t = setup({ local: doc(5, 'a'), meta: { version: 1, lastSyncedAt: 1, dirty: false }, server: { doc: doc(5, 'a'), version: 1 } });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(0);
    t.calls.length = 0;
    t.edit(doc(6, 'b')); await vi.advanceTimersByTimeAsync(1000);
    t.edit(doc(7, 'c')); await vi.advanceTimersByTimeAsync(1000);
    expect(t.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(600);
    expect(t.calls).toEqual(['put@1']);
    expect(t.server.doc.updatedAt).toBe(7);
    vi.useRealTimers();
  });

  it('conflict: newer updatedAt wins as a whole, both ways', async () => {
    vi.useFakeTimers();
    const mine = setup({ local: doc(5, 'a'), meta: { version: 1, lastSyncedAt: 1, dirty: false }, server: { doc: doc(5, 'a'), version: 1 } });
    mine.sync.start(); await vi.advanceTimersByTimeAsync(0);
    mine.setServer({ doc: doc(50, 'other-device'), version: 2 });
    mine.edit(doc(10, 'mine')); await vi.advanceTimersByTimeAsync(1600);
    expect(mine.local.events[0].id).toBe('other-device');

    const mine2 = setup({ local: doc(5, 'a'), meta: { version: 1, lastSyncedAt: 1, dirty: false }, server: { doc: doc(5, 'a'), version: 1 } });
    mine2.sync.start(); await vi.advanceTimersByTimeAsync(0);
    mine2.setServer({ doc: doc(6, 'old-device'), version: 2 });
    mine2.edit(doc(99, 'mine')); await vi.advanceTimersByTimeAsync(1600);
    expect(mine2.server.doc.events[0].id).toBe('mine');
    expect(mine2.server.version).toBe(3);
    vi.useRealTimers();
  });

  it('offline: keeps the local copy, shows offline, retries with backoff and then saves', async () => {
    vi.useFakeTimers();
    const t = setup({ local: doc(5, 'a'), meta: { version: 1, lastSyncedAt: 1, dirty: false }, server: { doc: doc(5, 'a'), version: 1 } });
    t.sync.start(); await vi.advanceTimersByTimeAsync(0);
    t.setDown(true);
    t.edit(doc(8, 'b')); await vi.advanceTimersByTimeAsync(1600);
    expect(t.sync.status).toBe('offline');
    expect(t.meta?.dirty).toBe(true);
    expect(t.local.updatedAt).toBe(8);
    t.setDown(false);
    await vi.advanceTimersByTimeAsync(1100);
    expect(t.sync.status).toBe('saved');
    expect(t.server.doc.updatedAt).toBe(8);
    vi.useRealTimers();
  });
});
