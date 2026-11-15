/**
 * Story frames (cartoon mode, SPEC 17.2 "generated illustrations"): a picture drawn for the words of
 * one page, in the same picture-book style as the painted scenes (content/illustrations/prompts.json).
 * The child's name never goes in: [[CHILD]] becomes "the child", [[GROWNUP]] "the grown-up". The
 * picture shows the place and the things in the sentence, never people, because the Story friend is
 * drawn on top in SVG and must stay the only character.
 */
import prompts from '../../content/illustrations/prompts.json';
import type { EventType } from '../engine/types';

export const FRAME_MAX_CHARS = 420;

/** The page text as the image model sees it: placeholders replaced, trimmed to a safe length. */
export function frameText(sentences: string[]): string {
  const text = sentences
    .join(' ')
    .replace(/\[\[CHILD\]\]/g, 'the child')
    .replace(/\[\[GROWNUP\]\]/g, 'the grown-up')
    .replace(/[<>{}\[\]`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > FRAME_MAX_CHARS ? `${text.slice(0, FRAME_MAX_CHARS).replace(/\s+\S*$/, '')}…` : text;
}

export function framePrompt(sentences: string[], type: EventType): string {
  const place = (prompts.events as Record<string, { place: string }>)[type]?.place ?? 'a friendly place for a big day';
  const scene = `A picture-book scene for this moment of a bedtime story set in ${place}: "${frameText(sentences)}". Draw the place and the objects the words mention, as an empty room or scene: no people and no animals in the picture.`;
  return [scene, prompts.style, prompts.format, prompts.avoid].join('\n\n');
}
