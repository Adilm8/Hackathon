import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/engine/clock';
import { buildSampleFamily } from '@/lib/engine/sample';
import type { BigEvent } from '@/lib/engine/types';
import { levelFor, LEVELS, STARS, streakWithRest, totalStars, weekStrip, weekSummary } from '@/lib/home/progress';

const today = '2026-11-15';
const doc = buildSampleFamily(today, { nowMs: 1 });
const base = doc.events[0].chapters[0];
const ev = (offsets: number[]) => ({
  chapters: offsets.map((o, i) => ({ ...base, index: i + 1, readOn: addDays(today, o) })),
  questions: [],
  checkin: undefined,
});

describe('streak with a rest evening', () => {
  it('counts a plain run, today or up to yesterday', () => {
    expect(streakWithRest([ev([0, -1, -2])], today)).toEqual({ count: 3, rested: [] });
    expect(streakWithRest([ev([-1, -2])], today).count).toBe(2);
    expect(streakWithRest([ev([])], today).count).toBe(0);
  });

  it('forgives one missed evening, but not two in a row', () => {
    const one = streakWithRest([ev([0, -2, -3])], today);
    expect(one).toEqual({ count: 3, rested: [addDays(today, -1)] });
    expect(streakWithRest([ev([0, -3, -4])], today).count).toBe(1);
  });

  it('keeps the run when yesterday was missed and tonight is not read yet', () => {
    expect(streakWithRest([ev([-2, -3])], today)).toEqual({ count: 2, rested: [addDays(today, -1)] });
  });

  it('forgives at most one evening within seven', () => {
    const s = streakWithRest([ev([0, -2, -4, -5])], today);
    expect(s.rested).toHaveLength(1);
    expect(s.count).toBe(2);
  });
});

describe('week strip', () => {
  it('shows seven evenings ending today with read, rest, missed and tonight', () => {
    const w = weekStrip([ev([-2, -3, -6])], today);
    expect(w).toHaveLength(7);
    expect(w.at(-1)).toMatchObject({ date: today, state: 'tonight' });
    expect(w.at(-2)!.state).toBe('rest');
    expect(w.at(-3)!.state).toBe('read');
    expect(w[1].state).toBe('missed');
    expect(w[0].state).toBe('read');
    expect(w[0].letter).toHaveLength(1);
  });
});

describe('stars and levels', () => {
  it('adds stars for chapters, questions, check-ins and badges', () => {
    const e = { ...ev([0, -1]), questions: [{ askedOn: today }] as unknown as BigEvent['questions'], checkin: { rating: 1 as const, helped: [], didntHelp: [], savedOn: today } };
    const child = { badges: [{ id: 'b', label: 'x', eventType: 'dentist' as const, eventId: 'e', earnedOn: today }] };
    expect(totalStars([e], child)).toBe(2 * STARS.chapter + STARS.question + STARS.checkin + STARS.badge);
    expect(weekSummary([e], child, today)).toEqual({ evenings: 2, chapters: 2, questions: 1, stars: 75, badges: 1 });
  });

  it('names a level and the progress to the next one', () => {
    expect(levelFor(0)).toMatchObject({ number: 1, next: LEVELS[1].min, progress: 0 });
    const l = levelFor(55);
    expect(l.number).toBe(2);
    expect(l.progress).toBeCloseTo(0.5);
    const top = levelFor(10_000);
    expect(top.number).toBe(LEVELS.length);
    expect(top.next).toBeUndefined();
    expect(top.progress).toBe(1);
  });

  it('works on the sample family', () => {
    expect(totalStars(doc.events, doc.child!)).toBeGreaterThan(0);
  });
});
