import { describe, expect, it } from 'vitest';
import { buildIcs, decodeIcsPayload, encodeIcsPayload, googleCalendarUrl, icsHref, upcomingReminders } from '@/lib/engine/ics';

const data = { label: 'Dentist visit', eventId: 'e1', chapterDates: ['2026-11-15', '2026-11-16', '2026-11-17'], eventDate: '2026-11-18' };

describe('calendar file (11.8)', () => {
  const ics = buildIcs(data, { baseUrl: 'https://bds.example/', stampMs: Date.UTC(2026, 10, 14, 12) });
  it('one event per evening at 19:30 floating, plus the check-in at 19:00', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics).toContain('DTSTART:20261115T193000\r\n');
    expect(ics).toContain('DTSTART:20261117T193000\r\n');
    expect(ics).toContain('DTSTART:20261118T190000\r\n');
    expect(ics).not.toMatch(/DTSTART:[0-9T]+Z/);
    expect(ics).toContain("SUMMARY:Big Day Stories: tonight's chapter 2 of 3");
    expect(ics).toContain('SUMMARY:Big Day Stories: How did it go?');
    expect(ics).toContain('URL:https://bds.example/event/e1/read/1');
    expect(ics).toContain('DTSTAMP:20261114T120000Z');
    expect(ics.match(/TRIGGER:PT0M/g)).toHaveLength(4);
    expect(ics).not.toContain('TRIGGER:-PT\r\n');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
  it('payload round trip and rejection', () => {
    const d = encodeIcsPayload(data);
    expect(d).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeIcsPayload(d)).toEqual(data);
    expect(decodeIcsPayload('not-base64!')).toBeNull();
    expect(decodeIcsPayload(encodeIcsPayload({ ...data, label: 'Café ✈️' }))?.label).toBe('Café ✈️');
    expect(decodeIcsPayload(null)).toBeNull();
    expect(icsHref(data).startsWith('/api/ics?d=')).toBe(true);
  });
  it('Google Calendar link repeats nightly once per chapter', () => {
    const url = new URL(googleCalendarUrl(data, { baseUrl: 'https://bds.example' }));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261115T193000/20261115T195000');
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY;COUNT=3');
    expect(url.searchParams.get('details')).toContain('https://bds.example/event/e1');
  });
});

describe('only reminders still ahead (usability pass: 19:30 already past)', () => {
  const local = (d: string, h: number, m = 0) => {
    const [y, mo, day] = d.split('-').map(Number);
    return new Date(y, mo - 1, day, h, m);
  };
  it('keeps tonight before 19:30', () => {
    const r = upcomingReminders(data, local('2026-11-15', 19, 29));
    expect(r.chapterDates).toEqual(data.chapterDates);
    expect(r.firstChapter).toBeUndefined();
    expect(r.skipCheckin).toBeUndefined();
  });
  it('drops tonight after 19:30 and keeps the real chapter numbers', () => {
    const r = upcomingReminders(data, local('2026-11-15', 21, 0));
    expect(r.chapterDates).toEqual(['2026-11-16', '2026-11-17']);
    expect(r.firstChapter).toBe(2);
    const ics = buildIcs(r, { baseUrl: 'https://bds.example', stampMs: 0 });
    expect(ics).not.toContain('DTSTART:20261115T193000');
    expect(ics).toContain("SUMMARY:Big Day Stories: tonight's chapter 2 of 3");
    expect(ics).toContain('URL:https://bds.example/event/e1/read/3');
    expect(decodeIcsPayload(encodeIcsPayload(r))).toEqual(r);
  });
  it('after every evening: only the check-in; after 19:00 on the day: nothing', () => {
    const r = upcomingReminders(data, local('2026-11-18', 10));
    expect(r.chapterDates).toEqual([]);
    expect(buildIcs(r, { baseUrl: 'https://x', stampMs: 0 }).match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(new URL(googleCalendarUrl(r, { baseUrl: 'https://x' })).searchParams.get('dates')).toBe('20261118T190000/20261118T191500');
    expect(upcomingReminders(data, local('2026-11-18', 19, 5)).skipCheckin).toBe(true);
  });
});
