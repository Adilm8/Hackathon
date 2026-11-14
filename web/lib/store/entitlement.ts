'use client';
/** Cached copy of the paid access the server returned, `bds:entitlement` (docs/SPEC.md 6.2, 10.4). Read-only for screens. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EntitlementSchema } from '@/lib/engine/schemas';
import type { Entitlement } from '@/lib/engine/types';
import { jsonStorage } from './persist';
import { storeKey } from './workspace';

interface EntitlementState {
  list: Entitlement[];
  set(list: Entitlement[]): void;
  clear(): void;
}

export const useEntitlements = create<EntitlementState>()(
  persist(
    (set) => ({
      list: [],
      set: (list) => set({ list }),
      clear: () => set({ list: [] }),
    }),
    {
      name: typeof window === 'undefined' ? 'bds:entitlement' : storeKey('entitlement'),
      storage: jsonStorage,
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ list: s.list }),
      merge: (persisted, current) => {
        const raw = (persisted as { list?: unknown[] } | undefined)?.list ?? [];
        const list = raw.flatMap((r) => {
          const ok = EntitlementSchema.safeParse(r);
          return ok.success ? [ok.data as Entitlement] : [];
        });
        return { ...current, list };
      },
    },
  ),
);

export function setEntitlements(list: Entitlement[]): void {
  useEntitlements.getState().set(list);
}
