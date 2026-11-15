import { describe, expect, it } from 'vitest';
import { buildSampleFamily } from '@/lib/engine/sample';
import { computeReminders, DEFAULT_REMINDERS, dueNow, inQuiet, localTime, minutesOf } from '@/lib/push/reminders';

const today = '2026-11-15';
const doc = buildSampleFamily(today, { nowMs: 1 });
const at = (d: string, h: number, m: number) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)), h, m).getTime();

describe('reminder times', () => {
  it('reads HH:MM and quiet hours across midnight', () => {
    expect(minutesOf('18:30')).toBe(1110);
    expect(Number.isNaN(minutesOf('25:00'))).toBe(true);
    expect(inQuiet(minutesOf('22:00'), DEFAULT_REMINDERS)).toBe(true);
    expect(inQuiet(minutesOf('06:00'), DEFAULT_REMINDERS)).toBe(true);
    expect(inQuiet(minutesOf('18:30'), DEFAULT_REMINDERS)).toBe(false);
  });

  it('moves a reminder inside quiet hours to their end', () => {
    expect(localTime(today, '21:00', DEFAULT_REMINDERS)).toBe(at('2026-11-16', 7, 30));
    expect(localTime(today, '06:00', DEFAULT_REMINDERS)).toBe(at(today, 7, 30));
    expect(localTime(today, '18:30', DEFAULT_REMINDERS)).toBe(at(today, 18, 30));
  });

  it('plans the evening chapters, the big day morning and the check-in, without the child name', () => {
    const r = computeReminders(doc.events, today, at(today, 12, 0));
    const dentist = doc.events.find((e) => e.date > today)!;
    expect(r.some((x) => x.kind === 'chapter' && x.url.endsWith('/read/1') && x.at === at(today, 18, 30))).toBe(true);
    expect(r.some((x) => x.id === `${dentist.id}:day` && x.at === at(dentist.date, 8, 0))).toBe(true);
    expect(r.some((x) => x.id === `${dentist.id}:checkin`)).toBe(true);
    expect(r.every((x) => !/Max/.test(`${x.title} ${x.body}`))).toBe(true);
    for (let i = 1; i < r.length; i++) expect(r[i].at).toBeGreaterThanOrEqual(r[i - 1].at);
  });

  it('shows the in-app reminder once its time has come today', () => {
    const r = computeReminders(doc.events, today, at(today, 12, 0));
    expect(dueNow(r, at(today, 12, 0), today)).toBeNull();
    expect(dueNow(r, at(today, 19, 0), today)?.kind).toBe('chapter');
  });
});
