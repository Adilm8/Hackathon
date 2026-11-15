/**
 * The home page path (a Duolingo-like trail of evenings): chapters, the big day, the
 * check-in and the badge as nodes, plus the streak and today's tasks. Pure, so it is tested
 * without a browser; the page only draws what this returns.
 */
import { addDays, weekdayLabel } from '@/lib/engine/clock';
import { canReadAhead, chapterStatus, eventPhase, tonightChapter } from '@/lib/engine/plan';
import type { BigEvent, ISODate } from '@/lib/engine/types';

export type NodeKind = 'chapter' | 'day' | 'checkin' | 'badge';
/** done = finished; open = can be opened now; pay = needs a plan; locked = later. */
export type NodeState = 'done' | 'open' | 'pay' | 'locked';

export interface PathNode {
  key: string;
  kind: NodeKind;
  title: string;
  /** Short hint under the title or on the bubble ("Opens Wednesday", "On the big day"). */
  hint: string;
  state: NodeState;
  /** Where a tap leads; undefined for locked nodes. */
  href?: string;
  /** Chapter number, for chapter nodes. */
  chapter?: number;
  /** A locked chapter the parent may open now, skipping the waiting days. */
  early?: boolean;
}

/** The plan of one big day now lives on the home page: /event/<id> redirects here. */
export function planHref(eventId: string): string {
  return `/home?event=${encodeURIComponent(eventId)}`;
}

export function buildPath(event: BigEvent, today: ISODate, hasAccess: boolean): PathNode[] {
  const base = `/event/${event.id}`;
  const phase = eventPhase(event, today);
  const nodes: PathNode[] = event.chapters.map((ch) => {
    const s = chapterStatus(ch, event, today, hasAccess);
    const state: NodeState = s === 'read' ? 'done' : s === 'needs_pay' ? 'pay' : s === 'locked' ? 'locked' : 'open';
    const hint =
      state === 'done' ? 'Read' : state === 'pay' ? 'Unlock with a plan' : state === 'locked' ? `Opens ${weekdayLabel(ch.date, 'long')}` : s === 'catch_up' ? 'Catch up' : 'Tonight';
    return {
      key: `ch${ch.index}`,
      kind: 'chapter',
      title: `Chapter ${ch.index}`,
      hint,
      state,
      chapter: ch.index,
      early: state === 'locked' && canReadAhead(ch, event, today, hasAccess),
      href: state === 'locked' ? undefined : state === 'pay' ? `${base}/paywall` : `${base}/read/${ch.index}`,
    };
  });
  const dayReached = phase !== 'prep';
  nodes.push({
    key: 'day', kind: 'day', title: 'The big day',
    hint: phase === 'prep' ? `On ${weekdayLabel(event.date, 'long')}` : phase === 'day' ? 'Today: open the card' : 'Done',
    state: phase === 'prep' ? 'locked' : phase === 'day' ? 'open' : 'done',
    href: dayReached ? `${base}/day` : undefined,
  });
  nodes.push({
    key: 'checkin', kind: 'checkin', title: 'How did it go?',
    hint: event.checkin ? 'Done' : phase === 'after' ? '30 seconds' : 'After the big day',
    state: event.checkin ? 'done' : phase === 'after' ? 'open' : 'locked',
    href: event.checkin || phase === 'after' ? `${base}/checkin` : undefined,
  });
  nodes.push({
    key: 'badge', kind: 'badge', title: 'Badge',
    hint: event.checkin ? 'Earned' : 'After the check-in',
    state: event.checkin ? 'done' : 'locked',
    href: event.checkin ? `${base}/badge` : undefined,
  });
  return nodes;
}

/** The node the "Start" bubble sits on: the first one not finished yet. */
export function currentNodeIndex(nodes: PathNode[]): number {
  const open = nodes.findIndex((n) => n.state === 'open' || n.state === 'pay');
  if (open >= 0) return open;
  const next = nodes.findIndex((n) => n.state !== 'done');
  return next >= 0 ? next : nodes.length - 1;
}

/** Evenings in a row with a chapter read; today counts once read, otherwise the run up to yesterday. */
export function readingStreak(events: Pick<BigEvent, 'chapters'>[], today: ISODate): number {
  const days = new Set(events.flatMap((e) => e.chapters.flatMap((c) => (c.readOn ? [c.readOn] : []))));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface DayTask {
  key: string;
  label: string;
  done: boolean;
  href?: string;
}

/** Today's small goals for the nearest big day (the right column). */
export function todayTasks(event: BigEvent, today: ISODate): DayTask[] {
  const base = `/event/${event.id}`;
  const phase = eventPhase(event, today);
  const tasks: DayTask[] = [];
  const readToday = event.chapters.find((c) => c.readOn === today);
  const tonight = tonightChapter(event, today);
  if (readToday || tonight) {
    const ch = readToday ?? tonight!;
    tasks.push({ key: 'read', label: `Read chapter ${ch.index} together`, done: !!readToday, href: `${base}/read/${ch.index}` });
    tasks.push({
      key: 'ask', label: 'Ask the story a question', done: event.questions.some((q) => q.askedOn === today),
      href: `${base}/read/${ch.index}`,
    });
  }
  if (phase === 'day') tasks.push({ key: 'day', label: 'Open the "first, then" card', done: false, href: `${base}/day` });
  if (phase === 'after' || phase === 'done') tasks.push({ key: 'checkin', label: 'Tell us how it went', done: !!event.checkin, href: `${base}/checkin` });
  if (phase === 'prep' && tasks.length === 0) tasks.push({ key: 'panel', label: 'Look at tonight’s tips for you', done: false, href: `${base}/panel` });
  return tasks;
}
