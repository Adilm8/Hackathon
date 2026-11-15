/**
 * Choosing the reading voice (docs/SPEC.md 11.6). Pure functions over a voice-like shape, so they
 * are tested without a browser. Browsers list dozens of voices; most are robotic or not English.
 */
export type VoiceLike = { name: string; lang: string; voiceURI: string; localService: boolean; default?: boolean };

const norm = (lang: string) => lang.replace('_', '-').toLowerCase();

/** Higher is better for a bedtime story: natural or enhanced voices, warm well-known ones, US English first. */
export function voiceScore(v: VoiceLike): number {
  const lang = norm(v.lang);
  let s = 0;
  if (lang.startsWith('en-us')) s += 8;
  else if (lang.startsWith('en')) s += 4;
  if (/(natural|neural|premium|enhanced|siri)/i.test(v.name)) s += 4;
  if (/(samantha|ava|allison|zoe|evan|nicky|google us english|aria|jenny)/i.test(v.name)) s += 2;
  // Novelty voices shipped with Apple devices (Bells, Bubbles, Zarvox…) are never a good reader.
  if (/(bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|fred|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley)/i.test(v.name)) s -= 6;
  if (v.localService) s += 1;
  return s;
}

/** English voices only, best first. These are the choices shown in Settings. */
export function englishVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  return voices.filter((v) => norm(v.lang).startsWith('en')).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

/** The voice to read with: the parent's choice when this browser still has it, else the best English voice. */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], preferredURI?: string | null): T | null {
  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI);
    if (chosen) return chosen;
  }
  return englishVoices(voices)[0] ?? null;
}

/** Reading speeds offered in Settings. 0.92 is the tested default (A5). */
export const RATES = { slow: 0.78, normal: 0.92, fast: 1.06 } as const;
export type RateName = keyof typeof RATES;
