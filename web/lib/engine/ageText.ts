/**
 * Template fallback text by age (ages 2-12, widened 15 Nov 2026). The team's pages are written for
 * ages 3-8. For ages 9-12 each beat gets one extra "how and why" page (template.olderPages, story
 * style), placed second so it is picked early; for age 2 pages are cut to toddler length at
 * sentence boundaries. Used by both fallback paths (browser and server).
 */
import { countWords } from './text';
import type { Beat, EventTemplate, Sentence, StyleMode } from './types';

export const OLDER_FROM_AGE = 9;
export const TODDLER_MAX_AGE = 2;
/** Words per page for toddlers (pageTargets max for age 2). */
export const TODDLER_MAX_WORDS = 60;

type TemplatePage = EventTemplate['fallbackPages']['story'][Beat][number];

/** Keeps whole sentences from the start until the word limit; always at least two sentences. */
export function shortenSentences<S extends Pick<Sentence, 'text'>>(sentences: S[], maxWords: number): S[] {
  const out: S[] = [];
  let words = 0;
  for (const s of sentences) {
    const n = countWords(s.text);
    if (out.length >= 2 && words + n > maxWords) break;
    out.push(s);
    words += n;
  }
  return out;
}

/** The fallback pages of one beat for this child's age and style. */
export function fallbackPagesForAge(template: EventTemplate, beat: Beat, styleMode: StyleMode, age: number): TemplatePage[] {
  const base = template.fallbackPages[styleMode]?.[beat] ?? template.fallbackPages.story[beat] ?? [];
  let pages = [...base];
  const older = template.olderPages?.[beat];
  if (age >= OLDER_FROM_AGE && styleMode === 'story' && older) pages = [pages[0], older, ...pages.slice(1)].filter(Boolean);
  if (age <= TODDLER_MAX_AGE) pages = pages.map((p) => ({ ...p, sentences: shortenSentences(p.sentences, TODDLER_MAX_WORDS) }));
  return pages;
}
