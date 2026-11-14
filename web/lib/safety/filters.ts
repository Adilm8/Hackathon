/**
 * Level 1 of the safety layer (docs/SPEC.md 8.6): runs in the browser and again on the server,
 * before any text can reach a model.
 *
 * - cut to the length limit;
 * - remove markup and control characters;
 * - replace the child's name (and its pronunciation) with [[CHILD]];
 * - remove phones, emails, URLs and street addresses by pattern;
 * - classify by the word lists in ./stoplist: unsafe → nothing is sent; sensitive → category is fixed;
 *   attempts to change the rules, rude words and non-English text → a kind redirect without a model call.
 *
 * Profanity detection uses the `obscenity` package (MIT, github.com/jo3-l/obscenity), which handles
 * leetspeak and repeated letters better than a hand-written list.
 */
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';
import type { Topic } from '../engine/types';
import { matchRedirect, matchSensitive, matchUnsafe, normalise } from './stoplist';

/** Length limits of free text that may reach a prompt (8.1). */
export const LIMITS = {
  question: 120,
  customFear: 40,
  customLabel: 40,
  photoCaption: 60,
  customTechnique: 60,
} as const;

export const CHILD_TOKEN = '[[CHILD]]';
export const GROWNUP_TOKEN = '[[GROWNUP]]';

export type Redaction = 'name' | 'phone' | 'email' | 'url' | 'address' | 'markup';

export interface CleanResult {
  text: string;
  redacted: Redaction[];
  truncated: boolean;
}

export interface CleanOptions {
  max: number;
  /** The child's first name or nickname; replaced by [[CHILD]]. */
  childName?: string;
  /** How the name is spoken; replaced too. */
  pronunciation?: string;
  /** Keep [[CHILD]] and [[GROWNUP]] (text of our own pages sent back by the browser). */
  keepPlaceholders?: boolean;
}

const STREET_SUFFIX =
  'street|st|avenue|ave|road|rd|lane|ln|boulevard|blvd|drive|dr|court|ct|way|place|pl|terrace|ter|circle|cir|parkway|pkwy|highway|hwy|square|sq|trail|trl';

const PATTERNS: { kind: Redaction; re: RegExp }[] = [
  { kind: 'email', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { kind: 'url', re: /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|ai|app|gov|edu|us|co|info|biz)\b(?:\/\S*)?/gi },
  // US-style phone numbers, with or without country code and separators; also 7+ digit runs.
  { kind: 'phone', re: /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\b\d[\d\s.-]{6,}\d\b/g },
  // "12 Oak St", "12 Oak Street", "1600 Pennsylvania Avenue NW", "apt 4", "PO Box 12"
  { kind: 'address', re: new RegExp(`\\b\\d{1,6}\\s+(?:[A-Za-z0-9'.-]+\\s+){0,3}(?:${STREET_SUFFIX})\\b\\.?(?:\\s+(?:n|s|e|w|ne|nw|se|sw)\\b)?`, 'gi') },
  { kind: 'address', re: /\b(?:apt|apartment|unit|suite|p\.?\s?o\.?\s?box)\s*#?\s*\d+\w*\b/gi },
  { kind: 'address', re: /\b\d{5}(?:-\d{4})?\b/g }, // ZIP codes
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replaces every whole-word occurrence of the name (case-insensitive, any script) with [[CHILD]]. */
export function replaceName(text: string, name: string | undefined): { text: string; hit: boolean } {
  const n = (name ?? '').trim();
  if (n.length < 2) return { text, hit: false };
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(n)}(?:'s)?(?![\\p{L}\\p{N}])`, 'giu');
  let hit = false;
  const out = text.replace(re, (m) => {
    hit = true;
    return m.toLowerCase().endsWith("'s") ? `${CHILD_TOKEN}'s` : CHILD_TOKEN;
  });
  return { text: out, hit };
}

/** Removes tags, script-like content, control characters and our own placeholder syntax. */
function stripMarkup(text: string): { text: string; hit: boolean } {
  let hit = false;
  let out = text.replace(/<[^>]*>?/g, () => {
    hit = true;
    return ' ';
  });
  // A user must not be able to type our placeholders or data-block markers.
  out = out.replace(/\[\[|\]\]|<\/?data>/gi, () => {
    hit = true;
    return ' ';
  });
  out = out.replace(/[<>{}\\`]/g, () => {
    hit = true;
    return ' ';
  });
  // eslint-disable-next-line no-control-regex
  out = out.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ');
  return { text: out, hit };
}

/**
 * Cleans one piece of free text from a parent or a child. The result is what may be stored and shown
 * (with [[CHILD]] in place of the name) and what may be put into a prompt inside a <data> block.
 */
export function cleanText(input: string, opts: CleanOptions): CleanResult {
  const redacted = new Set<Redaction>();
  // Work on a generous slice first so a pasted 5,000-character text costs nothing.
  let text = String(input ?? '').slice(0, opts.max * 4);
  if (opts.keepPlaceholders) text = text.replaceAll(CHILD_TOKEN, '\uE000').replaceAll(GROWNUP_TOKEN, '\uE001');

  const markup = stripMarkup(text);
  text = markup.text;
  if (opts.keepPlaceholders) text = text.replaceAll('\uE000', CHILD_TOKEN).replaceAll('\uE001', GROWNUP_TOKEN);
  if (markup.hit) redacted.add('markup');

  for (const name of [opts.childName, opts.pronunciation]) {
    const r = replaceName(text, name);
    text = r.text;
    if (r.hit) redacted.add('name');
  }

  for (const { kind, re } of PATTERNS) {
    text = text.replace(re, () => {
      redacted.add(kind);
      return ' ';
    });
  }

  text = text.replace(/\s+/g, ' ').replace(/\s+([?.!,])/g, '$1').trim();

  let truncated = false;
  if (text.length > opts.max) {
    truncated = true;
    const cut = text.slice(0, opts.max);
    // Prefer a word boundary, keep the [[CHILD]] token whole.
    const lastSpace = cut.lastIndexOf(' ');
    text = (lastSpace > opts.max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/\[\[?[A-Z]*\]?$/, '').trim();
  }
  return { text, redacted: [...redacted], truncated };
}

/** True when nothing but spaces and punctuation is left. */
export function isBlank(text: string): boolean {
  return !/[\p{L}\p{N}]/u.test(text ?? '');
}

let matcher: RegExpMatcher | null = null;
function profanityMatcher(): RegExpMatcher {
  if (!matcher) {
    matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });
  }
  return matcher;
}

export function hasProfanity(text: string): boolean {
  return profanityMatcher().hasMatch(text);
}

/** True when most letters are outside the Latin script (the stories are in English). */
export function isMostlyNonLatin(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 3) return false;
  const latin = letters.filter((c) => /\p{Script=Latin}/u.test(c)).length;
  return latin / letters.length < 0.5;
}

export type PrecheckReason =
  | `unsafe:${string}`
  | `sensitive:${string}`
  | `redirect:${string}`
  | 'profanity'
  | 'non_english';

export interface Precheck {
  /** null = no decision in code; the model classifies. */
  category: 'unsafe' | 'sensitive' | 'off_topic' | null;
  topic?: Topic;
  reason?: PrecheckReason;
}

/**
 * Classification in code, before the model. Order matters: unsafe beats everything,
 * then sensitive, then the redirects. Runs on cleaned text.
 */
export function precheck(text: string): Precheck {
  const n = normalise(text);
  const unsafe = matchUnsafe(n);
  if (unsafe) return { category: 'unsafe', topic: unsafe.topic, reason: `unsafe:${unsafe.id}` };
  const sensitive = matchSensitive(n);
  if (sensitive) return { category: 'sensitive', topic: sensitive.topic, reason: `sensitive:${sensitive.id}` };
  const redirect = matchRedirect(n);
  if (redirect) return { category: 'off_topic', topic: 'other', reason: `redirect:${redirect.id}` };
  if (hasProfanity(text)) return { category: 'off_topic', topic: 'other', reason: 'profanity' };
  if (isMostlyNonLatin(text)) return { category: 'off_topic', topic: 'other', reason: 'non_english' };
  return { category: null };
}

/** Puts free text into a prompt safely: cleaned already, and nothing that could close the data block. */
export function dataBlock(text: string): string {
  return `<data>${String(text).replace(/[<>]/g, ' ').trim()}</data>`;
}
