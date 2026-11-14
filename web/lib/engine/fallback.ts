/**
 * Template fallbacks (docs/SPEC.md 2.3 A1, 8.2, 4.8, 4.9, 4.12): with these the whole cycle
 * works with no LLM at all, and every LLM failure has something to show at once.
 */
import { pickDayTechnique } from './memory';
import { storyPageId } from './state';
import { topTopics } from './topics';
import type { Beat, BigEvent, Chapter, ChildProfile, EventTemplate, Page, RitualCard, Sentence, StyleMode, Topic } from './types';

export const FALLBACK_COPY = {
  /** Own question that timed out (4.8). */
  ownQuestion: "That's a great question. Let's ask [[GROWNUP]] together.",
  /** Parent check when the draft failed (4.9). */
  parentCheck: "We'd rather you answer this one. Here is a way to start: 'That's a big question. Let's talk about it together.'",
  /** After three questions in a chapter (4.8). */
  questionLimit: "Great questions tonight. Let's ask more tomorrow.",
  /** Medical, legal or psychological questions (8.3 rule 6). */
  askGrownup: "That's a great question for [[GROWNUP]] or the doctor.",
} as const;

/** Most pages a chapter may have (ChapterOut allows 3–5). */
const MAX_PAGES = 5;

/**
 * Fallback pages for a chapter's beats: both pages of each beat, or the first page of each
 * beat when that would exceed five pages (multi-beat chapters, "Quick prep").
 */
export function fallbackPages(
  template: EventTemplate,
  beats: readonly Beat[],
  styleMode: StyleMode,
  _age: number,
  chapterIndex: number,
): Page[] {
  const byBeat = beats.map((b) => template.fallbackPages[styleMode][b]);
  const total = byBeat.reduce((n, ps) => n + ps.length, 0);
  const chosen = total > MAX_PAGES ? byBeat.map((ps) => ps[0]) : byBeat.flat();
  return chosen.slice(0, MAX_PAGES).map((p, i) => ({
    id: storyPageId(chapterIndex, i + 1),
    kind: 'story',
    sentences: p.sentences.map((s) => ({ ...s })),
    mood: p.mood,
    background: p.background,
    addresses: [...p.addresses],
    source: 'fallback',
  }));
}

/** Summary of a fallback chapter, fed to later chapters (≤ 200 chars). */
export function fallbackSummary(template: EventTemplate, beats: readonly Beat[]): string {
  const goals = beats.map((b) => template.beats[b].title.toLowerCase());
  return `The story covered ${goals.join(', ')}.`.slice(0, 200);
}

/** Everything /api/chapter streams when the model fails before the first page. */
export function fallbackChapter(
  template: EventTemplate,
  chapter: Pick<Chapter, 'index' | 'beats'>,
  styleMode: StyleMode,
  age: number,
): { pages: Page[]; summary: string; usedTechniques: string[]; place: string } {
  return {
    pages: fallbackPages(template, chapter.beats, styleMode, age, chapter.index),
    summary: fallbackSummary(template, chapter.beats),
    usedTechniques: [],
    place: '',
  };
}

/** The template answer of a button, or the "let's ask together" line for an own question. */
export function fallbackAnswer(template: EventTemplate, buttonId?: string): Sentence[] {
  const b = buttonId ? template.questionButtons.find((q) => q.id === buttonId) : undefined;
  if (!b) return [{ text: FALLBACK_COPY.ownQuestion, kind: 'coach' }];
  return b.fallbackAnswer.map((text, i, all) => ({ text, kind: i === all.length - 1 && all.length > 1 ? 'coach' : 'describe' }));
}

/** Ready phrase for the parent when the model returned none. */
export function fallbackParentPhrase(template: EventTemplate, topic: Topic): string | undefined {
  return template.phrases[topic]?.[0];
}

/** Three question buttons for a page: rotate through the template list by page number. */
export function questionButtonsForPage(template: EventTemplate, pageNumber: number) {
  const list = template.questionButtons;
  if (list.length <= 3) return list.slice();
  const start = (Math.max(1, pageNumber) - 1) % list.length;
  return [0, 1, 2].map((k) => list[(start + k) % list.length]);
}

/** Template ritual plus the memory technique (8.2). */
export function fallbackRitual(
  template: EventTemplate,
  event: Pick<BigEvent, 'id' | 'questions' | 'fears'>,
  child: Pick<ChildProfile, 'techniques'> | null | undefined,
): RitualCard {
  const t = pickDayTechnique(template, child, topTopics(event), { excludeEventId: event.id });
  return {
    steps: [template.ritual[0], template.ritual[1], template.ritual[2]],
    technique: { id: t.id, label: t.label, how: t.how },
    source: 'fallback',
  };
}
