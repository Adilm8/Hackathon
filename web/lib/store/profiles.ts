/**
 * Saved child profiles of this browser, `bds:profiles`. Every finished onboarding saves the
 * child here, so the next story starts with "Who is this story for?" instead of typing the
 * child again. Kept outside the workspace prefix on purpose: a profile typed while the sample
 * is open is there in the parent's own space too.
 *
 * Only what onboarding asks for is kept: first name or nickname (one word, never a surname),
 * pronunciation, age, pronoun, story friend, family values and story style. Nothing here is
 * sent to the server; "Delete all data" removes it with every other `bds` key.
 */
import { z } from 'zod';
import { ChildProfileSchema } from '@/lib/engine/schemas';
import type { ChildProfile } from '@/lib/engine/types';

export const PROFILES_KEY = 'bds:profiles';
/** Newest first; the oldest drops off when a new child is added past this. */
export const MAX_PROFILES = 6;

export type SavedProfile = Pick<ChildProfile, 'name' | 'pronunciation' | 'age' | 'pronoun' | 'character' | 'values' | 'styleMode'> & {
  /** The child id of the last workspace it was used in; reused so badges and techniques stay with the child. */
  childId: string;
  savedAt: number;
};

const ProfileSchema = ChildProfileSchema.pick({
  name: true, pronunciation: true, age: true, pronoun: true, character: true, values: true, styleMode: true,
}).extend({ childId: z.string().min(1).max(64), savedAt: z.number() });

/** One word of letters, as onboarding asks; anything after a space (a surname) is dropped. */
export function firstNameOnly(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

const sameChild = (a: string, b: string) => firstNameOnly(a).toLocaleLowerCase() === firstNameOnly(b).toLocaleLowerCase();

export function toSaved(child: ChildProfile, savedAt: number): SavedProfile {
  return {
    childId: child.id,
    name: firstNameOnly(child.name),
    pronunciation: child.pronunciation,
    age: child.age,
    pronoun: child.pronoun,
    character: child.character,
    values: child.values,
    styleMode: child.styleMode,
    savedAt,
  };
}

/** Adds or updates (same first name = same child) and keeps the list newest first. */
export function upsertProfile(list: SavedProfile[], p: SavedProfile): SavedProfile[] {
  const rest = list.filter((x) => x.childId !== p.childId && !sameChild(x.name, p.name));
  return [p, ...rest].slice(0, MAX_PROFILES);
}

/** Drops anything that does not look like a profile (old or hand-edited data). */
export function parseProfiles(raw: string | null): SavedProfile[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: SavedProfile[] = [];
    for (const item of arr) {
      const ok = ProfileSchema.safeParse(item);
      if (ok.success) out.push({ ...(ok.data as SavedProfile), name: firstNameOnly(ok.data.name) });
    }
    return out.slice(0, MAX_PROFILES);
  } catch {
    return [];
  }
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadProfiles(): SavedProfile[] {
  return parseProfiles(storage()?.getItem(PROFILES_KEY) ?? null);
}

function write(list: SavedProfile[]): void {
  try {
    storage()?.setItem(PROFILES_KEY, JSON.stringify(list));
  } catch {
    /* private mode or full storage: onboarding still works, it just asks again next time */
  }
}

export function saveProfile(child: ChildProfile, now = Date.now()): SavedProfile[] {
  const list = upsertProfile(loadProfiles(), toSaved(child, now));
  write(list);
  return list;
}

export function removeProfile(childId: string): SavedProfile[] {
  const list = loadProfiles().filter((p) => p.childId !== childId);
  write(list);
  return list;
}
