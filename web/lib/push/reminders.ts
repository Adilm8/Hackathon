/**
 * Reminder times for push notifications and the in-app reminder (shared by browser and tests).
 * Computed in the browser, in the parent's own time zone, and sent to the server as plain
 * times; the server only delivers them. Texts never contain the child's name, because a
 * notification can show on a locked screen.
 */
import { addDays } from '@/lib/engine/clock';
import type { BigEvent, ISODate } from '@/lib/engine/types';

export type ReminderKind = 'chapter' | 'day' | 'checkin';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  /** ms since epoch. */
  at: number;
  title: string;
  body: string;
  /** Path inside the app. */
  url: string;
}

export interface ReminderOptions {
  /** "18:30", local time of the evening chapter reminder. */
  evening: string;
  /** Quiet hours, local "HH:MM"; a reminder inside them moves to their end. */
  quietStart: string;
  quietEnd: string;
}

export const DEFAULT_REMINDERS: ReminderOptions = { evening: '18:30', quietStart: '20:30', quietEnd: '07:30' };

const MORNING = '08:00';
const CHECKIN = '17:00';
const HORIZON_DAYS = 14;
export const MAX_REMINDERS = 40;

export function minutesOf(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : NaN;
}

export function isValidTime(hhmm: string): boolean {
  return Number.isFinite(minutesOf(hhmm));
}

/** True when the local minute-of-day falls inside the quiet window (which may cross midnight). */
export function inQuiet(minute: number, o: Pick<ReminderOptions, 'quietStart' | 'quietEnd'>): boolean {
  const s = minutesOf(o.quietStart);
  const e = minutesOf(o.quietEnd);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s === e) return false;
  return s < e ? minute >= s && minute < e : minute >= s || minute < e;
}

/** Local date + "HH:MM" → ms, moved to the end of quiet hours when it falls inside them. */
export function localTime(date: ISODate, hhmm: string, o: ReminderOptions): number {
  let min = minutesOf(hhmm);
  if (!Number.isFinite(min)) min = minutesOf(DEFAULT_REMINDERS.evening);
  let day = date;
  if (inQuiet(min, o)) {
    const end = minutesOf(o.quietEnd);
    if (end <= min) day = addDays(date, 1);
    min = end;
  }
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(min / 60), min % 60, 0, 0).getTime();
}

/** The reminders still ahead (or due today) for every big day on this device, soonest first. */
export function computeReminders(events: BigEvent[], today: ISODate, nowMs: number, o: ReminderOptions = DEFAULT_REMINDERS): Reminder[] {
  const until = addDays(today, HORIZON_DAYS);
  const out: Reminder[] = [];
  for (const e of events) {
    const base = `/event/${encodeURIComponent(e.id)}`;
    for (const c of e.chapters) {
      if (c.readOn || c.date < today || c.date > until || c.date > e.date) continue;
      out.push({
        id: `${e.id}:ch${c.index}`, kind: 'chapter', at: localTime(c.date, o.evening, o),
        title: 'Story time', body: `Chapter ${c.index} is ready for tonight. About three minutes together.`, url: `${base}/read/${c.index}`,
      });
    }
    if (e.date >= today && e.date <= until)
      out.push({
        id: `${e.id}:day`, kind: 'day', at: localTime(e.date, MORNING, o),
        title: 'Today is the big day', body: 'Open the "first, then" card together before you go.', url: `${base}/day`,
      });
    const next = addDays(e.date, 1);
    if (!e.checkin && next >= today && next <= until)
      out.push({
        id: `${e.id}:checkin`, kind: 'checkin', at: localTime(next, CHECKIN, o),
        title: 'How did the big day go?', body: 'Tell us in 30 seconds and collect the badge.', url: `${base}/checkin`,
      });
  }
  // Due earlier today still counts (the in-app reminder shows it); older ones are dropped.
  const startOfToday = localTime(today, '00:00', { ...o, quietStart: '00:00', quietEnd: '00:00' });
  return out.filter((r) => r.at >= startOfToday).sort((a, b) => a.at - b.at).slice(0, MAX_REMINDERS);
}

/** The in-app reminder to show now: the latest one already due today, if any. */
export function dueNow(reminders: Reminder[], nowMs: number, today: ISODate): Reminder | null {
  const startOfToday = localTime(today, '00:00', { ...DEFAULT_REMINDERS, quietStart: '00:00', quietEnd: '00:00' });
  const due = reminders.filter((r) => r.at <= nowMs && r.at >= startOfToday);
  return due.at(-1) ?? null;
}
