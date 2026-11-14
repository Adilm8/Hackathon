/**
 * The single clock of the app (docs/SPEC.md 5.1, A6).
 * Every calendar decision takes "today" from clock.today(); nothing else calls
 * new Date() for calendar logic. Dates are local 'YYYY-MM-DD' strings; helpers
 * work at local noon internally so daylight-saving changes never shift a day.
 * The server never does date arithmetic on behalf of a family.
 */
import type { ISODate } from './types';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses 'YYYY-MM-DD' into a Date at local noon. Throws on a malformed or impossible date. */
export function toLocalNoon(d: ISODate): Date {
  const m = ISO_RE.exec(d);
  if (!m) throw new Error(`Invalid ISODate: ${d}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const date = new Date(y, mo - 1, da, 12, 0, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== da) {
    throw new Error(`Invalid ISODate: ${d}`);
  }
  return date;
}

/** Formats the local calendar date of a Date as 'YYYY-MM-DD'. */
export function fromDate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string') return false;
  try {
    toLocalNoon(s);
    return true;
  } catch {
    return false;
  }
}

export function addDays(d: ISODate, n: number): ISODate {
  const date = toLocalNoon(d);
  date.setDate(date.getDate() + n);
  return fromDate(date);
}

/** Whole days from a to b (b - a). Positive when b is later. */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = toLocalNoon(b).getTime() - toLocalNoon(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Mon' or 'Monday'. */
export function weekdayLabel(d: ISODate, style: 'short' | 'long' = 'short'): string {
  const day = toLocalNoon(d).getDay();
  return style === 'long' ? WEEKDAYS_LONG[day] : WEEKDAYS_SHORT[day];
}

/** US style without ambiguous numerals: 'Nov 20' or 'Fri, Nov 20'. */
export function dateLabel(d: ISODate, opts: { weekday?: boolean } = {}): string {
  const date = toLocalNoon(d);
  const base = `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  return opts.weekday ? `${WEEKDAYS_SHORT[date.getDay()]}, ${base}` : base;
}

/**
 * Where the override lives. The settings store (lib/store/settings.ts) owns
 * bds:settings; the clock only reads clockOverride from it, so the clock works
 * before any store has hydrated and in tests.
 */
type OverrideSource = () => ISODate | undefined;

let overrideSource: OverrideSource = defaultOverrideSource;
let nowSource: () => Date = () => new Date();

function defaultOverrideSource(): ISODate | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const ws = window.localStorage.getItem('bds:workspace');
    const prefix = ws === '"sample"' || ws === 'sample' ? 'bds:sample:' : 'bds:';
    const raw = window.localStorage.getItem(`${prefix}settings`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { state?: { clockOverride?: unknown }; clockOverride?: unknown };
    // Zustand persist wraps the value in { state, version }; accept both shapes.
    const value = parsed?.state?.clockOverride ?? parsed?.clockOverride;
    return isISODate(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export const clock = {
  /** Local calendar date of the device, or the Demo override. */
  today(): ISODate {
    const o = overrideSource();
    return o ?? fromDate(nowSource());
  },
  /** The real device date, ignoring any override. */
  realToday(): ISODate {
    return fromDate(nowSource());
  },
  /** True when the Demo bar moved "today". */
  isOverridden(): boolean {
    return overrideSource() !== undefined;
  },
  /** Local hour 0..23 of the device (night mode of the reader). */
  hour(): number {
    return nowSource().getHours();
  },
  /** Lets the settings store (or a test) supply the override. */
  setOverrideSource(fn: OverrideSource | null): void {
    overrideSource = fn ?? defaultOverrideSource;
  },
  /** Tests only: fixes the real time. */
  setNowSource(fn: (() => Date) | null): void {
    nowSource = fn ?? (() => new Date());
  },
};

export type Clock = typeof clock;
