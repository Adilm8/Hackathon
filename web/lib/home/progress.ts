/**
 * Motivation on the home page, the way habit apps do it but sized for a bedtime routine:
 * a streak that forgives one missed evening a week, a week strip, stars and levels, and a
 * short weekly summary for the parent. Pure, so it is tested without a browser.
 *
 * Stars only mark effort (reading together, asking, telling how the day went). They never
 * buy anything and there is no leaderboard.
 */
import { addDays, weekdayLabel } from '@/lib/engine/clock';
import type { BigEvent, ChildProfile, ISODate } from '@/lib/engine/types';

type Events = Pick<BigEvent, 'chapters' | 'questions' | 'checkin'>[];

function readDays(events: Pick<BigEvent, 'chapters'>[]): Set<ISODate> {
  return new Set(events.flatMap((e) => e.chapters.flatMap((c) => (c.readOn ? [c.readOn] : []))));
}

export interface Streak {
  /** Evenings read in the current run (rest evenings are not counted). */
  count: number;
  /** Missed evenings the run forgave: at most one in any seven days. */
  rested: ISODate[];
}

/**
 * Evenings in a row with a chapter read. Today counts once read; before that the run up to
 * yesterday stands. A single missed evening is forgiven ("rest evening") when the evening
 * before it was read and no other evening was forgiven in the seven days around it.
 */
export function streakWithRest(events: Pick<BigEvent, 'chapters'>[], today: ISODate): Streak {
  const days = readDays(events);
  let d = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  const rested: ISODate[] = [];
  let sinceRest = Infinity;
  for (let guard = 0; guard < 400; guard++) {
    if (days.has(d)) {
      count++;
      sinceRest++;
    } else if (count > 0 || d === addDays(today, -1)) {
      // A gap of one evening, with a read evening before it, and no rest in the last 7 days.
      if (sinceRest >= 7 && days.has(addDays(d, -1))) {
        rested.push(d);
        sinceRest = 0;
      } else break;
    } else break;
    d = addDays(d, -1);
  }
  return count === 0 ? { count: 0, rested: [] } : { count, rested };
}

export type WeekDayState = 'read' | 'rest' | 'missed' | 'tonight' | 'none';

export interface WeekDay {
  date: ISODate;
  /** "M", "T"... one letter for the strip. */
  letter: string;
  /** "Monday", for screen readers. */
  name: string;
  state: WeekDayState;
}

/** The last seven evenings ending today, oldest first. */
export function weekStrip(events: Pick<BigEvent, 'chapters'>[], today: ISODate): WeekDay[] {
  const days = readDays(events);
  const rested = new Set(streakWithRest(events, today).rested);
  const first = [...days].sort()[0];
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const state: WeekDayState = days.has(date)
      ? 'read'
      : rested.has(date)
        ? 'rest'
        : date === today
          ? 'tonight'
          : first && date > first
            ? 'missed'
            : 'none';
    const name = weekdayLabel(date, 'long');
    return { date, letter: name[0], name, state };
  });
}

export const STARS = { chapter: 10, question: 5, checkin: 20, badge: 30 } as const;

/** Stars for everything done so far (all big days of this child). */
export function totalStars(events: Events, child: Pick<ChildProfile, 'badges'>): number {
  return starsBetween(events, child, '0000-01-01', '9999-12-31');
}

function starsBetween(events: Events, child: Pick<ChildProfile, 'badges'>, from: ISODate, to: ISODate): number {
  const inRange = (d?: ISODate) => !!d && d >= from && d <= to;
  let s = 0;
  for (const e of events) {
    s += e.chapters.filter((c) => inRange(c.readOn)).length * STARS.chapter;
    s += e.questions.filter((q) => inRange(q.askedOn)).length * STARS.question;
    if (inRange(e.checkin?.savedOn)) s += STARS.checkin;
  }
  s += child.badges.filter((b) => inRange(b.earnedOn)).length * STARS.badge;
  return s;
}

/** Level names: friendly, generic, no brand. */
export const LEVELS: { min: number; name: string }[] = [
  { min: 0, name: 'Little explorer' },
  { min: 30, name: 'Brave starter' },
  { min: 80, name: 'Story friend' },
  { min: 150, name: 'Bright helper' },
  { min: 250, name: 'Big day hero' },
  { min: 400, name: 'Star captain' },
  { min: 600, name: 'Moon champion' },
];

export interface Level {
  /** 1-based. */
  number: number;
  name: string;
  stars: number;
  /** Stars where the next level starts; undefined at the top level. */
  next?: number;
  nextName?: string;
  /** 0..1 progress inside this level (1 at the top level). */
  progress: number;
}

export function levelFor(stars: number): Level {
  let i = 0;
  while (i + 1 < LEVELS.length && stars >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const nxt = LEVELS[i + 1];
  return {
    number: i + 1,
    name: cur.name,
    stars,
    next: nxt?.min,
    nextName: nxt?.name,
    progress: nxt ? (stars - cur.min) / (nxt.min - cur.min) : 1,
  };
}

export interface WeekSummary {
  evenings: number;
  chapters: number;
  questions: number;
  stars: number;
  badges: number;
}

/** The last seven days for the parent ("This week"). */
export function weekSummary(events: Events, child: Pick<ChildProfile, 'badges'>, today: ISODate): WeekSummary {
  const from = addDays(today, -6);
  const inWeek = (d?: ISODate) => !!d && d >= from && d <= today;
  const chapters = events.flatMap((e) => e.chapters.filter((c) => inWeek(c.readOn)));
  return {
    evenings: new Set(chapters.map((c) => c.readOn)).size,
    chapters: chapters.length,
    questions: events.reduce((n, e) => n + e.questions.filter((q) => inWeek(q.askedOn)).length, 0),
    stars: starsBetween(events, child, from, today),
    badges: child.badges.filter((b) => inWeek(b.earnedOn)).length,
  };
}
