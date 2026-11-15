/**
 * Failure paths of docs/reliability.md through the real route handlers: the model provider and
 * the voice provider unreachable, and /api/health. No network: global fetch is replaced.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { closeDb } from '@/lib/db/client';
import { createFamily } from '@/lib/db/families';
import { replaceState } from '@/lib/db/state';
import { buildSampleFamily } from '@/lib/engine/sample';
import type { StoryContext } from '@/lib/engine/types';
import { resetEnvCache } from '@/lib/env';
import { openKeys, resetBreaker } from '@/lib/llm/breaker';
import { resetBudget } from '@/lib/server/budget';
import { resetCache } from '@/lib/server/cache';
import { resetRateLimits } from '@/lib/server/ratelimit';
import { encodeSession } from '@/lib/server/session';
import { POST as chapterPost } from '@/app/api/chapter/route';
import { POST as answerPost } from '@/app/api/answer/route';
import { POST as ttsPost } from '@/app/api/tts/route';
import { GET as healthGet } from '@/app/api/health/route';

const FAKE_KEY = 'sk-or-v1-test-not-a-real-key';
const realFetch = globalThis.fetch;
let cookie = '';

const ctx = (): StoryContext => ({
  event: { type: 'dentist', fears: ['pain'], templateVersion: 1 },
  child: { age: 5, character: { animal: 'bunny', color: 'blue', accessory: 'cap' } },
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
});

function req(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost', 'x-bds-workspace': 'sample', cookie },
    body: JSON.stringify(body),
  });
}
const lines = async (res: Response) => (await res.text()).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

function setEnv(vars: Record<string, string>) {
  Object.assign(process.env, vars);
  resetEnvCache();
}

beforeAll(async () => {
  const fam = await createFamily('sample');
  await replaceState(fam.id, buildSampleFamily('2026-11-15'));
  cookie = `bds_sample_session=${encodeSession({ familyId: fam.id, kind: 'sample' })}`;
});
afterAll(closeDb);
beforeEach(() => {
  resetRateLimits();
  resetCache();
  resetBreaker();
  resetBudget();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of ['LLM_PROVIDER', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'OPENROUTER_MODEL_ANSWER', 'OPENROUTER_MODEL_BACKUP', 'TTS_MODEL', 'TTS_CACHE_DIR']) delete process.env[k];
  resetEnvCache();
  vi.restoreAllMocks();
});

describe('model provider unreachable', () => {
  beforeEach(() => {
    setEnv({ LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: FAKE_KEY, OPENROUTER_MODEL: 'deepseek/deepseek-v4.1-flash', OPENROUTER_MODEL_ANSWER: 'anthropic/haiku-5.5' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
  });

  it('a chapter still arrives in full from the templates', async () => {
    const res = await chapterPost(req('/api/chapter', { eventId: 'e1', context: ctx() }));
    expect(res.status).toBe(200);
    const out = await lines(res);
    const pages = out.filter((l) => l.type === 'page');
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.every((p) => p.page.source === 'fallback')).toBe(true);
    expect(out.at(-1)).toMatchObject({ type: 'done', source: 'fallback' });
  });

  it('after two failures the breaker holds the model back and calls stop going out', async () => {
    await lines(await chapterPost(req('/api/chapter', { eventId: 'e1', context: ctx() })));
    resetCache();
    await lines(await chapterPost(req('/api/chapter', { eventId: 'e1', context: { ...ctx(), mustAddress: [] } })));
    expect(openKeys().length).toBeGreaterThan(0);
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    resetCache();
    const out = await lines(await chapterPost(req('/api/chapter', { eventId: 'e1', context: { ...ctx(), avoid: ['x'] } })));
    expect(out.at(-1)).toMatchObject({ type: 'done', source: 'fallback' });
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it('a button question gets its written answer', async () => {
    const res = await answerPost(req('/api/answer', {
      context: ctx(),
      question: { text: 'Will it hurt?', source: 'button', buttonId: 'pain' },
      currentPage: { id: 'c1-p1', text: 'The bunny went to the dentist.' },
      questionsInChapter: 0,
    }));
    expect(res.status).toBe(200);
    const out = await lines(res);
    expect(out.find((l) => l.type === 'category')).toMatchObject({ category: 'on_topic' });
    const answer = out.find((l) => l.type === 'answer');
    expect(answer?.sentences.length).toBeGreaterThan(0);
    expect(answer?.source).toBe('fallback');
  });
});

describe('voice provider failing', () => {
  it('answers 503 so the browser switches to the device voice', async () => {
    setEnv({ OPENROUTER_API_KEY: FAKE_KEY, TTS_MODEL: 'hexgrad/kokoro-82m', TTS_CACHE_DIR: `/tmp/bds-tts-test-${process.pid}` });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => new Response('busy', { status: 500 })) as typeof fetch;
    const res = await ttsPost(req('/api/tts', { text: 'Once upon a time.' }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('upstream_failed');
  });
});

describe('/api/health', () => {
  it('reports each dependency and never shows a key', async () => {
    setEnv({ LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: FAKE_KEY });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await healthGet();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(FAKE_KEY);
    const j = JSON.parse(text);
    expect(j.ok).toBe(true);
    expect(j.checks.database.state).toBe('ok');
    // OpenRouter asked for, but no model set: degraded, stories from the templates.
    expect(j.checks.llm.state).toBe('degraded');
    expect(j.status).toBe('degraded');
    for (const k of ['database', 'llm', 'budget', 'voice', 'payments', 'push', 'sessions', 'demo']) expect(j.checks[k]).toHaveProperty('note');
  });
});
