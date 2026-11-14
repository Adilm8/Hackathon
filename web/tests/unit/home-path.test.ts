import { describe, expect, it } from 'vitest';
import { buildSampleFamily } from '@/lib/engine/sample';
import { addDays } from '@/lib/engine/clock';
import { buildPath, currentNodeIndex, readingStreak, todayTasks } from '@/lib/home/path';

const today = '2026-11-15';
const doc = buildSampleFamily(today, { nowMs: 1 });
const upcoming = doc.events.find((e) => e.date > today)!;

describe('home story path', () => {
  it('lists chapters, then the big day, check-in and badge', () => {
    const nodes = buildPath(upcoming, today, false);
    expect(nodes.map((n) => n.kind)).toEqual([...upcoming.chapters.map(() => 'chapter'), 'day', 'checkin', 'badge']);
    expect(nodes.at(-1)!.state).toBe('locked');
    expect(nodes.at(-1)!.href).toBeUndefined();
  });

  it('puts the Start bubble on the first chapter not read yet and sends chapter 2 to the paywall without access', () => {
    const fresh = { ...upcoming, chapters: upcoming.chapters.map((c) => ({ ...c, readOn: undefined })) };
    const nodes = buildPath(fresh, today, false);
    expect(currentNodeIndex(nodes)).toBe(0);
    expect(nodes[0].href).toBe(`/event/${fresh.id}/read/1`);
    const read1 = { ...fresh, chapters: fresh.chapters.map((c) => (c.index === 1 ? { ...c, readOn: today } : c)) };
    const n2 = buildPath(read1, today, false);
    expect(n2[0].state).toBe('done');
    if (n2[1].kind === 'chapter' && read1.chapters.length > 1) expect(['pay', 'locked']).toContain(n2[1].state);
  });

  it('counts evenings in a row, today or up to yesterday', () => {
    const ev = (dates: string[]) => ({ chapters: dates.map((d, i) => ({ ...upcoming.chapters[0], index: i + 1, readOn: d })) });
    expect(readingStreak([ev([addDays(today, -2), addDays(today, -1)])], today)).toBe(2);
    expect(readingStreak([ev([addDays(today, -1), today])], today)).toBe(2);
    expect(readingStreak([ev([addDays(today, -3)])], today)).toBe(0);
  });

  it('offers reading and a question tonight', () => {
    const fresh = { ...upcoming, chapters: upcoming.chapters.map((c) => ({ ...c, readOn: undefined })), questions: [] };
    const tasks = todayTasks(fresh, today);
    expect(tasks.map((t) => t.key)).toEqual(['read', 'ask']);
    expect(tasks.every((t) => !t.done)).toBe(true);
  });
});
