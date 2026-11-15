import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/engine/clock';
import { buildSampleFamily } from '@/lib/engine/sample';
import { CheckinSchema } from '@/lib/engine/schemas';
import { saveCheckin } from '@/lib/engine/state';
import type { Badge, BigEvent, EventType } from '@/lib/engine/types';
import {
  achievementSummary, badgeLevels, braveMomentCounts, cleanBraveMoments, collections, journeyAchievements, longestRun,
} from '@/lib/home/achievements';
import { EVENT_GROUPS } from '@/lib/engine/templates';

const today = '2026-11-15';
const doc = buildSampleFamily(today, { nowMs: 1 });
const sample = doc.events[0];
const chapter = sample.chapters[0];

function ev(over: Partial<BigEvent> & { reads?: number[] } = {}): BigEvent {
  const { reads = [], ...rest } = over;
  return {
    ...sample,
    id: `e${Math.random().toString(36).slice(2, 8)}`,
    chapters: reads.map((o, i) => ({ ...chapter, index: i + 1, beats: i === reads.length - 1 ? ['rehearsal'] : ['what_happens'], readOn: addDays(today, o) })),
    questions: [],
    checkin: undefined,
    ...rest,
  };
}
const badge = (eventType: EventType, n = 0): Badge => ({ id: `b${n}`, label: 'x', eventType, eventId: `e${n}`, earnedOn: today });

describe('journey achievements', () => {
  it('starts with nothing earned', () => {
    const a = journeyAchievements([]);
    expect(a).toHaveLength(12);
    expect(a.every((x) => !x.earned && x.value === 0)).toBe(true);
  });

  it('counts the longest run of evenings, not only the current one', () => {
    expect(longestRun([ev({ reads: [-10, -9, -8, -2] })])).toBe(3);
    const a = journeyAchievements([ev({ reads: [-10, -9, -8, -2] })]);
    expect(a.find((x) => x.id === 'three_nights')!.earned).toBe(true);
    expect(a.find((x) => x.id === 'week_reader')!.value).toBe(3);
  });

  it('gives Practice Pro and Ready Star when chapters were read before the big day', () => {
    const e = ev({ date: today, reads: [-2, -1] });
    const a = journeyAchievements([e]);
    expect(a.find((x) => x.id === 'practise')!.earned).toBe(true);
    expect(a.find((x) => x.id === 'ready_star')!.earned).toBe(true);
    const late = ev({ date: addDays(today, -5), reads: [-2, -1] });
    expect(journeyAchievements([late]).find((x) => x.id === 'ready_star')!.earned).toBe(false);
  });

  it('gives Try Again Hero after a hard big day of the same type is done again', () => {
    const hard = ev({ type: 'dentist', date: addDays(today, -60), checkin: { rating: 3, helped: [], didntHelp: [], savedOn: addDays(today, -60) } });
    const again = ev({ type: 'dentist', date: addDays(today, -1), checkin: { rating: 1, helped: [], didntHelp: [], savedOn: addDays(today, -1) } });
    expect(journeyAchievements([hard]).find((x) => x.id === 'try_again')!.earned).toBe(false);
    expect(journeyAchievements([again, hard]).find((x) => x.id === 'try_again')!.earned).toBe(true);
  });
});

describe('badge levels and collections', () => {
  it('levels a badge up at 3 and 5 of the same type', () => {
    const lv = (n: number) => badgeLevels({ badges: Array.from({ length: n }, (_, i) => badge('dentist', i)) })[0];
    expect(lv(1)).toMatchObject({ tier: 'bronze', toNext: 2 });
    expect(lv(3)).toMatchObject({ tier: 'silver', toNext: 2 });
    expect(lv(5)).toMatchObject({ tier: 'gold', toNext: undefined });
  });

  it('builds one shelf per picker group and marks a full shelf', () => {
    const growing = EVENT_GROUPS.find((g) => g.id === 'growing')!;
    const shelves = collections({ badges: growing.types.map((t, i) => badge(t, i)) });
    expect(shelves).toHaveLength(EVENT_GROUPS.length);
    expect(shelves.find((c) => c.id === 'growing')).toMatchObject({ name: 'Growing Up', done: true });
    expect(shelves.find((c) => c.id === 'health')!.done).toBe(false);
  });

  it('summary counts earned out of total', () => {
    const s = achievementSummary([ev({ reads: [0] })], { badges: [] });
    expect(s.total).toBe(12 + EVENT_GROUPS.length);
    expect(s.earned).toBe(1);
  });
});

describe('brave-moment stickers', () => {
  it('keeps known ids, no repeats, at most two', () => {
    expect(cleanBraveMoments(['said_hello', 'said_hello', 'nope', 'held_still', 'tried_new'])).toEqual(['said_hello', 'held_still']);
  });

  it('are saved with the check-in, validated by the schema, and counted', () => {
    const child = doc.child;
    const r = saveCheckin({ event: sample, child, input: { rating: 1, helped: [], didntHelp: [], brave: ['said_hello', 'deep_breather', 'kind_helper'] }, today });
    expect(r.event.checkin!.brave).toEqual(['said_hello', 'deep_breather']);
    expect(CheckinSchema.safeParse(r.event.checkin).success).toBe(true);
    expect(braveMomentCounts([r.event, r.event]).map((m) => [m.id, m.count])).toEqual([['deep_breather', 2], ['said_hello', 2]]);
  });
});
