/**
 * Ready-made achievements (docs/scenarios-analysis.md 4): badge levels for repeat big days,
 * journey achievements for effort, collections of badges by group, and the brave-moment
 * stickers a parent gives after the check-in. Pure, so it is tested without a browser.
 *
 * Same rule as stars: earned by effort, never bought, no leaderboard.
 */
import { EVENT_GROUPS } from '@/lib/engine/templates';
import { addDays } from '@/lib/engine/clock';
import type { BigEvent, ChildProfile, EventType, ISODate } from '@/lib/engine/types';
import type { IconName } from '@/components/icons/Icon';

type Events = Pick<BigEvent, 'id' | 'type' | 'date' | 'chapters' | 'questions' | 'checkin'>[];
type Child = Pick<ChildProfile, 'badges'>;

// ---------- brave-moment stickers (parent-awarded at check-in) ----------

export const BRAVE_MOMENTS: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'deep_breather', label: 'Deep Breather', icon: 'wind' },
  { id: 'said_hello', label: 'Said Hello', icon: 'hand' },
  { id: 'held_still', label: 'Held Still', icon: 'shield-check' },
  { id: 'asked_for_help', label: 'Asked for Help', icon: 'circle-help' },
  { id: 'tried_new', label: 'Tried Something New', icon: 'sparkles' },
  { id: 'used_words', label: 'Used My Words', icon: 'smile' },
  { id: 'kind_helper', label: 'Kind Helper', icon: 'hand-heart' },
  { id: 'waited_turn', label: 'Waited My Turn', icon: 'clock' },
];
export const MAX_BRAVE_PER_CHECKIN = 2;
const BRAVE_IDS = new Set(BRAVE_MOMENTS.map((m) => m.id));

/** Keeps known sticker ids only, without repeats, at most two. */
export function cleanBraveMoments(ids: readonly string[] | undefined): string[] {
  return [...new Set((ids ?? []).filter((id) => BRAVE_IDS.has(id)))].slice(0, MAX_BRAVE_PER_CHECKIN);
}

/** How many times each sticker was given, most given first. */
export function braveMomentCounts(events: Events): { id: string; label: string; icon: IconName; count: number }[] {
  const n = new Map<string, number>();
  for (const e of events) for (const id of cleanBraveMoments(e.checkin?.brave)) n.set(id, (n.get(id) ?? 0) + 1);
  return BRAVE_MOMENTS.filter((m) => n.has(m.id))
    .map((m) => ({ ...m, count: n.get(m.id)! }))
    .sort((a, b) => b.count - a.count);
}

// ---------- badge levels for repeat big days ----------

export type BadgeTier = 'bronze' | 'silver' | 'gold';
export const TIER_AT: Record<BadgeTier, number> = { bronze: 1, silver: 3, gold: 5 };

export interface BadgeLevel {
  eventType: EventType;
  count: number;
  tier: BadgeTier;
  /** Badges until the next tier; undefined at gold. */
  toNext?: number;
}

/** One entry per big-day type the child has a badge for. */
export function badgeLevels(child: Child): BadgeLevel[] {
  const n = new Map<EventType, number>();
  for (const b of child.badges) n.set(b.eventType, (n.get(b.eventType) ?? 0) + 1);
  return [...n.entries()].map(([eventType, count]) => {
    const tier: BadgeTier = count >= TIER_AT.gold ? 'gold' : count >= TIER_AT.silver ? 'silver' : 'bronze';
    const next = tier === 'bronze' ? TIER_AT.silver : tier === 'silver' ? TIER_AT.gold : undefined;
    return { eventType, count, tier, toNext: next === undefined ? undefined : next - count };
  });
}

// ---------- collections ----------

export const COLLECTION_NAME: Record<string, string> = {
  health: 'Health Hero',
  growing: 'Growing Up',
  school: 'School Life',
  fun: 'Friends and Fun',
  away: 'Explorer',
  family: 'Big Heart',
};

export interface Collection {
  id: string;
  name: string;
  types: readonly EventType[];
  have: EventType[];
  done: boolean;
}

/** The picker groups as badge shelves: which types of each group already have a badge. */
export function collections(child: Child): Collection[] {
  const got = new Set(child.badges.map((b) => b.eventType));
  return EVENT_GROUPS.map((g) => {
    const have = g.types.filter((t) => got.has(t));
    return { id: g.id, name: COLLECTION_NAME[g.id] ?? g.label, types: g.types, have, done: have.length === g.types.length };
  });
}

// ---------- journey achievements ----------

export interface Achievement {
  id: string;
  name: string;
  how: string;
  icon: IconName;
  goal: number;
  value: number;
  earned: boolean;
}

function readDays(events: Events): ISODate[] {
  return [...new Set(events.flatMap((e) => e.chapters.flatMap((c) => (c.readOn ? [c.readOn] : []))))].sort();
}

/** Longest run of evenings in a row with a chapter read (rest evenings not forgiven here). */
export function longestRun(events: Events): number {
  const days = readDays(events);
  let best = 0;
  let run = 0;
  let prev: ISODate | undefined;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

const done = (e: Events[number]) => !!e.checkin;
const readBefore = (e: Events[number], beat: string) =>
  e.chapters.some((c) => c.beats.includes(beat as never) && !!c.readOn && c.readOn <= e.date);
const allReadBefore = (e: Events[number]) => e.chapters.length > 0 && e.chapters.every((c) => !!c.readOn && c.readOn <= e.date);

function tryAgainCount(events: Events): number {
  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted.some((hard, i) => hard.checkin?.rating === 3 && sorted.slice(i + 1).some((e) => e.type === hard.type && done(e))) ? 1 : 0;
}

/** All journey achievements with progress, in display order. */
export function journeyAchievements(events: Events): Achievement[] {
  const chapters = events.reduce((n, e) => n + e.chapters.filter((c) => c.readOn).length, 0);
  const questions = events.reduce((n, e) => n + e.questions.length, 0);
  const checkins = events.filter(done).length;
  const run = longestRun(events);
  const evenings = readDays(events).length;
  const rows: Omit<Achievement, 'earned'>[] = [
    { id: 'first_story', name: 'First Page', how: 'Read the first chapter', icon: 'book-open', goal: 1, value: chapters },
    { id: 'three_nights', name: 'Three Nights', how: 'Read 3 evenings in a row', icon: 'moon', goal: 3, value: run },
    { id: 'week_reader', name: 'Story Week', how: 'Read 7 evenings in a row', icon: 'calendar-days', goal: 7, value: run },
    { id: 'moon_month', name: 'Moon Month', how: 'Read on 30 evenings', icon: 'moon-star', goal: 30, value: evenings },
    { id: 'first_question', name: 'Curious Mind', how: 'Ask the first question', icon: 'circle-help', goal: 1, value: questions },
    { id: 'ten_questions', name: 'Question Explorer', how: 'Ask 10 questions', icon: 'sparkles', goal: 10, value: questions },
    { id: 'told_the_day', name: 'Day Teller', how: 'Tell how a big day went', icon: 'smile', goal: 1, value: checkins },
    { id: 'practise', name: 'Practice Pro', how: 'Read the practice chapter before a big day', icon: 'target', goal: 1, value: events.filter((e) => readBefore(e, 'rehearsal')).length },
    { id: 'ready_star', name: 'Ready Star', how: 'Read every chapter before a big day', icon: 'star', goal: 1, value: events.filter(allReadBefore).length },
    { id: 'try_again', name: 'Try Again Hero', how: 'Do a hard big day again', icon: 'rotate-ccw', goal: 1, value: tryAgainCount(events) },
    { id: 'big_day_5', name: 'Five Big Days', how: 'Finish 5 big days', icon: 'trophy', goal: 5, value: checkins },
    { id: 'big_day_10', name: 'Ten Big Days', how: 'Finish 10 big days', icon: 'crown', goal: 10, value: checkins },
  ];
  return rows.map((r) => ({ ...r, value: Math.min(r.value, r.goal), earned: r.value >= r.goal }));
}

/** Everything for the Badges tab in one call. */
export function achievementSummary(events: Events, child: Child) {
  const journey = journeyAchievements(events);
  const shelves = collections(child);
  return {
    journey,
    collections: shelves,
    levels: badgeLevels(child),
    brave: braveMomentCounts(events),
    earned: journey.filter((a) => a.earned).length + shelves.filter((c) => c.done).length,
    total: journey.length + shelves.length,
  };
}
