/**
 * ritualCard (docs/SPEC.md 8.2, 4.12, 9 `POST /api/ritual`). Server-only.
 * Three "first → then" steps and one technique within 4 s; otherwise the template ritual plus the
 * technique that helped before (5.7). Cached for an hour by context like chapters.
 */
import 'server-only';
import { RitualOut } from '../engine/schemas';
import type { EventTemplate, RitualCard, StoryContext, Topic } from '../engine/types';
import { env } from '../env';
import { checkText } from '../safety/postcheck';
import { cacheGet, cacheKey, cacheSet } from '../server/cache';
import { DEADLINES, PROMPT_VERSION } from './config';
import { fallbackRitual, pickTechnique } from './fallback';
import { mockRitual } from './mock';
import { buildRitualPrompt } from './prompts/ritual.v1';
import { buildSystemPrompt } from './prompts/system.v1';
import { callStructured } from './run';
import { postcheckOptions } from './validate';

export interface RitualInput {
  ctx: StoryContext;
  template: EventTemplate;
  topTopics: Topic[];
  familyId: string | null;
  signal?: AbortSignal;
  warmup?: boolean;
}

export async function ritualCard(input: RitualInput): Promise<RitualCard> {
  const { ctx, template, topTopics } = input;
  const key = cacheKey(['ritual', PROMPT_VERSION, template.type, template.version, ctx, topTopics]);
  const cached = cacheGet<RitualCard>(key);
  if (cached) return cached;

  const ac = new AbortController();
  const onAbort = () => ac.abort();
  input.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => ac.abort(), DEADLINES.ritual);
  try {
    const res = await callStructured({
      route: 'ritual',
      familyId: input.familyId,
      schema: RitualOut,
      system: buildSystemPrompt(ctx, template),
      prompt: buildRitualPrompt(ctx, template, topTopics),
      mock: () => mockRitual(ctx, template, topTopics),
      signal: ac.signal,
      maxOutputTokens: 300,
      skipRateLimit: input.warmup,
    }).final;
    if (!res.ok) return fallbackRitual(template, ctx, topTopics);

    const post = postcheckOptions(ctx);
    const steps = res.object.steps.map((s) => s.trim());
    if (steps.some((s) => s.length < 2 || checkText(s, post).length > 0)) return fallbackRitual(template, ctx, topTopics);

    const allowed = template.techniques.find((t) => t.id === res.object.techniqueId && !ctx.avoid.includes(t.id));
    const t = allowed ?? pickTechnique(template, ctx, topTopics);
    const isMock = env().llm.provider === 'mock';
    const card: RitualCard = {
      steps: [steps[0], steps[1], steps[2]],
      technique: { id: t.id, label: t.label, how: t.how },
      source: isMock ? 'fallback' : 'llm',
    };
    if (!isMock) cacheSet(key, card);
    return card;
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener('abort', onAbort);
  }
}
