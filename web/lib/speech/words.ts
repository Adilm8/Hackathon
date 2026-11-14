/**
 * Word timing for the read-along highlight (docs/SPEC.md 4.7, 11.6). Pure functions, no DOM.
 *
 * Browser voices report word boundaries for most local voices (`onboundary`), but network
 * voices and some platforms do not. When no boundary arrives, the reader estimates where the
 * voice is from the time since the sentence started, so the highlight still moves.
 */

export type WordToken = { text: string; start: number };

/** Splits a sentence into words (with their trailing punctuation) and their char offsets. */
export function splitWords(text: string): WordToken[] {
  const out: WordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ text: m[0], start: m.index });
  return out;
}

/** Index of the word that contains (or starts after) `charIndex`. */
export function wordAtChar(words: WordToken[], charIndex: number): number {
  let idx = 0;
  for (let i = 0; i < words.length; i++) {
    if (words[i].start <= charIndex) idx = i;
    else break;
  }
  return idx;
}

/**
 * Maps a word index in the spoken text to the displayed text. They can differ when a name is
 * spoken by its pronunciation ("Zoë" read as "Zo ee"), so the position is scaled.
 */
export function mapWordIndex(spokenIdx: number, spokenCount: number, shownCount: number): number {
  if (shownCount <= 0) return 0;
  if (spokenCount <= 1 || spokenCount === shownCount) return Math.min(spokenIdx, shownCount - 1);
  return Math.min(shownCount - 1, Math.max(0, Math.round((spokenIdx * (shownCount - 1)) / (spokenCount - 1))));
}

/**
 * Estimated start time (ms from the start of the sentence) of each word at the given rate.
 * About 165 words a minute at rate 1, longer words take longer, commas and dashes add a pause.
 */
export function estimateWordStarts(words: WordToken[], rate = 1): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const w of words) {
    starts.push(Math.round(t / rate));
    const letters = w.text.replace(/[^\p{L}\p{N}]/gu, '').length;
    t += 150 + 48 * letters;
    if (/[,;:—–-]$/.test(w.text)) t += 220;
  }
  return starts;
}

/** Index of the word spoken `elapsed` ms into the sentence, by the estimate. */
export function wordAtTime(starts: number[], elapsed: number): number {
  let idx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= elapsed) idx = i;
    else break;
  }
  return idx;
}
