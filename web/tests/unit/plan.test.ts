import { describe, expect, it } from 'vitest';
import {
  buildChapters, canReadAhead, chapterCount, chapterStatus, countdownText, createEvent, eventPhase, homeFocusEvent,
  isChapterOpen, isQuickPrep, opensOnText, pageTargets, planChapters, readProgress, sortEventsForHome, tonightChapter,
  validateEventDate,
} from '@/lib/engine/plan';
import { BigEventSchema } from '@/lib/engine/schemas';
import { getTemplate } from '@/lib/engine/templates';
import { addDays } from '@/lib/engine/clock';
import type { BigEvent } from '@/lib/engine/types';

const T = '2026-11-15';
const dentist = getTemplate('dentist');
const make = (date: string, today = T, extra: Partial<Parameters<typeof createEvent>[0]> = {}) =>
  createEvent({ id: 'e1', childId: 'c1', type: 'dentist', date, today, fears: ['pain', 'strangers'], ...extra });

describe('plan by evenings (5.2)', () => {
  it.each([
    [5, 5, [['what_happens'], ['who_is_there'], ['what_i_do'], ['if_scared'], ['rehearsal']]],
    [4, 4, [['what_happens', 'who_is_there'], ['what_i_do'], ['if_scared'], ['rehearsal']]],
    [3, 3, [['what_happens', 'who_is_there'], ['what_i_do', 'if_scared'], ['rehearsal']]],
    [2, 2, [['what_happens', 'who_is_there', 'what_i_do'], ['if_scared', 'rehearsal']]],
    [1, 1, [['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal']]],
  ])('%i days ahead → %i chapters with the beat split', (days, n, beats) => {
    const plan = planChapters(addDays(T, days), T);
    expect(plan).toHaveLength(n);
    expect(plan.map((p) => p.beats)).toEqual(beats);
    expect(plan.map((p) => p.index)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
  });

  it('puts chapters on the evenings before the event', () => {
    const plan = planChapters('2026-11-20', T);
    expect(plan.map((p) => p.date)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
  });

  it('far ahead: still five chapters, the last evening before the event', () => {
    const plan = planChapters(addDays(T, 60), T);
    expect(plan).toHaveLength(5);
    expect(plan[4].date).toBe(addDays(T, 59));
    expect(chapterCount(addDays(T, 30), T)).toBe(5);
  });

  it('today: one quick prep chapter dated today', () => {
    const plan = planChapters(T, T);
    expect(plan).toEqual([{ index: 1, date: T, beats: ['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal'] }]);
    expect(isQuickPrep(T, T)).toBe(true);
    expect(isQuickPrep(addDays(T, 1), T)).toBe(true);
    expect(isQuickPrep(addDays(T, 2), T)).toBe(false);
  });

  it('tomorrow: one chapter tonight', () => {
    expect(planChapters(addDays(T, 1), T)).toEqual([
      { index: 1, date: T, beats: ['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal'] },
    ]);
  });

  it('validates the date', () => {
    expect(validateEventDate(addDays(T, -1), T)).toBe('past');
    expect(validateEventDate(addDays(T, 61), T)).toBe('too_far');
    expect(validateEventDate(addDays(T, 60), T)).toBe('ok');
    expect(validateEventDate(T, T)).toBe('ok');
    expect(() => make(addDays(T, -1))).toThrow();
  });

  it('titles and parent skills come from the template', () => {
    const ch = buildChapters(dentist, addDays(T, 5), T);
    expect(ch[0].title).toBe('What happens at the dentist');
    expect(ch[0].parentSkill).toBe(dentist.beats.what_happens.parentSkill);
    expect(ch.every((c) => c.pages.length === 0)).toBe(true);
    expect(buildChapters(dentist, T, T)[0].title).toBe('Quick prep for the dentist');
  });
});

describe('createEvent', () => {
  it('builds a valid event with mustAddress seeded by the fears', () => {
    const e = make('2026-11-20');
    expect(BigEventSchema.safeParse(e).success).toBe(true);
    expect(e.mustAddress).toEqual(['pain', 'strangers']);
    expect(e.templateVersion).toBe(dentist.version);
    expect(e.createdOn).toBe(T);
    expect(e.customLabel).toBeUndefined();
  });
  it('keeps at most 3 fears and the custom label only for Other', () => {
    const e = createEvent({
      id: 'e2', childId: 'c1', type: 'other', date: '2026-11-18', today: T,
      fears: ['pain', 'pain', 'unknown', 'social', 'body'], customLabel: '  Swimming lesson  ', customFear: 'the deep end',
    });
    expect(e.fears).toEqual(['pain', 'unknown', 'social']);
    expect(e.customLabel).toBe('Swimming lesson');
    expect(e.customFear).toBe('the deep end');
    expect(make('2026-11-20', T, { customLabel: 'x' }).customLabel).toBeUndefined();
  });
});

describe('chapter status (5.2)', () => {
  const e = make('2026-11-20');
  const [c1, c2, c3] = e.chapters;
  it('chapter 1 is open tonight, later ones locked or need payment', () => {
    expect(chapterStatus(c1, e, T, false)).toBe('today');
    expect(chapterStatus(c2, e, T, false)).toBe('needs_pay');
    expect(chapterStatus(c2, e, T, true)).toBe('locked');
  });
  it('chapter 1 is open even when its evening is weeks ahead', () => {
    const far = make(addDays(T, 30));
    expect(chapterStatus(far.chapters[0], far, T, false)).toBe('today');
    expect(isChapterOpen(far.chapters[0], far, T, false)).toBe(true);
  });
  it('today, catch up and read', () => {
    const d = '2026-11-17';
    expect(chapterStatus(c3, e, d, true)).toBe('today');
    expect(chapterStatus(c2, e, d, true)).toBe('catch_up');
    const read: BigEvent = { ...e, chapters: e.chapters.map((c) => (c.index === 2 ? { ...c, readOn: d } : c)) };
    expect(chapterStatus(read.chapters[1], read, d, false)).toBe('read');
  });
  it('read ahead: only the next locked chapter, only with access, only once', () => {
    expect(canReadAhead(c2, e, T, true)).toBe(true);
    expect(canReadAhead(c3, e, T, true)).toBe(false);
    expect(canReadAhead(c2, e, T, false)).toBe(false);
    expect(isChapterOpen(c2, e, T, true)).toBe(true);
    const ahead: BigEvent = { ...e, chapters: e.chapters.map((c) => (c.index <= 2 ? { ...c, readOn: T } : c)) };
    expect(canReadAhead(ahead.chapters[2], ahead, T, true)).toBe(false);
    expect(opensOnText(c3)).toBe('This chapter opens on Tuesday evening');
  });
});

describe('phase, countdown, tonight', () => {
  const e = make('2026-11-20');
  it('phase follows the date and the check-in (5.3)', () => {
    expect(eventPhase(e, T)).toBe('prep');
    expect(eventPhase(e, '2026-11-20')).toBe('day');
    expect(eventPhase(e, '2026-11-21')).toBe('after');
    expect(eventPhase({ ...e, checkin: { rating: 1, helped: [], didntHelp: [], savedOn: '2026-11-21' } }, '2026-11-21')).toBe('done');
  });
  it('countdown wording (4.6)', () => {
    expect(countdownText(e, dentist, T)).toBe('5 sleeps until the dentist');
    expect(countdownText(e, dentist, '2026-11-19')).toBe('Tomorrow is the big day');
    expect(countdownText(e, dentist, '2026-11-20')).toBe('Today is the big day');
    expect(countdownText(e, dentist, '2026-11-21')).toBeNull();
  });
  it('tonight is the earliest unread chapter due', () => {
    expect(tonightChapter(e, T)?.index).toBe(1);
    const read1: BigEvent = { ...e, chapters: e.chapters.map((c) => (c.index === 1 ? { ...c, readOn: T } : c)) };
    expect(tonightChapter(read1, T)).toBeNull();
    expect(tonightChapter(read1, '2026-11-18')?.index).toBe(2);
    expect(readProgress(read1)).toEqual({ read: 1, total: 5 });
  });
  it('page targets by age', () => {
    expect(pageTargets(3)).toEqual({ pages: 4, minWords: 40, maxWords: 60 });
    expect(pageTargets(6)).toEqual({ pages: 5, minWords: 60, maxWords: 90 });
    expect(pageTargets(8)).toEqual({ pages: 5, minWords: 90, maxWords: 130 });
  });
  it('home ordering and focus (4.4)', () => {
    const past = { ...make('2026-11-16', '2026-11-10'), id: 'past' };
    const later = { ...make('2026-12-01'), id: 'later' };
    expect(sortEventsForHome([later, past, e], '2026-11-17').map((x) => x.id)).toEqual(['e1', 'later', 'past']);
    expect(homeFocusEvent([later, past, e], '2026-11-17')?.id).toBe('past'); // after, no check-in yet
    expect(homeFocusEvent([later, e], '2026-11-20')?.id).toBe('e1');
    expect(homeFocusEvent([later, e], T)?.id).toBe('e1');
    expect(homeFocusEvent([], T)).toBeNull();
  });
});
