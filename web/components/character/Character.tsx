import type { Character as CharacterSpec, Mood } from '@/lib/engine/types';
import {
  ACCESSORIES as ACCESSORY_IDS,
  ACCESSORY_NAME,
  ANIMALS as ANIMAL_IDS,
  ANIMAL_WORD,
  COLOR_NAME,
  COMPANION_NAME,
  HEADWEAR_NAME,
  OUTFIT_NAME,
  resolveCharacter,
  type ResolvedCharacter,
} from '@/lib/engine/character';
import { AVATAR_ART } from './art/generated';

/**
 * The Story friend (SPEC 11.4, art set "Moonlit Meadow", docs/design/avatar-prompts.md).
 * One SVG that stacks traced layers from public/avatar on a shared 240x300 canvas:
 * back accessory, species (fur variant), outfit (recoloured), face (mood), worn accessory,
 * headwear, held item, companion. The same drawing is used everywhere the friend appears.
 * Layer files are small static SVGs, cached by the browser and the service worker.
 */
export const MOODS: Mood[] = ['calm', 'worried', 'brave', 'happy'];
export const ANIMALS = ANIMAL_IDS;
export const ACCESSORIES = ACCESSORY_IDS;

const VIEW = { w: 240, h: 300 };
/** Head-and-shoulders crop for small avatars (child switcher, profile chips). */
const HEAD_BOX = { x: 36, y: 22, w: 168, h: 168 };

type Level = keyof typeof AVATAR_ART;

export interface CharacterProps {
  character: CharacterSpec;
  mood?: Mood;
  /** Width in px; the height follows the drawing. Omit to fill the parent's width. */
  size?: number;
  className?: string;
  /** True when the picture only decorates (nearby text already says it). */
  decorative?: boolean;
  /** 'head' crops to the head for small avatars. Default 'full'. */
  framing?: 'full' | 'head';
  /** Hide the companion (for very small slots). */
  noCompanion?: boolean;
}

export function characterAlt(character: CharacterSpec, mood: Mood = 'calm'): string {
  const r = resolveCharacter(character);
  const feel = { calm: 'calm', worried: 'a little worried', brave: 'brave', happy: 'happy' }[mood];
  const extras = [
    r.headwear !== 'none' ? HEADWEAR_NAME[r.headwear].toLowerCase() : '',
    r.accessory !== 'none' ? ACCESSORY_NAME[r.accessory].toLowerCase() : '',
  ].filter(Boolean);
  const buddy = r.companion !== 'none' ? `, with a ${COMPANION_NAME[r.companion].toLowerCase()} friend` : '';
  return `A ${feel} ${ANIMAL_WORD[r.animal]} in a ${COLOR_NAME[r.color]} ${OUTFIT_NAME[r.outfit].toLowerCase()}${
    extras.length ? ` with ${extras.join(' and ')}` : ''
  }${buddy}`;
}

/** Public URL of one layer; `variant` is a fur variant or an outfit colour. */
export function layerSrc(level: Level, id: string, variant?: string): string | null {
  const item = (AVATAR_ART[level] as Record<string, { ext: string; v: Record<string, string> }>)[id];
  if (!item) return null;
  const v = variant && item.v[variant] ? variant : 'default';
  const hash = item.v[v];
  if (!hash) return null;
  return `/avatar/${level}/${id}${v === 'default' ? '' : `--${v}`}.${item.ext}?v=${hash}`;
}

interface Layer {
  key: string;
  src: string | null;
}

export function characterLayers(r: ResolvedCharacter, mood: Mood, companion = true, heldItem = true): Layer[] {
  const acc = r.accessory !== 'none' ? r.accessory : null;
  const behind = acc ? 'behind' in AVATAR_ART.accessory[acc] : false;
  const held = acc === 'star-wand' || acc === 'lantern' || acc === 'plush-star';
  const accLayer = acc ? { key: 'accessory', src: layerSrc('accessory', acc, r.color) } : null;
  const layers: (Layer | null)[] = [
    behind ? accLayer : null,
    { key: 'species', src: layerSrc('species', r.animal, r.fur === 'classic' ? undefined : r.fur) },
    { key: 'outfit', src: layerSrc('outfit', r.outfit, r.color) },
    { key: 'face', src: layerSrc('expression', mood) },
    acc && !behind && !held ? accLayer : null,
    r.headwear !== 'none' ? { key: 'headwear', src: layerSrc('headwear', r.headwear, r.color) } : null,
    held && heldItem ? accLayer : null,
    companion && r.companion !== 'none' ? { key: 'companion', src: layerSrc('companion', r.companion) } : null,
  ];
  return layers.filter((l): l is Layer => !!l && !!l.src);
}

export function Character({ character, mood = 'calm', size, className, decorative, framing = 'full', noCompanion }: CharacterProps) {
  const r = resolveCharacter(character);
  const box = framing === 'head' ? HEAD_BOX : { x: 0, y: 0, ...VIEW };
  const full = framing === 'full';
  const layers = characterLayers(r, mood, !noCompanion && full, full);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      width={size}
      height={size ? Math.round((size * box.h) / box.w) : undefined}
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : characterAlt(character, mood)}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      data-animal={r.animal}
      data-mood={mood}
    >
      {layers.map((l) => (
        <image key={l.key} href={l.src!} x="0" y="0" width={VIEW.w} height={VIEW.h} preserveAspectRatio="none" />
      ))}
    </svg>
  );
}

export default Character;
