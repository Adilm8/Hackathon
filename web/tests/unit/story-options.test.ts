import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/engine/clock';
import { fallbackPages } from '@/lib/engine/fallback';
import { applyStoryPrefs, canReplan, chapterCount, createEvent, normaliseStoryPrefs, pageTargets, planChapters } from '@/lib/engine/plan';
import { BigEventSchema, StoryContextSchema } from '@/lib/engine/schemas';
import { buildStoryContext } from '@/lib/engine/state';
import { avoidPattern, hasAvoidedWord, pagesWithoutAvoided } from '@/lib/engine/storyPrefs';
import { getTemplate } from '@/lib/engine/templates';
import type { ChildProfile, StoryPrefs } from '@/lib/engine/types';
import { fallbackChapterPages } from '@/lib/llm/fallback';
import { mockChapter } from '@/lib/llm/mock';
import { buildChapterPrompt, buildSystemPrompt, chosenSteps, storyOptionLines } from '@/lib/llm/prompts/system.v1';
import { buildRitualPrompt } from '@/lib/llm/prompts/ritual.v1';
import { checkPage, postcheckOptions } from '@/lib/llm/validate';

const today = '2026-11-15';
const dentist = getTemplate('dentist');
const child: ChildProfile = {
  id: 'c1', name: 'Leo', age: 5, character: { animal: 'bunny', color: 'blue', accessory: 'none' },
  values: { tone: 'secular', bodyWords: 'family', family: ['Mom', 'Dad'] }, styleMode: 'story',
  techniques: [], badges: [], createdOn: today,
};
const make = (story?: StoryPrefs, days = 5) =>
  createEvent({ id: 'e1', childId: 'c1', type: 'dentist', date: addDays(today, days), today, fears: ['pain'], story });

describe('number of evenings', () => {
  it('follows the parent but never goes above the days left', () => {
    expect(chapterCount(addDays(today, 5), today)).toBe(5);
    expect(chapterCount(addDays(today, 5), today, 3)).toBe(3);
    expect(chapterCount(addDays(today, 2), today, 4)).toBe(2);
    const plan = planChapters(addDays(today, 5), today, 2);
    expect(plan.map((p) => p.date)).toEqual([addDays(today, 3), addDays(today, 4)]);
    expect(plan.flatMap((p) => p.beats)).toHaveLength(5);
  });

  it('is applied by createEvent and can change until a chapter is written', () => {
    const e = make({ chapters: 3 });
    expect(e.chapters).toHaveLength(3);
    expect(canReplan(e)).toBe(true);
    const e2 = applyStoryPrefs(e, { chapters: 2 }, today, dentist);
    expect(e2.chapters).toHaveLength(2);
    const written = { ...e2, chapters: e2.chapters.map((c, i) => (i === 0 ? { ...c, pages: fallbackPages(dentist, c.beats, 'story', 5, 1) } : c)) };
    const e3 = applyStoryPrefs(written, { chapters: 5 }, today, dentist);
    expect(e3.chapters).toHaveLength(2);
    expect(e3.story?.chapters).toBe(5);
  });
});

describe('normaliseStoryPrefs', () => {
  it('drops defaults, trims and caps lists', () => {
    expect(normaliseStoryPrefs({ length: 'standard', genre: 'bedtime' }, dentist)).toBeUndefined();
    const out = normaliseStoryPrefs({
      moments: ['  bus  ride ', 'bus ride', 'ice cream', 'third'], avoidWords: ['needle', 'drill', 'shot', 'x'], interests: ['space', 'space', 'trains'],
      skipSteps: [dentist.steps[1], 'not a real step'],
    }, dentist)!;
    expect(out.moments).toEqual(['bus ride', 'ice cream']);
    expect(out.avoidWords).toHaveLength(3);
    expect(out.interests).toEqual(['space', 'trains']);
    expect(out.skipSteps).toEqual([dentist.steps[1]]);
  });

  it('keeps at least two real steps', () => {
    const out = normaliseStoryPrefs({ skipSteps: dentist.steps.slice(1) }, dentist);
    expect(out?.skipSteps).toBeUndefined();
  });
});

describe('schemas', () => {
  it('accept an event and a context with story options', () => {
    const e = make({ length: 'long', genre: 'fairy_tale', comfort: { kind: 'teddy', nickname: 'Mr. Floppy' }, chapters: 4, after: 'A trip to the park' });
    expect(BigEventSchema.safeParse(e).success).toBe(true);
    const ctx = buildStoryContext({ event: e, child, template: dentist, chapterIndex: 1 });
    expect(ctx.story).toBeDefined();
    expect('chapters' in (ctx.story ?? {})).toBe(false);
    expect(StoryContextSchema.safeParse(ctx).success).toBe(true);
  });
});

describe('story length', () => {
  it('sets the page count', () => {
    expect(pageTargets(5, 'short').pages).toBe(3);
    expect(pageTargets(5).pages).toBe(5);
    expect(pageTargets(5, 'long').pages).toBe(7);
  });

  it('shapes the fallback and the mock chapter', () => {
    const e = make({ length: 'short', chapters: 2 });
    const ctx = buildStoryContext({ event: e, child, template: dentist, chapterIndex: 1 });
    expect(fallbackChapterPages(dentist, ctx.chapter.beats, 'story', 5, ctx.story)).toHaveLength(3);
    expect(mockChapter(ctx, dentist).pages).toHaveLength(3);
    const long = make({ length: 'long', chapters: 2 });
    const lctx = buildStoryContext({ event: long, child, template: dentist, chapterIndex: 1 });
    expect(fallbackPages(dentist, lctx.chapter.beats, 'story', 5, 1, long.story)).toHaveLength(7);
  });
});

describe('words to avoid', () => {
  it('match whole words and plurals, any case', () => {
    expect(hasAvoidedWord('The Needles are tiny.', ['needle'])).toBe(true);
    expect(hasAvoidedWord('A needlepoint pillow.', ['needle'])).toBe(false);
    expect(avoidPattern([])).toBeNull();
  });

  it('are taken out of fallback pages', () => {
    const word = 'tooth';
    const pages = fallbackChapterPages(dentist, ['what_happens'], 'story', 5);
    const clean = pagesWithoutAvoided(pages, [word]);
    expect(clean.flatMap((p) => p.sentences).some((s) => hasAvoidedWord(s.text, [word]))).toBe(false);
  });

  it('are dropped from model pages', () => {
    const fb = fallbackChapterPages(dentist, ['what_happens'], 'story', 5)[0];
    const sentences = Array.from({ length: 10 }, (_, i) => ({ text: i === 3 ? 'Then comes the drill sound.' : 'We sit in the big chair and look at the light today.', kind: 'describe' as const }));
    const res = checkPage({ sentences, mood: 'calm', background: dentist.backgrounds[0], addresses: [] }, {
      template: dentist, age: 5, post: postcheckOptions({ values: child.values, child: { age: 5, character: child.character } }), fallback: fb, avoidWords: ['drill'],
    });
    expect(res.replaced).toBe(false);
    expect(res.page.sentences.some((s) => /drill/.test(s.text))).toBe(false);
  });
});

describe('prompts', () => {
  const full: StoryPrefs = {
    length: 'long', genre: 'funny', skipSteps: [dentist.steps[2]], moments: ['We ride the bus'], companions: ['Dad'],
    comfort: { kind: 'teddy', nickname: 'Mr. Floppy' }, interests: ['dinosaurs'], experience: 'was_hard', after: 'A trip to the park', avoidWords: ['needle'],
  };

  it('carry every option, parent text in data blocks', () => {
    const e = make(full);
    const ctx = buildStoryContext({ event: e, child, template: dentist, chapterIndex: 1 });
    const system = buildSystemPrompt(ctx, dentist);
    expect(system).toContain('7 pages');
    expect(system).toContain('4-5 minutes');
    expect(system).toContain('funny adventure');
    expect(system).toContain('<data>We ride the bus</data>');
    expect(system).toContain('goes with: Dad');
    expect(system).toContain('<data>Mr. Floppy</data>');
    expect(system).toContain('dinosaurs');
    expect(system).toContain('Last time was hard');
    expect(system).toContain('<data>A trip to the park</data>');
    expect(system).toContain('<data>needle</data>');
    expect(system).toContain('NOT happen');
    expect(chosenSteps(ctx, dentist)).not.toContain(dentist.steps[2]);
    expect(system.split('Build on what really happens:')[1].split('\n')[0]).not.toContain(dentist.steps[2]);
    expect(buildChapterPrompt(ctx, dentist)).toContain('where the hero is going');
    expect(buildRitualPrompt(ctx, dentist, [])).not.toContain(dentist.steps[2]);
  });

  it('add nothing when the parent set nothing', () => {
    const ctx = buildStoryContext({ event: make(), child, template: dentist, chapterIndex: 1 });
    expect(storyOptionLines(ctx, dentist)).toEqual([]);
    expect(buildSystemPrompt(ctx, dentist)).not.toContain("Parent's story options");
  });

  it('keep social stories literal whatever the genre', () => {
    const e = make({ genre: 'fairy_tale' });
    const ctx = buildStoryContext({ event: e, child: { ...child, styleMode: 'social' }, template: dentist, chapterIndex: 1 });
    expect(storyOptionLines(ctx, dentist).join(' ')).toContain('rule 9 wins');
  });

  it('end the last chapter with the plan', () => {
    const e = make({ comfort: { kind: 'blanket' }, after: 'Park' });
    const ctx = buildStoryContext({ event: e, child, template: dentist, chapterIndex: e.chapters.length });
    expect(buildChapterPrompt(ctx, dentist)).toContain("hero's plan for the day");
  });
});
