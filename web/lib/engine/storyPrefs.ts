/**
 * Helpers for the parent's story options (docs/story-customization.md) shared by the browser and
 * the server: labels for the option screens and the "words to avoid" rule.
 */
import type { ComfortKind, Experience, Interest, Sentence, StoryGenre, StoryLength } from './types';

export const LENGTH_OPTIONS: { id: StoryLength; label: string; hint: string }[] = [
  { id: 'short', label: 'Short', hint: 'About 1 minute, 3 pages' },
  { id: 'standard', label: 'Standard', hint: '2-3 minutes, 5 pages' },
  { id: 'long', label: 'Long', hint: '4-5 minutes, 7 pages' },
];

export const GENRE_OPTIONS: { id: StoryGenre; label: string; caption: string; prompt: string }[] = [
  {
    id: 'bedtime', label: 'Bedtime story', caption: 'Calm, cozy and slow, to fall asleep after',
    prompt: 'a bedtime story: calm, cozy and slow, soft sounds and warm images, the energy goes down towards the end of every chapter',
  },
  {
    id: 'funny', label: 'Funny adventure', caption: 'Playful, with small silly moments',
    prompt: 'a funny adventure: playful, with small silly moments and gentle surprises; the humor never makes fun of the worry or of the hero, and the event itself is never in danger',
  },
  {
    id: 'discover', label: 'Discover & grow', caption: 'How things work and why, with fun facts',
    prompt: 'a discover and grow story: the hero learns how things work and why (one true, simple, child-sized fact per chapter about the place, the tools or the body), and feels proud of knowing',
  },
  {
    id: 'values', label: 'Moral values', caption: 'Kindness, courage, patience, honesty',
    prompt: 'a story about values: one gentle lesson per chapter (kindness, patience, courage, honesty, saying thank you), shown through what the hero does, never preached; being scared is never wrong and never a lack of courage',
  },
  {
    id: 'fairy_tale', label: 'Fairy tale & magic', caption: 'Once upon a time, a gentle magical world',
    prompt: 'a fairy tale: "once upon a time" voice, a gentle magical world around the real event (a friendly talking animal, sparkles, a kind helper), but every real step stays true and recognisable, and magic never makes the event painless or skips a step',
  },
  {
    id: 'hero', label: 'Brave hero', caption: 'A small quest where the hero feels proud',
    prompt: 'a brave hero story: the visit is a small quest with steps to complete; bravery means doing it while feeling scared, never "not being scared"; no villains, monsters or danger',
  },
  {
    id: 'mindful', label: 'Calm & mindful', caption: 'Breathing, noticing, feeling the body',
    prompt: 'a calm and mindful story: slow pace, the hero notices breath, sounds and the body, with one simple breathing or grounding moment per chapter the child can copy while listening',
  },
];

/** Genres that need fantasy; a social story keeps to the real world and ignores the fantasy part. */
export const FANTASY_GENRES: StoryGenre[] = ['fairy_tale'];

export const EXPERIENCE_OPTIONS: { id: Experience; label: string; prompt: string }[] = [
  { id: 'first', label: 'First time', prompt: 'This is the first time. Explain each step as new, slowly, and say it is fine not to know.' },
  { id: 'went_fine', label: 'Been before, went fine', prompt: 'The child has done this before and it went fine. Remind the hero of that and build on what they already know.' },
  { id: 'was_hard', label: 'Been before, it was hard', prompt: 'Last time was hard. Say gently that last time felt big, that feelings are okay, and that this time there is a plan. Do not describe last time in detail.' },
];

export const COMFORT_OPTIONS: { id: ComfortKind; label: string }[] = [
  { id: 'teddy', label: 'Teddy or soft toy' },
  { id: 'blanket', label: 'Blanket' },
  { id: 'toy', label: 'Small toy' },
  { id: 'book', label: 'Book' },
];

export const INTEREST_OPTIONS: { id: Interest; label: string }[] = [
  { id: 'dinosaurs', label: 'Dinosaurs' },
  { id: 'space', label: 'Space' },
  { id: 'trains', label: 'Trains' },
  { id: 'animals', label: 'Animals' },
  { id: 'castles', label: 'Castles and knights' },
  { id: 'cars', label: 'Cars and trucks' },
  { id: 'ocean', label: 'The ocean' },
  { id: 'music', label: 'Music' },
  { id: 'sports', label: 'Sports' },
  { id: 'drawing', label: 'Drawing' },
  { id: 'bugs', label: 'Bugs' },
  { id: 'building', label: 'Building blocks' },
];

export const AFTER_IDEAS = ['A trip to the park', 'A favorite snack', 'Play time together', 'A video call with family'];

export const MAX_INTERESTS = 3;
export const MAX_MOMENTS = 2;
export const MAX_AVOID_WORDS = 3;
export const MAX_COMPANIONS = 2;

export function comfortLabel(kind: ComfortKind): string {
  return { teddy: 'soft toy', blanket: 'blanket', toy: 'small toy', book: 'favorite book' }[kind];
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches an avoided word or phrase, whole words, any case, with a plural -s/-es. */
export function avoidPattern(words: readonly string[]): RegExp | null {
  const parts = words.map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 2).map(escape);
  if (!parts.length) return null;
  return new RegExp(`(^|[^\\p{L}])(${parts.join('|')})(e?s)?(?=$|[^\\p{L}])`, 'iu');
}

/** [[CHILD]] and [[GROWNUP]] are filled in later; their token names must not count as words. */
const TOKENS = /\[\[[A-Z_]+\]\]/g;
const spoken = (text: string) => text.replace(TOKENS, ' ');

export function hasAvoidedWord(text: string, words: readonly string[] | undefined): boolean {
  const re = words?.length ? avoidPattern(words) : null;
  return !!re && re.test(spoken(text));
}

/** Sentences without any avoided word. */
export function withoutAvoided<S extends Pick<Sentence, 'text'>>(sentences: S[], words: readonly string[] | undefined): S[] {
  const re = words?.length ? avoidPattern(words) : null;
  return re ? sentences.filter((s) => !re.test(spoken(s.text))) : sentences;
}

/** Fallback pages with the avoided sentences taken out; a page left empty is dropped. */
export function pagesWithoutAvoided<P extends { sentences: Pick<Sentence, 'text'>[] }>(pages: P[], words: readonly string[] | undefined): P[] {
  if (!words?.length) return pages;
  return pages
    .map((p) => ({ ...p, sentences: withoutAvoided(p.sentences, words) }))
    .filter((p) => p.sentences.length > 0);
}
