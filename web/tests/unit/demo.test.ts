import { describe, expect, it } from 'vitest';
import { demoEvent, isDemoAccess, timeTravelDate, tourSteps } from '@/lib/demo/demo';
import { buildSampleFamily } from '@/lib/engine/sample';
import type { Entitlement } from '@/lib/engine/types';

const T = '2026-11-15';
const doc = buildSampleFamily(T, { nowMs: 1 });
const dentist = doc.events.find((e) => e.type === 'dentist')!;
const NOW = 1_000_000;
const demoRow: Entitlement = { plan: 'year', expiresAt: NOW + 86_400_000, renews: false };

describe('Demo bar time travel (5.1)', () => {
  it('moves today to evening 2, the event day and the day after; back to today removes the override', () => {
    expect(timeTravelDate(dentist, 'evening2')).toBe(dentist.chapters[1].date);
    expect(timeTravelDate(dentist, 'day')).toBe('2026-11-20');
    expect(timeTravelDate(dentist, 'after')).toBe('2026-11-21');
    expect(timeTravelDate(dentist, 'today')).toBeUndefined();
  });
  it('a one-chapter plan uses its only chapter for evening 2', () => {
    const one = { ...dentist, chapters: dentist.chapters.slice(0, 1) };
    expect(timeTravelDate(one, 'evening2')).toBe(dentist.chapters[0].date);
  });
  it('works on the event on screen, else the upcoming one', () => {
    expect(demoEvent(doc.events, T)?.id).toBe(dentist.id);
    const haircut = doc.events.find((e) => e.type === 'haircut')!;
    expect(demoEvent(doc.events, T, haircut.id)?.id).toBe(haircut.id);
    expect(demoEvent(doc.events, '2027-01-01')?.id).toBe(dentist.id);
    expect(demoEvent([], T)).toBeUndefined();
  });
});

describe('demo access badge (4.3)', () => {
  it('is a non-renewing year row of a sample family', () => {
    expect(isDemoAccess('sample', [demoRow], NOW)).toBe(true);
    expect(isDemoAccess('real', [demoRow], NOW)).toBe(false);
    expect(isDemoAccess('sample', [{ ...demoRow, renews: true }], NOW)).toBe(false);
    expect(isDemoAccess('sample', [{ ...demoRow, expiresAt: NOW - 1 }], NOW)).toBe(false);
  });
});

describe('guided tour (4.3)', () => {
  it('starts with nothing ticked in a fresh sample', () => {
    const steps = tourSteps(dentist, [], NOW, {});
    expect(steps.map((s) => s.id)).toEqual(['read', 'ask', 'panel', 'unlock', 'day', 'after']);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps.find((s) => s.id === 'day')?.time).toBe('day');
    expect(steps.find((s) => s.id === 'after')?.href).toMatch(/\/checkin$/);
  });
  it('ticks from the family data', () => {
    const read = {
      ...dentist,
      chapters: dentist.chapters.map((c) => (c.index === 1 ? { ...c, readOn: T } : c)),
      questions: [{ id: 'q1', chapter: 1, afterPageId: 'p1', text: 'Will it hurt?', source: 'button' as const, category: 'on_topic' as const, topic: 'pain' as const, answeredInStory: false, askedOn: T }],
      checkin: { rating: 1 as const, helped: [], didntHelp: [], savedOn: '2026-11-21' },
    };
    const steps = tourSteps(read, [demoRow], NOW, { panel: true });
    expect(steps.filter((s) => s.done).map((s) => s.id)).toEqual(['read', 'ask', 'panel', 'unlock', 'after']);
    expect(steps.find((s) => s.id === 'after')?.href).toMatch(/\/badge$/);
  });
});
