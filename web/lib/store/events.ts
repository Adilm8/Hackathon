'use client';
/** Events of the child with chapters, questions, ritual and check-in inside, `bds:events` (docs/SPEC.md 6.1 BigEvent, 6.2). */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BigEventSchema } from '@/lib/engine/schemas';
import {
  applyGeneratedChapter, applyRewrittenPage, insertAnswerPage, isChapterGenerated, markChapterRead as engineMarkRead,
  recordQuestion as engineRecordQuestion, setParentAction as engineSetParentAction,
  type ChapterResult, type PageInput, type QuestionInput, type RecordResult,
} from '@/lib/engine/state';
import { getTemplate } from '@/lib/engine/templates';
import type { BigEvent, Checkin, ISODate, Question, RitualCard, Sentence, TextSource } from '@/lib/engine/types';
import { jsonStorage } from './persist';
import { storeKey } from './workspace';
import { getUpdatedAt, onTouchPersist, setUpdatedAt, touch } from './meta';

export const EVENTS_VERSION = 1;

interface EventsState {
  events: BigEvent[];
  updatedAt: number;
  addEvent(e: BigEvent): void;
  /** Generic edit; screens pass pure engine functions (lib/engine/state.ts). */
  updateEvent(id: string, fn: (e: BigEvent) => BigEvent): void;
  removeEvent(id: string): void;
  /** Stores a generated (or fallback) chapter once; never regenerated (4.7). */
  applyChapter(eventId: string, index: number, result: ChapterResult, today: ISODate): void;
  recordQuestion(eventId: string, input: QuestionInput, today: ISODate): RecordResult;
  insertAnswer(eventId: string, index: number, input: Parameters<typeof insertAnswerPage>[2]): void;
  rewritePage(eventId: string, index: number, pageId: string, page: PageInput, questionId: string, source: TextSource): void;
  setParentAction(eventId: string, questionId: string, action: NonNullable<Question['parentAction']>, shown?: Sentence[]): void;
  markChapterRead(eventId: string, index: number, today: ISODate): void;
  setRitual(eventId: string, ritual: RitualCard): void;
  setCheckin(eventId: string, checkin: Checkin): void;
  replace(events: BigEvent[], updatedAt: number): void;
  clear(): void;
}

export const useEvents = create<EventsState>()(
  persist(
    (set, get) => {
      const edit = (id: string, fn: (e: BigEvent) => BigEvent) => {
        set({ events: get().events.map((e) => (e.id === id ? fn(e) : e)) });
        touch();
      };
      return {
        events: [],
        updatedAt: 0,
        addEvent: (e) => {
          set({ events: [...get().events, e] });
          touch();
        },
        updateEvent: edit,
        removeEvent: (id) => {
          set({ events: get().events.filter((e) => e.id !== id) });
          touch();
        },
        applyChapter: (eventId, index, result, today) =>
          edit(eventId, (e) => {
            const ch = e.chapters.find((c) => c.index === index);
            return !ch || isChapterGenerated(ch) ? e : applyGeneratedChapter(e, index, result, getTemplate(e.type), today);
          }),
        recordQuestion: (eventId, input, today) => {
          const e = get().events.find((x) => x.id === eventId);
          if (!e) return { ok: false, error: 'limit' };
          const r = engineRecordQuestion(e, input, today, getTemplate(e.type));
          if (r.ok) edit(eventId, () => r.event);
          return r;
        },
        insertAnswer: (eventId, index, input) => edit(eventId, (e) => insertAnswerPage(e, index, input, getTemplate(e.type))),
        rewritePage: (eventId, index, pageId, page, qid, source) =>
          edit(eventId, (e) => applyRewrittenPage(e, index, pageId, page, qid, getTemplate(e.type), source)),
        setParentAction: (eventId, qid, action, shown) => edit(eventId, (e) => engineSetParentAction(e, qid, action, shown)),
        markChapterRead: (eventId, index, today) => edit(eventId, (e) => engineMarkRead(e, index, today)),
        setRitual: (eventId, ritual) => edit(eventId, (e) => ({ ...e, ritual })),
        setCheckin: (eventId, checkin) => edit(eventId, (e) => ({ ...e, checkin })),
        replace: (events, updatedAt) => {
          setUpdatedAt(updatedAt);
          set({ events, updatedAt });
        },
        clear: () => set({ events: [], updatedAt: 0 }),
      };
    },
    {
      name: typeof window === 'undefined' ? 'bds:events' : storeKey('events'),
      storage: jsonStorage,
      version: EVENTS_VERSION,
      skipHydration: true,
      partialize: (s) => ({ events: s.events, updatedAt: s.updatedAt }),
      // Invalid events are dropped one by one instead of crashing the app (6.2).
      merge: (persisted, current) => {
        const p = persisted as { events?: unknown[]; updatedAt?: number } | undefined;
        const events = (p?.events ?? []).flatMap((raw) => {
          const ok = BigEventSchema.safeParse(raw);
          return ok.success ? [ok.data as BigEvent] : [];
        });
        const updatedAt = typeof p?.updatedAt === 'number' ? p.updatedAt : 0;
        setUpdatedAt(updatedAt);
        return { ...current, events, updatedAt };
      },
    },
  ),
);

onTouchPersist((ms) => {
  if (useEvents.getState().updatedAt !== ms) useEvents.setState({ updatedAt: ms });
});

export function getEvent(id: string): BigEvent | undefined {
  return useEvents.getState().events.find((e) => e.id === id);
}

export { getUpdatedAt };
