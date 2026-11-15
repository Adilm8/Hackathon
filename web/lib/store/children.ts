'use client';
/**
 * Several children on one device. The synced family document keeps one active child (SPEC
 * 6.1/6.2, unchanged); the other children's full profiles (badges, technique memory) wait
 * here, `bds:children` (`bds:sample:children` in the sample), this device only. Events
 * already carry `childId`, so switching only swaps the active child and every screen shows
 * that child's big days.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChildProfileSchema } from '@/lib/engine/schemas';
import type { BigEvent, ChildProfile } from '@/lib/engine/types';
import { useChild } from './child';
import { useEvents } from './events';
import { jsonStorage } from './persist';
import { firstNameOnly, loadProfiles, type SavedProfile } from './profiles';
import { storeKey } from './workspace';

interface RosterState {
  others: ChildProfile[];
  set(others: ChildProfile[]): void;
}

export const useRoster = create<RosterState>()(
  persist(
    (set) => ({ others: [], set: (others) => set({ others }) }),
    {
      name: typeof window === 'undefined' ? 'bds:children' : storeKey('children'),
      storage: jsonStorage,
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ others: s.others }),
      merge: (persisted, current) => {
        const raw = (persisted as { others?: unknown[] } | undefined)?.others ?? [];
        const others = raw.flatMap((c) => {
          const ok = ChildProfileSchema.safeParse(c);
          return ok.success ? [ok.data as ChildProfile] : [];
        });
        return { ...current, others };
      },
    },
  ),
);

export interface ChildChoice {
  id: string;
  name: string;
  age: ChildProfile['age'];
  character: ChildProfile['character'];
  active: boolean;
}

/** A full profile from a saved onboarding profile (no badges or memory kept there). */
export function profileToChild(p: SavedProfile, today: string): ChildProfile {
  return {
    id: p.childId, name: firstNameOnly(p.name), pronunciation: p.pronunciation, age: p.age, pronoun: p.pronoun,
    character: p.character, values: p.values, styleMode: p.styleMode, techniques: [], badges: [], createdOn: today,
  };
}

/**
 * Children this workspace can switch between: the active one, the ones waiting in the roster,
 * and saved profiles that already have a big day here. Active first, then by name.
 */
export function childChoices(active: ChildProfile | null, others: ChildProfile[], events: Pick<BigEvent, 'childId'>[], saved: SavedProfile[]): ChildChoice[] {
  const out = new Map<string, ChildChoice>();
  if (active) out.set(active.id, { id: active.id, name: active.name, age: active.age, character: active.character, active: true });
  for (const c of others) if (!out.has(c.id)) out.set(c.id, { id: c.id, name: c.name, age: c.age, character: c.character, active: false });
  const withEvents = new Set(events.map((e) => e.childId));
  for (const p of saved)
    if (withEvents.has(p.childId) && !out.has(p.childId))
      out.set(p.childId, { id: p.childId, name: firstNameOnly(p.name), age: p.age, character: p.character, active: false });
  const [first, ...rest] = [...out.values()];
  return first?.active ? [first, ...rest.sort((a, b) => a.name.localeCompare(b.name))] : [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Big days of the given child. Events whose child is not known anywhere on this device (data
 * from before several children were kept) stay with the active child, so nothing disappears.
 */
export function eventsOfChild<E extends Pick<BigEvent, 'childId'>>(events: E[], childId: string, knownIds: Set<string>): E[] {
  return events.filter((e) => e.childId === childId || !knownIds.has(e.childId));
}

/** Pure swap: the target becomes active, the previous active child waits in the roster. */
export function swapChildren(active: ChildProfile | null, others: ChildProfile[], target: ChildProfile): { active: ChildProfile; others: ChildProfile[] } {
  const rest = others.filter((c) => c.id !== target.id && c.id !== active?.id);
  return { active: target, others: active && active.id !== target.id ? [active, ...rest] : rest };
}

/** Makes `childId` the active child. Returns false when no profile for it exists on this device. */
export function switchChild(childId: string, today: string): boolean {
  const active = useChild.getState().child;
  if (active?.id === childId) return true;
  const { others, set } = useRoster.getState();
  const target = others.find((c) => c.id === childId) ?? (() => {
    const p = loadProfiles().find((x) => x.childId === childId);
    return p ? profileToChild(p, today) : null;
  })();
  if (!target) return false;
  const next = swapChildren(active, others, target);
  set(next.others);
  useChild.getState().setChild(next.active);
  return true;
}

/** Before onboarding makes another child active: keep the current one (badges, memory) in the roster. */
export function stashActiveFor(newChildId: string): ChildProfile | null {
  const active = useChild.getState().child;
  const { others, set } = useRoster.getState();
  const waiting = others.find((c) => c.id === newChildId) ?? null;
  if (active && active.id !== newChildId) set([active, ...others.filter((c) => c.id !== active.id && c.id !== newChildId)]);
  else if (waiting) set(others.filter((c) => c.id !== newChildId));
  return waiting;
}

/** Ids of every child known in this workspace (active + roster + saved profiles). */
export function knownChildIds(): Set<string> {
  const ids = new Set<string>(useRoster.getState().others.map((c) => c.id));
  const a = useChild.getState().child;
  if (a) ids.add(a.id);
  loadProfiles().forEach((p) => ids.add(p.childId));
  return ids;
}

export function useEventsOfActiveChild(): BigEvent[] {
  const events = useEvents((s) => s.events);
  const child = useChild((s) => s.child);
  useRoster((s) => s.others);
  return child ? eventsOfChild(events, child.id, knownChildIds()) : events;
}
