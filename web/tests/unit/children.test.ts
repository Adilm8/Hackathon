import { describe, expect, it } from 'vitest';
import { buildSampleChild, buildSampleFamily, buildSampleSibling } from '@/lib/engine/sample';
import { BigEventSchema, ChildProfileSchema } from '@/lib/engine/schemas';
import { childChoices, eventsOfChild, profileToChild, swapChildren } from '@/lib/store/children';
import { toSaved } from '@/lib/store/profiles';

const today = '2026-11-15';
const max = buildSampleChild(today);
const { child: mia, event: miaEvent } = buildSampleSibling(today);
const doc = buildSampleFamily(today, { nowMs: 1 });
const events = [...doc.events, miaEvent];

describe('several children on one device', () => {
  it('the sample sister is a valid child with a valid big day', () => {
    expect(ChildProfileSchema.safeParse(mia).success).toBe(true);
    expect(BigEventSchema.safeParse(miaEvent).success).toBe(true);
    expect(miaEvent.childId).toBe(mia.id);
  });

  it('lists the active child first, then the others, without duplicates', () => {
    const c = childChoices(max, [mia], events, [toSaved(mia, 1), toSaved(max, 1)]);
    expect(c.map((x) => [x.name, x.active])).toEqual([['Max', true], ['Mia', false]]);
  });

  it('offers a saved child only when they have a big day here', () => {
    const leo = { ...toSaved(mia, 1), childId: 'leo', name: 'Leo' };
    expect(childChoices(max, [], events, [leo]).map((x) => x.name)).toEqual(['Max']);
    expect(childChoices(max, [], [...events, { childId: 'leo' }], [leo]).map((x) => x.name)).toEqual(['Max', 'Leo']);
  });

  it('shows each child only their own big days, and keeps unknown ones with the active child', () => {
    const known = new Set([max.id, mia.id]);
    expect(eventsOfChild(events, mia.id, known).map((e) => e.id)).toEqual([miaEvent.id]);
    expect(eventsOfChild(events, max.id, known)).toHaveLength(doc.events.length);
    const legacy = [...events, { ...miaEvent, id: 'old', childId: 'gone' }];
    expect(eventsOfChild(legacy, max.id, known).map((e) => e.id)).toContain('old');
  });

  it('swapping keeps the previous child with badges in the roster', () => {
    const maxWithBadge = { ...max, badges: [{ id: 'b', label: 'Snip', eventType: 'haircut' as const, eventId: 'h', earnedOn: today }] };
    const s = swapChildren(maxWithBadge, [mia], mia);
    expect(s.active.id).toBe(mia.id);
    expect(s.others).toEqual([maxWithBadge]);
    const back = swapChildren(s.active, s.others, maxWithBadge);
    expect(back.active.badges).toHaveLength(1);
    expect(back.others.map((c) => c.id)).toEqual([mia.id]);
  });

  it('builds a full child from a saved profile', () => {
    const c = profileToChild(toSaved(mia, 1), today);
    expect(ChildProfileSchema.safeParse(c).success).toBe(true);
    expect(c.badges).toEqual([]);
  });
});
