import { describe, expect, it } from 'vitest';
import { buildIcs, decodeIcsPayload, encodeIcsPayload, googleCalendarUrl, icsHref } from '@/lib/engine/ics';

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
