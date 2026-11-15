/**
 * Template fallbacks of the three calls (docs/SPEC.md 8.2). Written by the team, never by a model,
 * so they are always safe to show. The whole cycle works on these with no LLM at all (A1).
 */
import { pagesWithoutAvoided } from '../engine/storyPrefs';
import type { Beat, EventTemplate, Mood, RitualCard, Sentence, StoryContext, StoryPrefs, StyleMode, Topic } from '../engine/types';
import { OWN_QUESTION_FALLBACK } from '../safety/messages';
import { findTechniqueAnywhere, pageTargets } from './deps';

export interface OutPage {
  sentences: Sentence[];
  mood: Mood;
  background: string;
  addresses: Topic[];
  source: 'llm' | 'fallback';
}

/**
 * Pages for a chapter's beats: the beats' fallback pages taken in turn (first page of every beat,
 * then the second ones) until the age's page count is reached, then put back in beat order.
 */
export function fallbackChapterPages(
  template: EventTemplate,
  beats: Beat[],
  styleMode: StyleMode,
  age: number,
  story?: Pick<StoryPrefs, 'length' | 'avoidWords'>,
): OutPage[] {
  const target = pageTargets(age, story?.length).pages;
  const lists = beats.map((b) => template.fallbackPages[styleMode]?.[b] ?? template.fallbackPages.story[b] ?? []);
  const picked: { beat: number; i: number }[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen && picked.length < target; i++) {
    for (let b = 0; b < lists.length && picked.length < target; b++) {
      if (lists[b][i]) picked.push({ beat: b, i });
    }
  }
  picked.sort((x, y) => x.beat - y.beat || x.i - y.i);
  const pages: OutPage[] = picked.map(({ beat, i }) => {
    const p = lists[beat][i];
    return { sentences: p.sentences.map((s) => ({ ...s })), mood: p.mood, background: p.background, addresses: [...p.addresses], source: 'fallback' };
  });
  return pagesWithoutAvoided(pages, story?.avoidWords);
}

/** Chapter summary for later prompts when the chapter came from the templates. */
export function fallbackSummary(template: EventTemplate, beats: Beat[]): string {
  return beats.map((b) => template.beats[b].title).join('; ').slice(0, 200);
}

/** The answer to a button question, or the "great question" line for an own question. */
export function fallbackAnswer(template: EventTemplate, buttonId?: string): Sentence[] {
  const button = buttonId ? template.questionButtons.find((b) => b.id === buttonId) : undefined;
  const lines = button ? button.fallbackAnswer : OWN_QUESTION_FALLBACK;
  return lines.map((text, i) => ({ text, kind: i === 0 ? 'describe' : 'coach' }));
}

/** A ready phrase for the parent on this topic, or a general one. */
export function fallbackParentPhrase(template: EventTemplate, topic: Topic): string {
  return template.phrases[topic]?.[0] ?? "That's a good question. Let's think about it together.";
}

type Technique = EventTemplate['techniques'][number];

/**
 * Techniques the model may use for this event: the template's own plus the ones that helped in an
 * earlier event of another type (memory travels across events, 5.7), minus the ones to avoid.
 */
export function allowedTechniques(template: EventTemplate, ctx: Pick<StoryContext, 'helpedBefore' | 'avoid'>): Technique[] {
  const out = new Map<string, Technique>();
  for (const t of template.techniques) out.set(t.id, t);
  for (const id of ctx.helpedBefore) {
    const t = findTechniqueAnywhere(id, template);
    if (t && !out.has(t.id)) out.set(t.id, t);
  }
  const list = [...out.values()].filter((t) => !ctx.avoid.includes(t.id));
  return list.length ? list : template.techniques;
}

/** Technique for the day card: what helped before, else one that fits the top worries, never one to avoid. */
export function pickTechnique(template: EventTemplate, ctx: Pick<StoryContext, 'helpedBefore' | 'avoid'>, topTopics: Topic[]): Technique {
  const pool = allowedTechniques(template, ctx);
  return (
    ctx.helpedBefore.map((id) => pool.find((t) => t.id === id)).find(Boolean) ??
    topTopics.map((topic) => pool.find((t) => t.topics.includes(topic))).find(Boolean) ??
    pool[0]
  );
}

export function fallbackRitual(template: EventTemplate, ctx: Pick<StoryContext, 'helpedBefore' | 'avoid'>, topTopics: Topic[]): RitualCard {
  const t = pickTechnique(template, ctx, topTopics);
  return {
    steps: [...template.ritual] as [string, string, string],
    technique: { id: t.id, label: t.label, how: t.how },
    source: 'fallback',
  };
}
