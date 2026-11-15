/**
 * The story library: every chapter already read, across all big days, newest first, with
 * favourites. Pure, tested in tests/unit/library.test.ts.
 */
import type { BigEvent, ISODate } from '@/lib/engine/types';

export interface LibraryItem {
  key: string;
  eventId: string;
  eventType: BigEvent['type'];
  chapter: number;
  title: string;
  readOn: ISODate;
  favorite: boolean;
}

export function libraryItems(events: BigEvent[], favorites: string[]): LibraryItem[] {
  const fav = new Set(favorites);
  return events
    .flatMap((e) =>
      e.chapters
        .filter((c) => c.readOn && c.pages.length > 0)
        .map((c) => {
          const key = `${e.id}#${c.index}`;
          return { key, eventId: e.id, eventType: e.type, chapter: c.index, title: c.title, readOn: c.readOn!, favorite: fav.has(key) };
        }),
    )
    .sort((a, b) => (a.readOn === b.readOn ? b.chapter - a.chapter : a.readOn < b.readOn ? 1 : -1));
}

/** Bedtime routine steps (sleep apps' wind-down), minutes are a gentle guide, not a rule. */
export interface RoutineStep {
  id: 'bath' | 'teeth' | 'pyjamas' | 'story' | 'lights';
  label: string;
  minutes: number;
}

export const ROUTINE: RoutineStep[] = [
  { id: 'bath', label: 'Bath or a warm wash', minutes: 10 },
  { id: 'teeth', label: 'Brush teeth', minutes: 2 },
  { id: 'pyjamas', label: 'Pyjamas on', minutes: 3 },
  { id: 'story', label: 'Story time', minutes: 10 },
  { id: 'lights', label: 'Lights low, a cuddle', minutes: 3 },
];

export function routineSteps(off: string[]): RoutineStep[] {
  return ROUTINE.filter((s) => !off.includes(s.id));
}

/** "4:05" from milliseconds left (never negative). */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
