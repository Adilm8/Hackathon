import { describe, expect, it } from 'vitest';
import { addMark, markAt, takeHasPage, timeFor, type TakeMark } from '@/lib/speech/chapterTake';
import { levelFromRms } from '@/lib/speech/recorder';

const marks: TakeMark[] = [
  { pageId: 'a', step: 0, t: 0 },
  { pageId: 'a', step: 1, t: 4 },
  { pageId: 'b', step: 0, t: 9 },
  { pageId: 'b', step: 2, t: 15 },
];

describe('chapter take marks', () => {
  it('adds a mark only when the sentence changes, never going back in time', () => {
    let m: TakeMark[] = [];
    m = addMark(m, { pageId: 'a', step: 0, t: 0 });
    m = addMark(m, { pageId: 'a', step: 0, t: 2 });
    m = addMark(m, { pageId: 'a', step: 1, t: 1 });
    expect(m).toEqual([{ pageId: 'a', step: 0, t: 0 }, { pageId: 'a', step: 1, t: 1 }]);
    expect(addMark(m, { pageId: 'b', step: 0, t: 0.5 })[2].t).toBe(1);
  });
  it('finds the mark playing at a time', () => {
    expect(markAt(marks, 0)).toEqual(marks[0]);
    expect(markAt(marks, 5)).toEqual(marks[1]);
    expect(markAt(marks, 9)).toEqual(marks[2]);
    expect(markAt(marks, 99)).toEqual(marks[3]);
    expect(markAt([], 3)).toBeNull();
  });
  it('finds where to start for a page and sentence', () => {
    expect(timeFor(marks, 'a', 1)).toBe(4);
    expect(timeFor(marks, 'b', 1)).toBe(9); // sentence not marked: the page's earlier mark
    expect(timeFor(marks, 'zz', 0)).toBe(0);
    expect(takeHasPage(marks, 'b')).toBe(true);
    expect(takeHasPage(marks, 'c')).toBe(false);
  });
  it('maps microphone loudness to a 0..1 meter', () => {
    expect(levelFromRms(0)).toBe(0);
    expect(levelFromRms(0.001)).toBe(0);
    expect(levelFromRms(0.05)).toBeGreaterThan(0.5);
    expect(levelFromRms(1)).toBe(1);
  });
});
