import { beforeEach, describe, expect, it } from 'vitest';
import { buildSampleFamily } from '@/lib/engine/sample';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { getFamilyDoc, replaceFamilyDoc, subscribeFamily } from '@/lib/store/family';

const today = '2026-11-15';

describe('browser stores (screens stream)', () => {
  beforeEach(() => {
    useChild.getState().clear();
    useEvents.getState().clear();
  });

  it('round-trips the family document without notifying sync on replace', () => {
    const doc = buildSampleFamily(today, { nowMs: 1 });
    let calls = 0;
    const off = subscribeFamily(() => calls++);
    replaceFamilyDoc(doc);
    expect(calls).toBe(0);
    const out = getFamilyDoc();
    expect(out.child?.name).toBe('Max');
    expect(out.events).toHaveLength(doc.events.length);
    useChild.getState().updateChild({ age: 5 });
    expect(calls).toBe(1);
    expect(getFamilyDoc().updatedAt).toBeGreaterThan(1);
    off();
  });

  it('stores a chapter once, records questions through the engine and enforces the limit', () => {
    const doc = buildSampleFamily(today, { nowMs: 1 });
    replaceFamilyDoc(doc);
    const ev = doc.events.find((e) => e.date > today)!;
    const st = useEvents.getState();
    const page = { sentences: [{ text: 'At the dentist [[CHILD]] sits in a big chair.', kind: 'describe' as const }, { text: 'It might tickle.', kind: 'describe' as const }], mood: 'calm' as const, background: 'dentist', addresses: [] };
    st.applyChapter(ev.id, 1, { pages: [page, page, page], source: 'fallback' }, today);
    st.applyChapter(ev.id, 1, { pages: [page], source: 'llm' }, today);
    const ch = useEvents.getState().events.find((e) => e.id === ev.id)!.chapters[0];
    expect(ch.pages).toHaveLength(3);
    const ask = (n: number) =>
      useEvents.getState().recordQuestion(ev.id, { id: `q${n}`, chapter: 1, afterPageId: ch.pages[0].id, text: 'Will it hurt?', source: 'custom', category: 'on_topic', topic: 'pain' }, today);
    expect(ask(1).ok).toBe(true);
    expect(ask(2).ok).toBe(true);
    expect(ask(3).ok).toBe(true);
    expect(ask(4)).toEqual({ ok: false, error: 'limit' });
    st.insertAnswer(ev.id, 1, { questionId: 'q1', afterPageId: ch.pages[0].id, sentences: [{ text: 'It may tickle.', kind: 'describe' }], source: 'llm' });
    const pages = useEvents.getState().events.find((e) => e.id === ev.id)!.chapters[0].pages;
    expect(pages[1].kind).toBe('answer');
  });
});
