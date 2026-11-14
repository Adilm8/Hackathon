'use client';
/** The child profile, `bds:child` (docs/SPEC.md 6.1 ChildProfile). One child in the MVP (Q4). */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChildProfileSchema } from '@/lib/engine/schemas';
import type { Badge, ChildProfile, TechniqueMemory } from '@/lib/engine/types';
import { jsonStorage } from './persist';
import { storeKey } from './workspace';
import { touch } from './meta';

export const CHILD_VERSION = 1;

interface ChildState {
  child: ChildProfile | null;
  setChild(c: ChildProfile): void;
  updateChild(patch: Partial<Omit<ChildProfile, 'id'>>): void;
  addTechniques(list: TechniqueMemory[]): void;
  addBadge(b: Badge): void;
  /** Used by sync and import: replaces without bumping updatedAt. */
  replace(c: ChildProfile | null): void;
  clear(): void;
}

export const useChild = create<ChildState>()(
  persist(
    (set, get) => ({
      child: null,
      setChild: (child) => {
        set({ child });
        touch();
      },
      updateChild: (patch) => {
        const c = get().child;
        if (!c) return;
        set({ child: { ...c, ...patch } });
        touch();
      },
      addTechniques: (list) => {
        const c = get().child;
        if (!c) return;
        set({ child: { ...c, techniques: [...c.techniques, ...list] } });
        touch();
      },
      addBadge: (b) => {
        const c = get().child;
        if (!c || c.badges.some((x) => x.eventId === b.eventId)) return;
        set({ child: { ...c, badges: [...c.badges, b] } });
        touch();
      },
      replace: (child) => set({ child }),
      clear: () => set({ child: null }),
    }),
    {
      name: typeof window === 'undefined' ? 'bds:child' : storeKey('child'),
      storage: jsonStorage,
      version: CHILD_VERSION,
      skipHydration: true,
      partialize: (s) => ({ child: s.child }),
      // A corrupt profile is dropped rather than crashing (6.2); the server copy replaces it on sync.
      merge: (persisted, current) => {
        const raw = (persisted as { child?: unknown } | undefined)?.child;
        const ok = raw ? ChildProfileSchema.safeParse(raw) : null;
        return { ...current, child: ok?.success ? (ok.data as ChildProfile) : null };
      },
    },
  ),
);
