import { describe, expect, it } from 'vitest';
import { buildSampleFamily, SAMPLE_IDS } from '@/lib/engine/sample';
import { FamilyDocSchema } from '@/lib/engine/schemas';
import { chapterStatus, countdownText, eventPhase } from '@/lib/engine/plan';
import { summarise } from '@/lib/engine/topics';
import { getTemplate } from '@/lib/engine/templates';

const T = '2026-11-15';

describe('sample family (4.3)', () => {
  const doc = buildSampleFamily(T, { nowMs: 1 });
  const [haircut, dentist] = doc.events;
  it('is a valid family document', () => {
    const r = FamilyDocSchema.safeParse(doc);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    expect(doc.updatedAt).toBe(1);
    expect(doc.child).toMatchObject({ name: 'Max', age: 4, character: { animal: 'bunny', color: 'blue', accessory: 'cap' } });
    expect(doc.child?.values.family).toEqual(['Mom', 'Dad']);
  });
  it('past haircut three weeks ago with check-in, memory and a badge', () => {
    expect(haircut.id).toBe(SAMPLE_IDS.pastEvent);
    expect(haircut.date).toBe('2026-10-25');
    expect(eventPhase(haircut, T)).toBe('done');
    expect(haircut.checkin).toMatchObject({ rating: 2, helped: ['count_to_ten'], didntHelp: ['cape_at_home'] });
    expect(haircut.chapters.every((c) => c.readOn && c.pages.length > 0)).toBe(true);
    expect(haircut.ritual?.source).toBe('fallback');
    expect(doc.child?.badges).toHaveLength(1);
  });
  it('upcoming dentist in five days, chapter 1 tonight, memory visible in the panel', () => {
    expect(dentist.date).toBe('2026-11-20');
    expect(dentist.fears).toEqual(['pain', 'strangers']);
    expect(dentist.chapters).toHaveLength(5);
    expect(chapterStatus(dentist.chapters[0], dentist, T, false)).toBe('today');
    expect(chapterStatus(dentist.chapters[1], dentist, T, false)).toBe('needs_pay');
    expect(countdownText(dentist, getTemplate('dentist'), T)).toBe('5 sleeps until the dentist');
    const s = summarise(dentist, doc.child, getTemplate('dentist'), T);
    expect(s.memoryLines[0]).toBe('Last time: counting to ten helped (haircut, Oct 25)');
    expect(s.dayTechnique.id).toBe('count_to_ten');
  });
  it('is deterministic for a given day', () => {
    expect(buildSampleFamily(T, { nowMs: 1 })).toEqual(doc);
  });
});
