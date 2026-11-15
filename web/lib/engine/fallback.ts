/**
 * Template fallbacks (docs/SPEC.md 2.3 A1, 8.2, 4.8, 4.9, 4.12): with these the whole cycle
 * works with no LLM at all, and every LLM failure has something to show at once.
 */
import { pickDayTechnique } from './memory';
import { storyPageId } from './state';
import { topTopics } from './topics';
import { fallbackPagesForAge } from './ageText';
import { pageTargets } from './plan';
import { pagesWithoutAvoided } from './storyPrefs';
import type { Beat, BigEvent, Chapter, ChildProfile, EventTemplate, Page, RitualCard, Sentence, StoryPrefs, StyleMode, Topic } from './types';

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

/**
 * Fallback pages for a chapter's beats, up to the story length's page count (5 by default): the beats'
 * pages taken in turn (first page of every beat, then the second ones, ...), then put back in beat order.
 * One beat gives all four of its pages; "Quick prep" (all five beats) gives the first page of each.
 * Sentences with a word the parent asked to avoid are left out.
 */
export function fallbackPages(
  template: EventTemplate,
  beats: readonly Beat[],
  styleMode: StyleMode,
  age: number,
  chapterIndex: number,
  story?: Pick<StoryPrefs, 'length' | 'avoidWords'>,
): Page[] {
  const MAX_PAGES = pageTargets(age, story?.length).pages;
  const lists = beats.map((b) => fallbackPagesForAge(template, b, styleMode, age));
  const picked: { beat: number; i: number }[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest && picked.length < MAX_PAGES; i++)
    for (let b = 0; b < lists.length && picked.length < MAX_PAGES; b++) if (lists[b][i]) picked.push({ beat: b, i });
  picked.sort((x, y) => x.beat - y.beat || x.i - y.i);
  const pages = picked.map(({ beat, i }) => {
    const p = lists[beat][i];
    return { sentences: p.sentences.map((s) => ({ ...s })), mood: p.mood, background: p.background, addresses: [...p.addresses] };
  });
  return pagesWithoutAvoided(pages, story?.avoidWords).map((p, n) => ({
    id: storyPageId(chapterIndex, n + 1),
    kind: 'story',
    ...p,
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
  story?: Pick<StoryPrefs, 'length' | 'avoidWords'>,
): { pages: Page[]; summary: string; usedTechniques: string[]; place: string } {
  return {
    pages: fallbackPages(template, chapter.beats, styleMode, age, chapter.index, story),
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
