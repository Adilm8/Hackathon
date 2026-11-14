/**
 * generateChapter (docs/SPEC.md 8.2, 9 `POST /api/chapter`). Server-only.
 *
 * Streams pages as soon as each one is complete and has passed the checks of 8.5/8.6.
 * Deadlines: first page within 5 s, whole chapter within 25 s. Failure before the first page:
 * all template pages for the chapter's beats, `done` with source 'fallback'. Failure after some pages:
 * the remaining pages from the template, `done` with source 'llm' and partial: true.
 * Social story style (5.8) is buffered: the 2:1 ratio is checked on the whole chapter, one retry,
 * then the social template pages.
 */
import 'server-only';
import { ChapterOut, PageOut, type ChapterOutT } from '../engine/schemas';
import type { EventTemplate, StoryContext } from '../engine/types';
import { env } from '../env';
import { cacheGet, cacheKey, cacheSet } from '../server/cache';
import { DEADLINES, PROMPT_VERSION } from './config';
import { fallbackChapterPages, fallbackSummary, type OutPage } from './fallback';
import { mockChapter } from './mock';
import { buildChapterPrompt, buildSystemPrompt } from './prompts/system.v1';
import { callStructured } from './run';
import { checkPage, cleanShort, filterTechniques, postcheckOptions, socialRatioOk } from './validate';

export type ChapterEvent =
  | { type: 'page'; index: number; page: OutPage }
  | { type: 'done'; summary: string; usedTechniques: string[]; place: string; source: 'llm' | 'fallback'; partial?: true };

export interface ChapterInput {
  ctx: StoryContext;
  template: EventTemplate;
  familyId: string | null;
  /** Aborted when the client goes away. */
  signal?: AbortSignal;
  /** Background warm-up: no per-family rate limit. */
  warmup?: boolean;
}

function timers(signal?: AbortSignal) {
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const total = setTimeout(() => ac.abort(), DEADLINES.chapterTotal);
  let first: ReturnType<typeof setTimeout> | null = setTimeout(() => ac.abort(), DEADLINES.chapterFirstPage);
  return {
    signal: ac.signal,
    firstPageArrived() {
      if (first) clearTimeout(first);
      first = null;
    },
    clear() {
      clearTimeout(total);
      if (first) clearTimeout(first);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

export async function* generateChapter(input: ChapterInput): AsyncGenerator<ChapterEvent> {
  const { ctx, template } = input;
  const fallback = fallbackChapterPages(template, ctx.chapter.beats, ctx.styleMode, ctx.child.age);
  const post = postcheckOptions(ctx);
  const isMock = env().llm.provider === 'mock';
  const key = cacheKey(['chapter', PROMPT_VERSION, template.type, template.version, ctx]);

  const cached = cacheGet<ChapterEvent[]>(key);
  if (cached) {
    yield* cached;
    return;
  }

  const fallbackDone = (): Extract<ChapterEvent, { type: 'done' }> => ({
    type: 'done',
    summary: fallbackSummary(template, ctx.chapter.beats),
    usedTechniques: [],
    place: ctx.place ?? '',
    source: 'fallback',
  });
  const fbAt = (i: number) => fallback[Math.min(i, fallback.length - 1)];
  const toEvents = (pages: OutPage[], from = 0): ChapterEvent[] => pages.map((page, i) => ({ type: 'page', index: from + i, page }));

  const system = buildSystemPrompt(ctx, template);
  const prompt = buildChapterPrompt(ctx, template);
  const social = ctx.styleMode === 'social';
  const t = timers(input.signal);
  const emitted: ChapterEvent[] = [];
  const started = Date.now();

  const check = (raw: unknown, i: number): OutPage | null => {
    const parsed = PageOut.safeParse(raw);
    if (!parsed.success) return null;
    const res = checkPage(parsed.data, { template, age: ctx.child.age, post, fallback: fbAt(i) });
    return isMock ? { ...res.page, source: 'fallback' } : res.page;
  };

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const call = callStructured({
        route: 'chapter',
        familyId: input.familyId,
        schema: ChapterOut,
        system,
        prompt,
        mock: () => mockChapter(ctx, template),
        signal: t.signal,
        maxOutputTokens: 2_500,
        skipRateLimit: input.warmup,
      });

      // Stream pages while they arrive (story style only).
      if (!social) {
        for await (const partial of call.partials) {
          const pages = (partial as Partial<ChapterOutT>)?.pages ?? [];
          // A page is complete once the model has started the next one.
          while (emitted.length < Math.min(pages.length - 1, 5)) {
            const page = check(pages[emitted.length], emitted.length);
            if (!page) break;
            const ev: ChapterEvent = { type: 'page', index: emitted.length, page };
            emitted.push(ev);
            t.firstPageArrived();
            yield ev;
          }
        }
      }

      const res = await call.final;
      if (res.ok) {
        const out = res.object;
        const pages: OutPage[] = [];
        for (let i = emitted.length; i < out.pages.length; i++) {
          pages.push(check(out.pages[i], i) ?? fbAt(i));
        }
        if (social) {
          if (!socialRatioOk(pages) || pages.some((p) => p.source === 'fallback' && !isMock)) {
            if (attempt === 0 && Date.now() - started < DEADLINES.chapterTotal / 2) continue;
            const events = toEvents(fallback);
            yield* events;
            yield fallbackDone();
            return;
          }
        }
        for (const ev of toEvents(pages, emitted.length)) {
          emitted.push(ev);
          t.firstPageArrived();
          yield ev;
        }
        const done: ChapterEvent = {
          type: 'done',
          summary: cleanShort(out.summary, 200, post) ?? fallbackSummary(template, ctx.chapter.beats),
          usedTechniques: filterTechniques(out.usedTechniques, template, ctx),
          place: cleanShort(out.place, 40, post) ?? ctx.place ?? '',
          source: isMock ? 'fallback' : 'llm',
        };
        yield done;
        if (!isMock) cacheSet(key, [...emitted, done]);
        return;
      }

      // Failed. One retry on a schema failure before any page, if there is time left.
      const timeLeft = Date.now() - started < DEADLINES.chapterFirstPage - 1_000;
      if (attempt === 0 && res.reason === 'schema' && emitted.length === 0 && timeLeft) continue;
      break;
    }

    if (emitted.length === 0) {
      yield* toEvents(fallback);
      yield fallbackDone();
      return;
    }
    yield* toEvents(fallback.slice(emitted.length), emitted.length);
    yield { ...fallbackDone(), source: 'llm', partial: true };
  } finally {
    t.clear();
  }
}
