/**
 * One take for a whole chapter (F17, Lida 15 Nov 2026): the grown-up records once while turning the
 * pages; every page or sentence turn saves a time mark, so playback can turn the pages by itself in
 * sync with the voice. Kept on this device only (IndexedDB), like the per-page recordings.
 */
import { del, get, set } from 'idb-keyval';
import { recordingStore } from '../storage/idb';

/** Where the reader was at second `t` of the take. */
export type TakeMark = { pageId: string; step: number; t: number };
export type ChapterTake = { blob: Blob; marks: TakeMark[] };

/** Keys share the per-page prefix, so "delete all recordings" of an event or workspace removes takes too. */
export const takeKey = (ws: string, eventId: string, chapter: number) => `${ws}:${eventId}:${chapter}:__take`;

export async function getTake(key: string): Promise<ChapterTake | null> {
  const v = await get<ChapterTake>(key, recordingStore());
  return v && v.blob && Array.isArray(v.marks) ? v : null;
}
export const saveTake = (key: string, take: ChapterTake) => set(key, take, recordingStore());
export const deleteTake = (key: string) => del(key, recordingStore());

/** Adds a mark unless the reader is still on the same sentence; times never go backwards. */
export function addMark(marks: TakeMark[], m: TakeMark): TakeMark[] {
  const last = marks[marks.length - 1];
  if (last && last.pageId === m.pageId && last.step === m.step) return marks;
  return [...marks, { ...m, t: Math.max(m.t, last?.t ?? 0) }];
}

/** The mark playing at second `t` (the last one that started at or before it). */
export function markAt(marks: TakeMark[], t: number): TakeMark | null {
  let found: TakeMark | null = null;
  for (const m of marks) {
    if (m.t <= t + 0.05) found = m;
    else break;
  }
  return found ?? marks[0] ?? null;
}

/** Where to start the take for a page and sentence: that sentence, else the page's start, else the beginning. */
export function timeFor(marks: TakeMark[], pageId: string, step: number): number {
  const exact = marks.find((m) => m.pageId === pageId && m.step === step);
  if (exact) return exact.t;
  const onPage = marks.filter((m) => m.pageId === pageId);
  const before = onPage.filter((m) => m.step <= step).pop();
  return (before ?? onPage[0])?.t ?? 0;
}

/** True when the take covers this page (a page rewritten after a question is not in it). */
export const takeHasPage = (marks: TakeMark[], pageId: string) => marks.some((m) => m.pageId === pageId);
