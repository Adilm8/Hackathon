/**
 * Template fallbacks of the three calls (docs/SPEC.md 8.2). Written by the team, never by a model,
 * so they are always safe to show. The whole cycle works on these with no LLM at all (A1).
 */
import type { Beat, EventTemplate, Mood, RitualCard, Sentence, StoryContext, StyleMode, Topic } from '../engine/types';
import { OWN_QUESTION_FALLBACK } from '../safety/messages';
import { pageTargets } from './deps';

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
export function fallbackChapterPages(template: EventTemplate, beats: Beat[], styleMode: StyleMode, age: number): OutPage[] {
  const target = pageTargets(age).pages;
  const lists = beats.map((b) => template.fallbackPages[styleMode]?.[b] ?? template.fallbackPages.story[b] ?? []);
  const picked: { beat: number; i: number }[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen && picked.length < target; i++) {
    for (let b = 0; b < lists.length && picked.length < target; b++) {
      if (lists[b][i]) picked.push({ beat: b, i });
    }
  }
  picked.sort((x, y) => x.beat - y.beat || x.i - y.i);
  return picked.map(({ beat, i }) => {
    const p = lists[beat][i];
    return { sentences: p.sentences.map((s) => ({ ...s })), mood: p.mood, background: p.background, addresses: [...p.addresses], source: 'fallback' };
  });
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
  return template.phrases[topic]?.[0] ?? Object.values(template.phrases).find((p) => p?.length)?.[0] ?? "You're brave, and I'm right here with you.";
}

/** Technique for the day card: what helped before, else one that fits the top worries, never one to avoid. */
export function pickTechnique(template: EventTemplate, ctx: Pick<StoryContext, 'helpedBefore' | 'avoid'>, topTopics: Topic[]) {
  const allowed = template.techniques.filter((t) => !ctx.avoid.includes(t.id));
  const pool = allowed.length ? allowed : template.techniques;
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
