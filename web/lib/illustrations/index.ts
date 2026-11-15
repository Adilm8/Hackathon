/**
 * Illustrated scenes (SPEC 11.4, 17.2 "generated illustrations"). One painted background per
 * event type and chapter beat, plus three neutral rooms. They are made ahead of time by
 * `npm run illustrations` (scripts/illustrations) from content/illustrations/prompts.json and
 * shipped as static files, so reading costs nothing, never waits for the network and never shows
 * an unchecked picture. The Story friend is drawn on top in SVG as before, so the character never
 * changes between pages. Anything missing falls back to the SVG scene.
 */
import type { BackgroundId, Beat, EventType } from '../engine/types';
import manifest from '../../content/illustrations/manifest.json';

export const NEUTRAL_SCENES = ['home-evening', 'outside', 'cosy-room'] as const;
export const BEATS: Beat[] = ['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal'];

type Manifest = { version: number; model?: string; files: Record<string, string> };
const files = (manifest as Manifest).files;

/**
 * The beat a page belongs to. A chapter covers one or two beats; its pages are split between them
 * in order.
 */
export function beatForPage(beats: Beat[], pageIndex: number, pageCount: number): Beat {
  if (beats.length === 0) return 'what_happens';
  const i = Math.floor((Math.max(0, pageIndex) * beats.length) / Math.max(1, pageCount));
  return beats[Math.min(i, beats.length - 1)];
}

/**
 * Which illustration a page shows. A neutral room the template uses away from the event (home,
 * outside, bedroom) gets the neutral picture; the event's own scene gets the picture of the beat.
 */
export function illustrationKey(type: EventType, background: BackgroundId, mainScene: BackgroundId, beat: Beat): string {
  if (background !== mainScene && (NEUTRAL_SCENES as readonly string[]).includes(background)) return `neutral/${background}`;
  return `events/${type}/${beat}`;
}

/** Public URL of a ready illustration, or null when it has not been made (the SVG scene shows). */
export function illustrationSrc(key: string): string | null {
  const v = files[key];
  return v ? `/illustrations/${key}.webp?v=${v}` : null;
}
