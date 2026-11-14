/**
 * Calendar reminders (docs/SPEC.md 11.8, 9 GET /api/ics, A7).
 * The .ics text is built with the `ics` package (ISC licence, github.com/adamgibbons/ics),
 * using floating local times so 19:30 is 19:30 wherever the parent is. One reminder per
 * plan evening and a "How did it go?" on the event day. No child name anywhere.
 */
import { createEvents, type EventAttributes } from 'ics';

/** DTSTAMP: the library reads `timestamp`, its typings do not list it. */
type IcsEvent = EventAttributes & { timestamp: number };
import { fromDate, toLocalNoon } from './clock';
import { IcsPayload } from './schemas';
import type { ISODate } from './types';

export type IcsData = {
  label: string;
  eventId: string;
  chapterDates: ISODate[];
  eventDate: ISODate;
  firstChapter?: number;
  skipCheckin?: boolean;
};

const minutes = (t: { hour: number; minute: number }) => t.hour * 60 + t.minute;

/**
 * Only reminders still ahead of the parent's own clock: an evening whose 19:30 has passed today
 * (or an earlier date) is left out, and the numbering keeps the real chapter numbers.
 * `now` is the device's real time, not the Demo clock.
 */
export function upcomingReminders(
  data: Pick<IcsData, 'label' | 'eventId' | 'eventDate'> & { chapterDates: ISODate[] },
  now: Date,
): IcsData {
  const today = fromDate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const ahead = (d: ISODate, t: { hour: number; minute: number }) => d > today || (d === today && nowMin < minutes(t));
  const first = data.chapterDates.findIndex((d) => ahead(d, CHAPTER_TIME));
  const skipped = first === -1 ? data.chapterDates.length : first;
  const out: IcsData = { label: data.label, eventId: data.eventId, eventDate: data.eventDate, chapterDates: data.chapterDates.slice(skipped) };
  if (skipped > 0) out.firstChapter = skipped + 1;
  if (!ahead(data.eventDate, CHECKIN_TIME)) out.skipCheckin = true;
  return out;
}

const CHAPTER_TIME = { hour: 19, minute: 30 };
const CHECKIN_TIME = { hour: 19, minute: 0 };
const PRODUCT = 'Big Day Stories';

function parts(d: ISODate): [number, number, number] {
  const date = toLocalNoon(d);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

function base(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function chapterTitle(k: number, n: number): string {
  return `${PRODUCT}: tonight's chapter ${k} of ${n}`;
}

/** Builds the calendar file. `stampMs` fixes DTSTAMP (tests); defaults to now. */
export function buildIcs(data: IcsData, opts: { baseUrl: string; stampMs?: number }): string {
  const parsed = IcsPayload.parse(data);
  const url = base(opts.baseUrl);
  const stamp = opts.stampMs ?? Date.now();
  const k0 = parsed.firstChapter ?? 1;
  const n = k0 - 1 + parsed.chapterDates.length;
  const label = parsed.label.trim();
  const events: IcsEvent[] = parsed.chapterDates.map((d, i) => ({
    uid: `${parsed.eventId}-chapter-${k0 + i}@bigdaystories`,
    title: chapterTitle(k0 + i, n),
    description: `Tonight's chapter for ${label}. Open it here: ${url}/event/${parsed.eventId}/read/${k0 + i}`,
    url: `${url}/event/${parsed.eventId}/read/${k0 + i}`,
    start: [...parts(d), CHAPTER_TIME.hour, CHAPTER_TIME.minute],
    startInputType: 'local',
    startOutputType: 'local',
    duration: { minutes: 20 },
    timestamp: stamp,
    alarms: [{ action: 'display', description: chapterTitle(k0 + i, n), trigger: { minutes: 0, before: true } }],
  }));
  if (!parsed.skipCheckin) events.push({
    uid: `${parsed.eventId}-checkin@bigdaystories`,
    title: `${PRODUCT}: How did it go?`,
    description: `How did ${label} go? Save a 30-second check-in: ${url}/event/${parsed.eventId}/checkin`,
    url: `${url}/event/${parsed.eventId}/checkin`,
    start: [...parts(parsed.eventDate), CHECKIN_TIME.hour, CHECKIN_TIME.minute],
    startInputType: 'local',
    startOutputType: 'local',
    duration: { minutes: 15 },
    timestamp: stamp,
    alarms: [{ action: 'display', description: `${PRODUCT}: How did it go?`, trigger: { minutes: 0, before: true } }],
  });
  if (events.length === 0) throw new Error('Nothing left to remind about');
  const { error, value } = createEvents(events, { productId: 'big-day-stories', calName: PRODUCT });
  if (error || !value) throw error ?? new Error('Could not build the calendar file');
  // The library writes an alert "at start" as "-PT", which is not a valid duration.
  return value.replace(/TRIGGER:-?PT\r\n/g, 'TRIGGER:PT0M\r\n');
}

// ---------- the ?d= payload of GET /api/ics ----------

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeIcsPayload(data: IcsData): string {
  return toBase64Url(JSON.stringify(IcsPayload.parse(data)));
}

/** Decodes and validates the payload; null when it is malformed. */
export function decodeIcsPayload(d: string | null | undefined): IcsData | null {
  if (!d || d.length > 4000) return null;
  try {
    const parsed = IcsPayload.safeParse(JSON.parse(fromBase64Url(d)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Link for the "Add to calendar" button: /api/ics?d=… */
export function icsHref(data: IcsData): string {
  return `/api/ics?d=${encodeIcsPayload(data)}`;
}

function gcalStamp(d: ISODate, hour: number, minute: number): string {
  const [y, m, day] = parts(d);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${y}${p(m)}${p(day)}T${p(hour)}${p(minute)}00`;
}

/**
 * "Google Calendar" button (A7): a prefilled event repeating nightly at 19:30 from the
 * first plan evening, once per chapter, linking to the plan. Floating time (no Z) means
 * the parent's own time zone.
 */
export function googleCalendarUrl(data: IcsData, opts: { baseUrl: string }): string {
  const parsed = IcsPayload.parse(data);
  const count = parsed.chapterDates.length;
  const plan = `${base(opts.baseUrl)}/event/${parsed.eventId}`;
  // Every evening is past: the one reminder left is "How did it go?" on the big day.
  const params =
    count === 0
      ? new URLSearchParams({
          action: 'TEMPLATE',
          text: `${PRODUCT}: How did it go?`,
          dates: `${gcalStamp(parsed.eventDate, CHECKIN_TIME.hour, CHECKIN_TIME.minute)}/${gcalStamp(parsed.eventDate, CHECKIN_TIME.hour, CHECKIN_TIME.minute + 15)}`,
          details: `How did ${parsed.label.trim()} go? Save a 30-second check-in: ${plan}/checkin`,
        })
      : new URLSearchParams({
          action: 'TEMPLATE',
          text: `${PRODUCT}: tonight's chapter`,
          dates: `${gcalStamp(parsed.chapterDates[0], CHAPTER_TIME.hour, CHAPTER_TIME.minute)}/${gcalStamp(parsed.chapterDates[0], CHAPTER_TIME.hour, CHAPTER_TIME.minute + 20)}`,
          details: `Tonight's chapter for ${parsed.label.trim()}: ${plan}`,
          recur: `RRULE:FREQ=DAILY;COUNT=${count}`,
        });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
