/**
 * Prompts of the illustrated scenes (content/illustrations/prompts.json). Used by
 * scripts/illustrations and the tests only, so the prompt text never ships to the browser.
 */
import type { EventType } from '../engine/types';
import prompts from '../../content/illustrations/prompts.json';
import { BEATS, NEUTRAL_SCENES } from './index';

/** Event types that have their own prompts (all 15). */
export const ILLUSTRATED_EVENTS = Object.keys(prompts.events) as EventType[];

/** Every key the prompts describe: "events/<type>/<beat>" and "neutral/<scene>". */
export function allIllustrationKeys(): string[] {
  return [
    ...ILLUSTRATED_EVENTS.flatMap((t) => BEATS.map((b) => `events/${t}/${b}`)),
    ...NEUTRAL_SCENES.map((s) => `neutral/${s}`),
  ];
}

/** The text sent to the image model for a key. Never contains a child's name or any family data. */
export function illustrationPrompt(key: string): string | null {
  const [kind, a, b] = key.split('/');
  let scene: string | undefined;
  if (kind === 'neutral') scene = (prompts.neutral as Record<string, string>)[a];
  if (kind === 'events') {
    const ev = (prompts.events as Record<string, { place: string; beats: Record<string, string> }>)[a];
    if (ev?.beats[b]) scene = `Setting: ${ev.place}. ${ev.beats[b]}`;
  }
  if (!scene) return null;
  return [prompts.style, `SCENE: ${scene}`, prompts.format, prompts.avoid].join('\n\n');
}
