/**
 * Validation of model output in code (docs/SPEC.md 8.5, last paragraph; 8.6 level 4).
 * Schema is checked by the caller; this module checks lengths, stop phrases, names, backgrounds,
 * technique ids, confirmed topics (A9) and the 2:1 ratio of social stories (5.8).
 */
import type { EventTemplate, Sentence, StoryContext, Topic } from '../engine/types';
import type { PageOutT } from '../engine/schemas';
import { checkText, type PostcheckOptions } from '../safety/postcheck';
import { confirmAddresses, pageTargets } from './deps';
import { allowedTechniques, type OutPage } from './fallback';

export function wordCount(text: string): number {
  return text.replace(/\[\[(CHILD|GROWNUP)\]\]/g, 'X').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function pageWords(sentences: Pick<Sentence, 'text'>[]): number {
  return sentences.reduce((n, s) => n + wordCount(s.text), 0);
}

/** Words the post-check accepts as capitalised names: family words and the hero's animal. */
export function postcheckOptions(ctx: Pick<StoryContext, 'values' | 'child'>): PostcheckOptions {
  return {
    familyWords: ctx.values.family,
    allowWords: [ctx.child.character.animal, 'Bunny', 'Bear', 'Fox', 'Kitten', 'Mom', 'Dad'],
  };
}

export function textsClean(texts: string[], opts: PostcheckOptions): boolean {
  return texts.every((t) => checkText(t, opts).length === 0);
}

export interface PageCheck {
  page: OutPage;
  /** True when the model page was replaced by the fallback page. */
  replaced: boolean;
  reason?: string;
}

/**
 * Checks one model page. Over the length range (+25%): trimmed at a sentence boundary.
 * Under half the minimum (the age target, or `minWords` for a rewrite), or any safety hit: replaced by its fallback page.
 */
export function checkPage(
  raw: PageOutT,
  opts: { template: EventTemplate; age: number; post: PostcheckOptions; fallback: OutPage; minWords?: number },
): PageCheck {
  const targets = pageTargets(opts.age);
  const { maxWords } = targets;
  // A rewritten page keeps the length of the page it replaces, which may be shorter than a new chapter page.
  const minWords = opts.minWords ?? targets.minWords;
  const replace = (reason: string): PageCheck => ({ page: { ...opts.fallback }, replaced: true, reason });

  const sentences = raw.sentences.map((s) => ({ text: s.text.trim(), kind: s.kind }));
  for (const s of sentences) {
    const v = checkText(s.text, opts.post);
    if (v.length) return replace(`postcheck:${v[0].kind}:${v[0].detail}`);
  }

  const upper = Math.round(maxWords * 1.25);
  while (sentences.length > 2 && pageWords(sentences) > upper) sentences.pop();
  if (pageWords(sentences) < minWords / 2) return replace('too_short');

  const background = opts.template.backgrounds.includes(raw.background) ? raw.background : opts.fallback.background;
  const addresses = confirmAddresses({ sentences, addresses: raw.addresses as Topic[] }, opts.template);
  return { page: { sentences, mood: raw.mood, background, addresses, source: 'llm' }, replaced: false };
}

/** FR-B3: at least two describing sentences for each coaching sentence. */
export function socialRatioOk(pages: Pick<OutPage, 'sentences'>[]): boolean {
  let describe = 0;
  let coach = 0;
  for (const p of pages) for (const s of p.sentences) {
    if (s.kind === 'coach') coach++;
    else describe++;
  }
  return describe >= 2 * coach;
}

/** Technique ids the model may report (template + helped before), without duplicates. */
export function filterTechniques(ids: string[], template: EventTemplate, ctx: Pick<StoryContext, 'helpedBefore' | 'avoid'>): string[] {
  const known = new Set(allowedTechniques(template, ctx).map((t) => t.id));
  return [...new Set(ids)].filter((id) => known.has(id));
}

/** A short free-text field from the model (summary, place): kept only when clean. */
export function cleanShort(text: string | undefined, max: number, post: PostcheckOptions): string | undefined {
  const t = (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  if (!t) return undefined;
  return checkText(t, post).length ? undefined : t;
}
