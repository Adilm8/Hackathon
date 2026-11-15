import { describe, expect, it } from 'vitest';
import { buildSampleFamily } from '@/lib/engine/sample';
import { clockText, libraryItems, ROUTINE, routineSteps } from '@/lib/home/library';

const today = '2026-11-15';
const doc = buildSampleFamily(today, { nowMs: 1 });

describe('story library', () => {
  it('lists only chapters read, newest first, with favourites marked', () => {
    const items = libraryItems(doc.events, []);
    const readCount = doc.events.flatMap((e) => e.chapters.filter((c) => c.readOn && c.pages.length)).length;
    expect(items).toHaveLength(readCount);
    for (let i = 1; i < items.length; i++) expect(items[i - 1].readOn >= items[i].readOn).toBe(true);
    if (items[0]) expect(libraryItems(doc.events, [items[0].key])[0].favorite).toBe(true);
  });
});

describe('bedtime routine', () => {
  it('drops the steps switched off and formats the clock', () => {
    expect(routineSteps(['bath']).map((s) => s.id)).toEqual(ROUTINE.slice(1).map((s) => s.id));
    expect(clockText(245_000)).toBe('4:05');
    expect(clockText(-5)).toBe('0:00');
  });
});
