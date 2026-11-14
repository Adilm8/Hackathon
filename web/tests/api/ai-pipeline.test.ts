import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDb } from '@/lib/db/client';
import { getTemplate } from '@/lib/engine/templates';
import type { StoryContext } from '@/lib/engine/types';
import { resetBreaker } from '@/lib/llm/breaker';
import { resetBudget, recordCall, spentToday } from '@/lib/server/budget';
import { resetCache } from '@/lib/server/cache';
import { resetRateLimits } from '@/lib/server/ratelimit';

// The mock provider's writer is replaced per test, so the real pipeline sees "model" output we choose.
const h = vi.hoisted(() => ({ chapter: null as null | (() => unknown), answer: null as null | (() => unknown) }));
vi.mock('@/lib/llm/mock', async (orig) => {
  const real = await orig<typeof import('@/lib/llm/mock')>();
  return {
    ...real,
    mockChapter: (...a: Parameters<typeof real.mockChapter>) => (h.chapter ? h.chapter() : real.mockChapter(...a)),
    mockAnswer: (...a: Parameters<typeof real.mockAnswer>) => (h.answer ? h.answer() : real.mockAnswer(...a)),
  };
});

const { generateChapter } = await import('@/lib/llm/chapter');
const { answerQuestion } = await import('@/lib/llm/answer');

afterAll(closeDb);
beforeEach(() => {
  h.chapter = null;
  h.answer = null;
  resetBreaker();
  resetCache();
  resetBudget();
  resetRateLimits();
});

const ctx: StoryContext = {
  event: { type: 'dentist', fears: ['pain'], templateVersion: 1 },
  child: { age: 4, character: { animal: 'bunny', color: 'blue', accessory: 'cap' } },
  values: { tone: 'secular', bodyWords: 'anatomical', family: ['Mom'] },
  styleMode: 'story',
  chapter: { index: 1, total: 5, beats: ['what_happens'] },
  mustAddress: ['pain'],
  askedQuestions: [],
  usedTechniques: [],
  helpedBefore: [],
  avoid: [],
  previousSummaries: [],
  placeCaptions: [],
};
const template = getTemplate('dentist');

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

const page = (text: string, addresses: string[] = []) => ({
  sentences: [
    { text, kind: 'describe' },
    { text: 'The dentist counts teeth with a tiny mirror and says hello to every single one of them, very gently.', kind: 'describe' },
    { text: '[[CHILD]] can hold the hand of [[GROWNUP]] the whole time and take slow, big breaths.', kind: 'coach' },
    { text: 'A bright lamp shines so the dentist can see, and it might feel like a little press or a tickle.', kind: 'describe' },
  ],
  mood: 'calm',
  background: 'not_a_scene',
  addresses,
});

describe('generateChapter checks model pages', () => {
  it('replaces a page with a false promise, fixes an unknown background, confirms topics by words', async () => {
    h.chapter = () => ({
      pages: [page("Don't worry, it won't hurt at all."), page('Soon [[CHILD]] visits the dentist.', ['pain', 'love']), page('Then they go home.')],
      summary: 'A visit to the dentist.',
      usedTechniques: ['hold_hand_or_foot', 'made_up_technique'],
      place: 'waiting room',
    });
    const out = await collect(generateChapter({ ctx, template, familyId: null }));
    const pages = out.filter((e) => e.type === 'page');
    expect(pages).toHaveLength(3);
    expect(JSON.stringify(pages[0])).not.toContain("won't hurt");
    const second = pages[1].type === 'page' ? pages[1].page : null;
    expect(template.backgrounds).toContain(second?.background);
    expect(second?.addresses).toEqual(['pain']); // 'love' has no proof word on the page
    const done = out[out.length - 1];
    expect(done.type === 'done' && done.usedTechniques).toEqual(['hold_hand_or_foot']);
  });

  it('falls back to the template pages when the model fails', async () => {
    h.chapter = () => {
      throw new Error('provider down');
    };
    const out = await collect(generateChapter({ ctx, template, familyId: null }));
    expect(out.filter((e) => e.type === 'page').length).toBeGreaterThan(0);
    expect(out[out.length - 1]).toMatchObject({ type: 'done', source: 'fallback' });
  });

  it('falls back when the model output does not match the schema', async () => {
    h.chapter = () => ({ pages: [], summary: 'x' });
    const out = await collect(generateChapter({ ctx, template, familyId: null }));
    expect(out[out.length - 1]).toMatchObject({ type: 'done', source: 'fallback' });
  });
});

describe('answerQuestion: the model cannot lower a category', () => {
  const ask = (text: string) =>
    collect(
      answerQuestion({
        ctx,
        template,
        familyId: null,
        question: { text, source: 'custom' },
        currentPage: { id: 'p1', text: 'Soon [[CHILD]] visits the dentist.' },
        nextPage: { id: 'p2', text: 'The dentist says hello.', background: 'dentist_chair' },
      }),
    );

  it('keeps a sensitive question sensitive and gives the child no text', async () => {
    h.answer = () => ({
      category: 'on_topic', topic: 'other', answer: [{ text: 'Everyone dies one day.', kind: 'describe' }],
      parentDraft: '', parentPhrase: 'Hug.', nextPage: null,
    });
    const out = await ask('Is Grandpa going to die?');
    expect(out[0]).toMatchObject({ type: 'category', category: 'sensitive' });
    expect(out.some((e) => e.type === 'answer')).toBe(false);
    expect(out.find((e) => e.type === 'draft')).toBeTruthy();
  });

  it('accepts a model that raises a question to unsafe and sends no text', async () => {
    h.answer = () => ({ category: 'unsafe', topic: 'safety', answer: [], parentDraft: '', parentPhrase: '', nextPage: null });
    const out = await ask('Why is the sky so dark at my house?');
    expect(out.map((e) => e.type)).toEqual(['category', 'done']);
    expect(out[0]).toMatchObject({ category: 'unsafe' });
  });

  it('replaces an answer with a stop phrase by the fallback', async () => {
    h.answer = () => ({
      category: 'on_topic', topic: 'pain', answer: [{ text: 'I promise it will not hurt.', kind: 'coach' }],
      parentDraft: '', parentPhrase: 'You can do it.', nextPage: null,
    });
    const out = await ask('Does the chair go up?');
    const ans = out.find((e) => e.type === 'answer');
    expect(ans).toMatchObject({ source: 'fallback' });
    expect(JSON.stringify(ans)).not.toContain('promise');
  });

  it('gives the "great question" line when the model is too slow', async () => {
    process.env.LLM_MOCK_DELAY_MS = '400';
    try {
      const t0 = Date.now();
      const out = await ask('What colour is the dentist chair?');
      expect(Date.now() - t0).toBeLessThan(5_000);
      expect(out.find((e) => e.type === 'answer')).toMatchObject({ source: 'fallback' });
      expect(out[out.length - 1].type).toBe('done');
    } finally {
      delete process.env.LLM_MOCK_DELAY_MS;
    }
  }, 10_000);
});

describe('budget', () => {
  it('adds the cost of every call to today\'s spend', async () => {
    const before = await spentToday();
    await recordCall({ familyId: null, route: 'answer', provider: 'gemini', model: 'gemini-x-flash', inputTokens: 1000, outputTokens: 100, costUsd: 0.25, latencyMs: 10, outcome: 'ok' });
    expect((await spentToday()) - before).toBeCloseTo(0.25);
  });
});
