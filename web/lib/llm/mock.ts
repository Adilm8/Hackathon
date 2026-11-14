/**
 * Output of the mock provider (docs/SPEC.md 8.1): JSON written from the event templates, shaped exactly
 * like model output, so it goes through the same parsing and checks. No network, no cost.
 * Used by automated tests, usability threads and anyone without keys. Its text is labelled 'fallback'.
 */
import type { EventTemplate, StoryContext, Topic } from '../engine/types';
import type { AnswerOutT, ChapterOutT, PageOutT, RitualOutT } from '../engine/schemas';
import { normalise } from '../safety/stoplist';
import { allowedTechniques, fallbackAnswer, fallbackChapterPages, fallbackParentPhrase, fallbackSummary, pickTechnique } from './fallback';

export function mockChapter(ctx: StoryContext, template: EventTemplate): ChapterOutT {
  let pages = fallbackChapterPages(template, ctx.chapter.beats, ctx.styleMode, ctx.child.age);
  if (pages.length < 3) {
    // Pad with the following beats so the mock always returns a schema-valid chapter.
    const order = Object.keys(template.beats) as (keyof EventTemplate['beats'])[];
    const last = order.indexOf(ctx.chapter.beats[ctx.chapter.beats.length - 1]);
    for (let k = 1; pages.length < 3 && k < order.length; k++) {
      const extra = fallbackChapterPages(template, [order[(last + k) % order.length]], ctx.styleMode, ctx.child.age);
      pages = [...pages, ...extra.slice(0, 3 - pages.length)];
    }
  }
  const usable = allowedTechniques(template, ctx);
  return {
    pages: pages.slice(0, 5).map(({ sentences, mood, background, addresses }) => ({ sentences, mood, background, addresses })),
    summary: fallbackSummary(template, ctx.chapter.beats),
    usedTechniques: usable.slice(0, 1).map((t) => t.id),
    place: template.backgrounds[Math.min(ctx.chapter.index - 1, template.backgrounds.length - 1)].replace(/_/g, ' ').slice(0, 40),
  };
}

/** Guesses the topic of an own question from the template's topic words (mock only). */
export function guessTopic(question: string, template: EventTemplate): Topic | null {
  const q = normalise(question);
  for (const [topic, words] of Object.entries(template.topicWords) as [Topic, string[]][]) {
    if (words.some((w) => !w.startsWith('[[') && new RegExp(`\\b${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(q))) return topic;
  }
  const button = template.questionButtons.find((b) => normalise(b.text) === q);
  return button ? button.topic : null;
}

export interface MockAnswerInput {
  question: string;
  buttonId?: string;
  sensitive: boolean;
  nextPage?: { text: string; background: string };
}

export function mockAnswer(ctx: StoryContext, template: EventTemplate, input: MockAnswerInput): AnswerOutT {
  const button = input.buttonId ? template.questionButtons.find((b) => b.id === input.buttonId) : undefined;
  if (input.sensitive) {
    const topic = guessTopic(input.question, template) ?? 'other';
    return {
      category: 'sensitive',
      topic,
      answer: [],
      parentDraft:
        "That's a big and important question, and I'm glad you asked me. " +
        "Here is what I think, and you can always ask me more. Let's talk about it together tonight.",
      parentPhrase: fallbackParentPhrase(template, topic),
      nextPage: null,
    };
  }
  const topic = button?.topic ?? guessTopic(input.question, template);
  if (!topic) {
    return {
      category: 'off_topic',
      topic: 'other',
      answer: [{ text: "What a fun thing to wonder about! Let's see what happens next in our story.", kind: 'coach' }],
      parentDraft: '',
      parentPhrase: "Good thinking! Let's find out what happens next.",
      nextPage: null,
    };
  }
  const withTopic = button ?? template.questionButtons.find((b) => b.topic === topic);
  const answer = fallbackAnswer(template, withTopic?.id);
  let nextPage: PageOutT | null = null;
  if (input.nextPage && ctx.styleMode === 'story') {
    const original = input.nextPage.text
      .split(/(?<=[.!?])\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .map((text) => ({ text: text.slice(0, 220), kind: 'describe' as const }));
    nextPage = {
      sentences: [
        { text: '[[CHILD]] remembered the question from before.', kind: 'describe' as const },
        { text: answer[0].text, kind: 'coach' as const },
        ...original,
      ].slice(0, 12),
      mood: 'calm',
      background: input.nextPage.background,
      addresses: [topic],
    };
  }
  return { category: 'on_topic', topic, answer, parentDraft: '', parentPhrase: fallbackParentPhrase(template, topic), nextPage };
}

export function mockRitual(ctx: StoryContext, template: EventTemplate, topTopics: Topic[]): RitualOutT {
  return {
    steps: template.ritual.map((s) => s.slice(0, 60)),
    techniqueId: pickTechnique(template, ctx, topTopics).id,
  };
}
