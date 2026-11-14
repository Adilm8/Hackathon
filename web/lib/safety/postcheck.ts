/**
 * Level 4 of the safety layer (docs/SPEC.md 8.6): checks every piece of model text before anyone sees it.
 * A hit means the caller replaces the text with the template fallback. Shared by the server and the tests.
 */
import { hasProfanity } from './filters';
import { COMMON_FIRST_NAMES, HONORIFICS, OUTPUT_PATTERNS, STOP_PHRASES, normalise } from './stoplist';

export interface PostcheckOptions {
  /** Family words of the values profile ("Dad", "Papa"); they may appear as names. */
  familyWords?: string[];
  /** Other capitalised words the template itself uses (labels, the hero's animal). */
  allowWords?: string[];
}

export interface Violation {
  kind: 'stop_phrase' | 'pattern' | 'name' | 'placeholder' | 'profanity';
  detail: string;
}

const ALLOWED_TOKENS = /\[\[(CHILD|GROWNUP)\]\]/g;

/** Returns every violation in one text. Empty array = clean. */
export function checkText(text: string, opts: PostcheckOptions = {}): Violation[] {
  const out: Violation[] = [];
  const n = normalise(text);

  for (const phrase of STOP_PHRASES) {
    if (n.includes(phrase)) out.push({ kind: 'stop_phrase', detail: phrase });
  }
  for (const { id, pattern } of OUTPUT_PATTERNS) {
    if (pattern.test(text)) out.push({ kind: 'pattern', detail: id });
  }

  // Only our two placeholders may appear; any other [[...]] or {...} means a broken template fill.
  const withoutTokens = text.replace(ALLOWED_TOKENS, '');
  if (/\[\[|\]\]|\{[a-z_]+\}/i.test(withoutTokens)) out.push({ kind: 'placeholder', detail: 'unknown placeholder' });

  if (hasProfanity(withoutTokens)) out.push({ kind: 'profanity', detail: 'profanity' });

  const name = findNameToken(withoutTokens, opts);
  if (name) out.push({ kind: 'name', detail: name });
  return out;
}

/**
 * Finds a name-like token other than [[CHILD]] and the family words:
 * an honorific followed by a capitalised word ("Dr. Molly"), or a common first name
 * written with a capital letter anywhere in the text.
 */
export function findNameToken(text: string, opts: PostcheckOptions = {}): string | null {
  const allowed = new Set([...(opts.familyWords ?? []), ...(opts.allowWords ?? [])].map((w) => w.toLowerCase()));
  const honor = new RegExp(`\\b(${HONORIFICS.join('|')})\\.?\\s+([A-Z][a-z]+)`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = honor.exec(text)) !== null) {
    const word = m[2];
    // "the doctor Says" is not a name; require a capital letter on the next word.
    if (word[0] !== word[0].toUpperCase()) continue;
    if (!allowed.has(word.toLowerCase()) && !/^(Bunny|Bear|Fox|Kitten|Tooth|Fairy)$/.test(word)) return `${m[1]} ${word}`;
  }
  for (const w of text.match(/\b[A-Z][a-z]+\b/g) ?? []) {
    const low = w.toLowerCase();
    if (COMMON_FIRST_NAMES.has(low) && !allowed.has(low)) return w;
  }
  return null;
}

/** True when every text is clean. */
export function allClean(texts: string[], opts: PostcheckOptions = {}): boolean {
  return texts.every((t) => checkText(t, opts).length === 0);
}
