/**
 * Jury demo mode, browser side (docs/SPEC.md 4.3, 5.1, 10.4a). Pure rules first (tested in
 * tests/unit/demo.test.ts), then the small client calls the Demo bar makes.
 */
import { addDays } from '@/lib/engine/clock';
import { hasEventAccess } from '@/lib/engine/access';
import type { BigEvent, Entitlement, ISODate, Workspace } from '@/lib/engine/types';

export type TimeTarget = 'evening2' | 'day' | 'after' | 'today';

/** The date each time button moves "today" to; undefined = remove the override (5.1). */
export function timeTravelDate(event: Pick<BigEvent, 'date' | 'chapters'>, target: TimeTarget): ISODate | undefined {
  if (target === 'today') return undefined;
  if (target === 'day') return event.date;
  if (target === 'after') return addDays(event.date, 1);
  const ch2 = event.chapters.find((c) => c.index === 2) ?? event.chapters[event.chapters.length - 1];
  return ch2 ? ch2.date : event.date;
}

/** The event the Demo bar works on: the one on screen, else the nearest upcoming, else the latest. */
export function demoEvent(events: BigEvent[], realToday: ISODate, onScreenId?: string): BigEvent | undefined {
  if (onScreenId) {
    const e = events.find((x) => x.id === onScreenId);
    if (e) return e;
  }
  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : 1));
  return sorted.find((e) => e.date >= realToday) ?? sorted[sorted.length - 1];
}

/** Demo access as the browser sees it: a sample family with a non-renewing year row (10.4a). */
export function isDemoAccess(ws: Workspace, list: Entitlement[], nowMs: number): boolean {
  return ws === 'sample' && list.some((e) => e.plan === 'year' && !e.renews && e.expiresAt > nowMs);
}

export type TourStepId = 'read' | 'ask' | 'panel' | 'unlock' | 'day' | 'after';

export interface TourStep {
  id: TourStepId;
  label: string;
  done: boolean;
  href: string;
  /** Time travel to apply before opening the link. */
  time?: TimeTarget;
  /** What to do on the step's own screen when opening it is not enough. */
  hint?: string;
  /** The Demo bar can do this step itself (unlock = demo access, when the server offers it). */
  action?: 'grant';
}

export interface TourSeen {
  panel?: boolean;
  day?: boolean;
  /** The event the tour runs on, fixed at its first screen so a new or past event never restarts it. */
  eventId?: string;
}

/** The tour's event: the one it started on while it still exists, else the nearest upcoming. */
export function tourEvent(events: BigEvent[], realToday: ISODate, seen: TourSeen): BigEvent | undefined {
  return (seen.eventId && events.find((e) => e.id === seen.eventId)) || demoEvent(events, realToday);
}

/**
 * The six steps of the guided tour (4.3). Ticks come from the family's own data (chapter read,
 * question asked, access present, ritual or check-in saved); "panel opened" and "day card seen"
 * are not part of the family document, so they come from a small per-browser note.
 */
export function tourSteps(event: BigEvent, list: Entitlement[], nowMs: number, seen: TourSeen): TourStep[] {
  const base = `/event/${encodeURIComponent(event.id)}`;
  const access = hasEventAccess(list, event.id, nowMs);
  return [
    {
      id: 'ask', label: 'Ask a question, watch the next page change', done: event.questions.length > 0, href: `${base}/read/1`,
      hint: 'Tap a question under the page; the next page changes to answer it. On the chapter end, tap Read it again first.',
    },
    {
      id: 'read', label: 'Read chapter 1 to the end', done: !!event.chapters.find((c) => c.index === 1)?.readOn, href: `${base}/read/1`,
      hint: 'Turn the pages with Next, then tap Finish on the last one.',
    },
    { id: 'panel', label: 'Open the parent panel', done: !!seen.panel, href: `${base}/panel` },
    {
      id: 'unlock', label: 'Unlock the full plan', done: access, href: `${base}/paywall`, action: 'grant',
      hint: 'Pay with the test card 4242 4242 4242 4242, or tap Skip payment.',
    },
    { id: 'day', label: 'Jump to the event day: card and PDF', done: !!seen.day || !!event.ritual, href: `${base}/day`, time: 'day' },
    {
      id: 'after', label: 'After the event: check-in, badge, next big day', done: !!event.checkin, href: event.checkin ? `${base}/badge` : `${base}/checkin`, time: 'after',
      hint: 'Pick how it went and tap Save. The badge opens next.',
    },
  ];
}

// ---------- browser state ----------

const SEEN_KEY = 'bds:sample:demo';
const REAL_TIME_KEY = 'bds:demo-time';

export function readSeen(): TourSeen {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as TourSeen) : {};
  } catch {
    return {};
  }
}

/** Adds ticks, never removes one: `{ day: true, panel: undefined }` keeps an earlier panel tick. */
export function mergeSeen(prev: TourSeen, patch: TourSeen): TourSeen {
  const next = { ...prev };
  if (patch.panel) next.panel = true;
  if (patch.day) next.day = true;
  if (patch.eventId && !prev.eventId) next.eventId = patch.eventId;
  return next;
}

export function markSeen(patch: TourSeen): TourSeen {
  const next = mergeSeen(readSeen(), patch);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function clearSeen(): void {
  try {
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    /* ignore */
  }
}

/** `?demo=1` for a real family: the time group only, remembered for the session (5.1). */
export function realTimeGroupOn(search: string): boolean {
  try {
    if (new URLSearchParams(search).get('demo') === '1') window.sessionStorage.setItem(REAL_TIME_KEY, '1');
    return window.sessionStorage.getItem(REAL_TIME_KEY) === '1';
  } catch {
    return false;
  }
}

// ---------- server calls ----------

export async function sampleAccess(action: 'grant' | 'reset'): Promise<Entitlement[] | null> {
  try {
    const res = await fetch('/api/sample/access', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-bds-workspace': 'sample' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { entitlements?: Entitlement[] };
    return Array.isArray(body.entitlements) ? body.entitlements : null;
  } catch {
    return null;
  }
}

let demoModeCache: Promise<boolean> | null = null;

/** Whether the server offers demo access to this sample (DEMO_MODE on and a live sample session). */
export function demoModeOn(): Promise<boolean> {
  demoModeCache ??= fetch('/api/sample/access', { credentials: 'same-origin', headers: { 'x-bds-workspace': 'sample' } })
    .then((r) => (r.ok ? r.json() : { demoMode: false }))
    .then((b: { demoMode?: boolean }) => b.demoMode === true)
    .catch(() => false);
  return demoModeCache;
}
