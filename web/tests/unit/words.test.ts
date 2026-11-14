import { describe, expect, it } from 'vitest';
import { estimateWordStarts, mapWordIndex, splitWords, wordAtChar, wordAtTime } from '@/lib/speech/words';

describe('read-along word timing', () => {
  it('splits a sentence into words with their offsets', () => {
    expect(splitWords('Soon Max will  go.')).toEqual([
      { text: 'Soon', start: 0 },
      { text: 'Max', start: 5 },
      { text: 'will', start: 9 },
      { text: 'go.', start: 15 },
    ]);
  });

  it('finds the word at a boundary char offset', () => {
    const w = splitWords('First, I wait in the room.');
    expect(wordAtChar(w, 0)).toBe(0);
    expect(wordAtChar(w, 7)).toBe(1);
    expect(wordAtChar(w, 9)).toBe(2);
    expect(wordAtChar(w, 99)).toBe(w.length - 1);
  });

  it('maps a spoken word to the shown word when a name is spoken differently', () => {
    expect(mapWordIndex(2, 5, 5)).toBe(2);
    expect(mapWordIndex(0, 6, 5)).toBe(0);
    expect(mapWordIndex(5, 6, 5)).toBe(4);
    expect(mapWordIndex(9, 3, 3)).toBe(2);
    expect(mapWordIndex(0, 0, 0)).toBe(0);
  });

  it('estimates growing start times, slower at a lower rate, with a pause after a comma', () => {
    const w = splitWords('First, Max waits.');
    const a = estimateWordStarts(w, 1);
    expect(a[0]).toBe(0);
    expect(a[1]).toBeGreaterThan(a[0]);
    expect(a[2]).toBeGreaterThan(a[1]);
    const slow = estimateWordStarts(w, 0.5);
    expect(slow[2]).toBeGreaterThan(a[2]);
    const noComma = estimateWordStarts(splitWords('First Max waits.'), 1);
    expect(a[1] - noComma[1]).toBe(220);
    expect(wordAtTime(a, 0)).toBe(0);
    expect(wordAtTime(a, a[2] + 1)).toBe(2);
  });
});
