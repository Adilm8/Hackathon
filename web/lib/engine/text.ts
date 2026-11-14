/**
 * Text helpers shared by the browser and the server (docs/SPEC.md 7, 8.3, A4, A9, A14).
 * Template and LLM text carries two placeholders: [[CHILD]] (the child's first name or
 * nickname, filled in only on the device) and [[GROWNUP]] (the first family word, or
 * "your grown-up" when the family list is empty).
 */
import type { ChildProfile, Question, Sentence, ValuesProfile } from './types';

export const CHILD_TOKEN = '[[CHILD]]';
export const GROWNUP_TOKEN = '[[GROWNUP]]';
export const DEFAULT_GROWNUP = 'your grown-up';

/** First family word chosen in onboarding, or "your grown-up". */
export function grownupWord(values: Pick<ValuesProfile, 'family'> | undefined | null): string {
  const first = values?.family?.find((w) => w.trim().length > 0);
  return first ? first.trim() : DEFAULT_GROWNUP;
}

function capitaliseSentenceStarts(text: string, word: string): string {
  if (!word || word[0] === word[0].toUpperCase()) return text;
  const cap = word[0].toUpperCase() + word.slice(1);
  // At the very start, or after . ! ? (optionally followed by a closing quote) and spaces.
  const re = new RegExp(`(^|[.!?]["'”’]?\\s+)${escapeRegExp(word)}`, 'g');
  return text.replace(re, (_m, pre: string) => `${pre}${cap}`);
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces the placeholders for display or speech. `name` is the child's name (or its
 * pronunciation when speaking). Without a child, [[CHILD]] becomes "your child".
 */
export function renderText(
  text: string,
  child: Pick<ChildProfile, 'name' | 'values'> | { name: string; values?: Pick<ValuesProfile, 'family'> } | null | undefined,
  opts: { speak?: boolean; pronunciation?: string } = {},
): string {
  const name = (opts.speak && opts.pronunciation?.trim()) || child?.name?.trim() || 'your child';
  const grownup = grownupWord(child?.values);
  let out = text.split(GROWNUP_TOKEN).join(grownup);
  out = capitaliseSentenceStarts(out, grownup);
  out = out.split(CHILD_TOKEN).join(name);
  return capitaliseSentenceStarts(out, name);
}

export function renderSentences(
  sentences: Sentence[],
  child: Parameters<typeof renderText>[1],
  opts?: Parameters<typeof renderText>[2],
): string[] {
  return sentences.map((s) => renderText(s.text, child, opts));
}

/** Plain text of a page, placeholders kept (what goes back to the server as page text). */
export function sentencesToText(sentences: Sentence[]): string {
  return sentences.map((s) => s.text.trim()).join(' ');
}

/** Number of words; a placeholder counts as one word. */
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** "Updated because Max asked: 'Will it hurt?'" (A14). */
export function updatedChipText(question: Pick<Question, 'text'>, name: string): string {
  const q = question.text.split(CHILD_TOKEN).join(name).trim();
  const short = q.length > 60 ? `${q.slice(0, 57).trimEnd()}…` : q;
  return `Updated because ${name} asked: '${short}'`;
}

/**
 * True when `text` contains one of `words` as a whole word or a word prefix
 * ("hurt" matches "hurts", not "shurt"). Case-insensitive. Used by the A9 check.
 */
export function containsAnyWord(text: string, words: readonly string[]): boolean {
  const hay = text.toLowerCase();
  return words.some((w) => {
    const needle = w.trim().toLowerCase();
    if (!needle) return false;
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}`, 'u').test(hay);
  });
}

/** Lower-cases the first letter: "Counting to ten" → "counting to ten". */
export function lowerFirst(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

/** Short slug for custom technique ids: 'custom:<slug>'. */
export function slugify(s: string, max = 40): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/g, '') || 'note'
  );
}
