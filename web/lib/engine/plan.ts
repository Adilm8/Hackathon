/**
 * The plan of evenings (docs/SPEC.md 5.2, 5.3, 4.6). Pure functions; "today" is always
 * passed in by the caller (clock.today() in the browser).
 */
import { addDays, compareDates, diffDays, weekdayLabel } from './clock';
import { getTemplate } from './templates';
import type { Beat, BigEvent, Chapter, ChildAge, EventTemplate, EventType, ISODate, PlacePhoto, StoryLength, StoryPrefs, Topic } from './types';

export const BEATS: readonly Beat[] = ['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal'];
export const MAX_DAYS_AHEAD = 60;
export const MAX_CHAPTERS = 5;
export const MAX_FEARS = 3;

/** Beats per chapter for N chapters (5.2). */
const BEAT_SPLITS: Record<number, Beat[][]> = {
  5: [['what_happens'], ['who_is_there'], ['what_i_do'], ['if_scared'], ['rehearsal']],
  4: [['what_happens', 'who_is_there'], ['what_i_do'], ['if_scared'], ['rehearsal']],
  3: [['what_happens', 'who_is_there'], ['what_i_do', 'if_scared'], ['rehearsal']],
  2: [['what_happens', 'who_is_there', 'what_i_do'], ['if_scared', 'rehearsal']],
  1: [['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal']],
};

export type DateCheck = 'ok' | 'past' | 'too_far';

/** Onboarding rule (4.5): not before today, at most 60 days ahead. */
export function validateEventDate(date: ISODate, today: ISODate): DateCheck {
  const days = diffDays(today, date);
  if (days < 0) return 'past';
  if (days > MAX_DAYS_AHEAD) return 'too_far';
  return 'ok';
}

/** Today or tomorrow: a single "Quick prep" chapter (Q2). */
export function isQuickPrep(date: ISODate, today: ISODate): boolean {
  const days = diffDays(today, date);
  return days >= 0 && days <= 1;
}

/**
 * Number of chapters for an event created today (5.2). `wanted` is the parent's choice
 * (Story options); it never goes above the evenings left before the day.
 */
export function chapterCount(eventDate: ISODate, today: ISODate, wanted?: number): number {
  const days = diffDays(today, eventDate);
  const max = Math.min(MAX_CHAPTERS, Math.max(1, days));
  if (!wanted || !Number.isFinite(wanted)) return max;
  return Math.min(max, Math.max(1, Math.round(wanted)));
}

/** Most evenings a parent can choose for this date (1 on the day itself or the day before). */
export function maxChapters(eventDate: ISODate, today: ISODate): number {
  return chapterCount(eventDate, today);
}

export interface PlannedChapter {
  index: number;
  date: ISODate;
  beats: Beat[];
}

/** Dates and beats of the plan. Chapter k of N is on event.date - (N - k + 1); on the day itself, one chapter today. */
export function planChapters(eventDate: ISODate, today: ISODate, wanted?: number): PlannedChapter[] {
  const days = diffDays(today, eventDate);
  if (days <= 0) return [{ index: 1, date: eventDate, beats: [...BEAT_SPLITS[1][0]] }];
  const n = chapterCount(eventDate, today, wanted);
  return BEAT_SPLITS[n].map((beats, i) => ({
    index: i + 1,
    date: addDays(eventDate, -(n - i)),
    beats: [...beats],
  }));
}

/** Title of a chapter: the first beat's title, or "Quick prep for the dentist" for a single chapter. */
export function chapterTitle(template: EventTemplate, beats: Beat[]): string {
  if (beats.length === BEATS.length) return `Quick prep for ${template.countdownLabel}`;
  return template.beats[beats[0]].title;
}

/** Tonight's parent skill: the first beat's skill. */
export function chapterParentSkill(template: EventTemplate, beats: Beat[]): string {
  return template.beats[beats[0]].parentSkill;
}

export function buildChapters(template: EventTemplate, eventDate: ISODate, today: ISODate, wanted?: number): Chapter[] {
  return planChapters(eventDate, today, wanted).map((p) => ({
    index: p.index,
    date: p.date,
    beats: p.beats,
    title: chapterTitle(template, p.beats),
    parentSkill: chapterParentSkill(template, p.beats),
    pages: [],
  }));
}

export interface NewEventInput {
  id: string;
  childId: string;
  type: EventType;
  date: ISODate;
  today: ISODate;
  fears: Topic[];
  customLabel?: string;
  customFear?: string;
  photos?: PlacePhoto[];
  story?: StoryPrefs;
}

/** Creates an event with its plan. The fears seed mustAddress (5.4). Throws on an invalid date. */
export function createEvent(input: NewEventInput, template: EventTemplate = getTemplate(input.type)): BigEvent {
  const check = validateEventDate(input.date, input.today);
  if (check !== 'ok') throw new Error(`Event date is ${check}`);
  const fears = unique(input.fears).slice(0, MAX_FEARS);
  const event: BigEvent = {
    id: input.id,
    childId: input.childId,
    type: input.type,
    date: input.date,
    createdOn: input.today,
    templateVersion: template.version,
    fears,
    photos: (input.photos ?? []).slice(0, 3),
    chapters: buildChapters(template, input.date, input.today, input.story?.chapters),
    questions: [],
    mustAddress: fears.filter((t) => t !== 'other'),
    usedTechniques: [],
  };
  const label = input.customLabel?.trim();
  if (input.type === 'other' && label) event.customLabel = label.slice(0, 40);
  const fear = input.customFear?.trim();
  if (fear) event.customFear = fear.slice(0, 40);
  const story = normaliseStoryPrefs(input.story, template);
  if (story) event.story = story;
  return event;
}

/** May the parent still change the number of evenings? Only while no chapter was generated or read. */
export function canReplan(event: Pick<BigEvent, 'chapters'>): boolean {
  return event.chapters.every((c) => !c.readOn && c.pages.length === 0);
}

/**
 * Saves new story options on an event. When the wanted number of evenings changed and nothing was
 * generated yet, the plan is rebuilt from today; otherwise the chapters stay as they are.
 */
export function applyStoryPrefs(
  event: BigEvent,
  prefs: StoryPrefs | undefined,
  today: ISODate,
  template: EventTemplate = getTemplate(event.type),
): BigEvent {
  const story = normaliseStoryPrefs(prefs, template);
  const next: BigEvent = { ...event };
  if (story) next.story = story;
  else delete next.story;
  const wantedNow = story?.chapters;
  if (wantedNow !== event.story?.chapters && canReplan(event) && compareDates(today, event.date) <= 0) {
    next.chapters = buildChapters(template, event.date, today, wantedNow);
  }
  return next;
}

const LIMIT = { moments: 2, moment: 60, companions: 2, companion: 30, nickname: 24, interests: 3, after: 60, avoid: 3, avoidWord: 24 };

/** Trims, deduplicates and caps the parent's story options; returns undefined when nothing is set. */
export function normaliseStoryPrefs(prefs: StoryPrefs | undefined, template?: EventTemplate): StoryPrefs | undefined {
  if (!prefs) return undefined;
  const out: StoryPrefs = {};
  const texts = (xs: string[] | undefined, n: number, max: number) =>
    unique((xs ?? []).map((x) => x.replace(/\s+/g, ' ').trim().slice(0, max)).filter(Boolean)).slice(0, n);
  if (prefs.length && prefs.length !== 'standard') out.length = prefs.length;
  if (prefs.chapters && prefs.chapters >= 1 && prefs.chapters <= MAX_CHAPTERS) out.chapters = Math.round(prefs.chapters);
  const steps = template ? new Set(template.steps) : null;
  const skip = unique(prefs.skipSteps ?? []).filter((s) => !steps || steps.has(s));
  // Keep at least two real steps, or the story has nothing to build on.
  if (skip.length && (!template || template.steps.length - skip.length >= 2)) out.skipSteps = skip.slice(0, 10);
  const moments = texts(prefs.moments, LIMIT.moments, LIMIT.moment);
  if (moments.length) out.moments = moments;
  const companions = texts(prefs.companions, LIMIT.companions, LIMIT.companion);
  if (companions.length) out.companions = companions;
  if (prefs.comfort) {
    const nickname = prefs.comfort.nickname?.trim().slice(0, LIMIT.nickname);
    out.comfort = nickname ? { kind: prefs.comfort.kind, nickname } : { kind: prefs.comfort.kind };
  }
  const interests = unique(prefs.interests ?? []).slice(0, LIMIT.interests);
  if (interests.length) out.interests = interests;
  if (prefs.genre && prefs.genre !== 'bedtime') out.genre = prefs.genre;
  if (prefs.experience) out.experience = prefs.experience;
  const after = prefs.after?.replace(/\s+/g, ' ').trim().slice(0, LIMIT.after);
  if (after) out.after = after;
  const avoid = texts(prefs.avoidWords, LIMIT.avoid, LIMIT.avoidWord);
  if (avoid.length) out.avoidWords = avoid;
  return Object.keys(out).length ? out : undefined;
}

export type ChapterStatus = 'read' | 'needs_pay' | 'today' | 'catch_up' | 'locked';

/**
 * Computed status of a chapter (5.2), never stored. Chapter 1 is open from the moment the
 * event exists, so when its evening is still ahead it reports 'today'.
 */
export function chapterStatus(chapter: Chapter, _event: BigEvent, today: ISODate, hasAccess: boolean): ChapterStatus {
  if (chapter.readOn) return 'read';
  if (chapter.index > 1 && !hasAccess) return 'needs_pay';
  const c = compareDates(chapter.date, today);
  if (c === 0) return 'today';
  if (c < 0) return 'catch_up';
  return chapter.index === 1 ? 'today' : 'locked';
}

/**
 * "Read ahead" (5.2, K5): a family with access may open the next date-locked chapter early,
 * one chapter ahead at most. Allowed only for the first locked chapter and only while no
 * chapter of a future evening has been read yet.
 */
export function canReadAhead(chapter: Chapter, event: BigEvent, today: ISODate, hasAccess: boolean): boolean {
  if (!hasAccess) return false;
  if (chapterStatus(chapter, event, today, hasAccess) !== 'locked') return false;
  // A parent may skip the waiting days, but the story stays in order: every earlier chapter is read first.
  return event.chapters.every((c) => c.index >= chapter.index || !!c.readOn);
}

/** May the reader open this chapter now (read, today, catch up, or read ahead)? */
export function isChapterOpen(chapter: Chapter, event: BigEvent, today: ISODate, hasAccess: boolean): boolean {
  const s = chapterStatus(chapter, event, today, hasAccess);
  if (s === 'read' || s === 'today' || s === 'catch_up') return true;
  return s === 'locked' && canReadAhead(chapter, event, today, hasAccess);
}

/** "This chapter opens on Wednesday evening." */
export function opensOnText(chapter: Chapter): string {
  return `This chapter opens on ${weekdayLabel(chapter.date, 'long')} evening`;
}

export type EventPhase = 'prep' | 'day' | 'after' | 'done';

/** 5.3: prep before the date, day on it, after it; done once a check-in is saved. */
export function eventPhase(event: Pick<BigEvent, 'date' | 'checkin'>, today: ISODate): EventPhase {
  if (event.checkin) return 'done';
  const c = compareDates(today, event.date);
  if (c < 0) return 'prep';
  if (c === 0) return 'day';
  return 'after';
}

/** Days until the event (negative after it). */
export function daysUntil(event: Pick<BigEvent, 'date'>, today: ISODate): number {
  return diffDays(today, event.date);
}

/** "5 sleeps until the dentist", "Tomorrow is the big day", "Today is the big day"; null after the event. */
export function countdownText(event: Pick<BigEvent, 'date' | 'type'>, template: EventTemplate, today: ISODate): string | null {
  const n = daysUntil(event, today);
  if (n < 0) return null;
  if (n === 0) return 'Today is the big day';
  if (n === 1) return 'Tomorrow is the big day';
  return `${n} sleeps until ${template.countdownLabel}`;
}

/**
 * The chapter to offer tonight: the earliest unread chapter that is open by date
 * (catch-up first, then today's). Null when none is due. Access is not considered here,
 * so the home screen can still say "Tonight: chapter 2" and lead to the paywall.
 */
export function tonightChapter(event: BigEvent, today: ISODate): Chapter | null {
  const due = event.chapters
    .filter((c) => !c.readOn && (c.index === 1 || compareDates(c.date, today) <= 0))
    .sort((a, b) => a.index - b.index);
  return due[0] ?? null;
}

export function readProgress(event: Pick<BigEvent, 'chapters'>): { read: number; total: number } {
  return { read: event.chapters.filter((c) => c.readOn).length, total: event.chapters.length };
}

/** Pages per chapter by the parent's story length: about 1, 2-3 and 4-5 minutes read aloud. */
export const PAGES_BY_LENGTH: Record<StoryLength, number> = { short: 3, standard: 5, long: 7 };

/** Ages a parent can choose (onboarding, Settings). */
export const CHILD_AGES: readonly ChildAge[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Pages per chapter and words per page by age (5.2) and story length (Story options). */
export function pageTargets(age: number, length: StoryLength = 'standard'): { pages: number; minWords: number; maxWords: number } {
  // Standard: about 2-3 minutes read aloud per chapter (300-500 words), still in short sentences.
  const pages = PAGES_BY_LENGTH[length] ?? 5;
  if (age <= 2) return { pages, minWords: 40, maxWords: 60 };
  if (age <= 4) return { pages, minWords: 60, maxWords: 80 };
  if (age <= 6) return { pages, minWords: 70, maxWords: 90 };
  if (age <= 8) return { pages, minWords: 85, maxWords: 110 };
  if (age <= 10) return { pages, minWords: 100, maxWords: 130 };
  return { pages, minWords: 110, maxWords: 150 };
}

/** Reading level of the story text by age, for the chapter prompt. */
export function readingLevel(age: number): { sentences: string; style: string } {
  if (age <= 2) return { sentences: '6-10', style: 'Very short sentences of 3-7 words, everyday words a toddler knows, gentle repetition, one idea per sentence.' };
  if (age <= 4) return { sentences: '8-12', style: 'Short sentences of 5-9 words, simple everyday words, some repetition.' };
  if (age <= 6) return { sentences: '8-14', style: 'Short sentences, simple words; explain any new word in the same sentence.' };
  if (age <= 8) return { sentences: '8-14', style: 'Clear sentences of up to 14 words; a few new words, each explained.' };
  if (age <= 10) return { sentences: '9-14', style: 'Natural sentences of up to 18 words, real names for things with short explanations; never babyish.' };
  return { sentences: '9-14', style: 'Natural sentences, a respectful tone for a pre-teen, real words and a bit of the "why"; never babyish, the Story friend is a companion, not a nursery character.' };
}

/** Events sorted for the home screen: upcoming first by date, then past events newest first. */
export function sortEventsForHome(events: BigEvent[], today: ISODate): BigEvent[] {
  const upcoming = events.filter((e) => compareDates(e.date, today) >= 0).sort((a, b) => compareDates(a.date, b.date));
  const past = events.filter((e) => compareDates(e.date, today) < 0).sort((a, b) => compareDates(b.date, a.date));
  return [...upcoming, ...past];
}

/** The event whose phase decides the top slot of the home screen (4.4). */
export function homeFocusEvent(events: BigEvent[], today: ISODate): BigEvent | null {
  const day = events.find((e) => eventPhase(e, today) === 'day');
  if (day) return day;
  const after = events
    .filter((e) => eventPhase(e, today) === 'after')
    .sort((a, b) => compareDates(b.date, a.date))[0];
  if (after) return after;
  return (
    events.filter((e) => eventPhase(e, today) === 'prep').sort((a, b) => compareDates(a.date, b.date))[0] ?? null
  );
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
