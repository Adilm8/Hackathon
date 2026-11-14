import type { Animal, CharacterColor } from '@/lib/engine/types';

/** Mix two #rrggbb colours: `amount` 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, amount: number): string {
  const pa = parse(a);
  const pb = parse(b);
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * amount));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function parse(hex: string): number[] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export const INK = '#2b2a3a';

/** Clothes and accessory colours (the six values of SPEC 6, derived from the style guide). */
export const CLOTHES: Record<CharacterColor, string> = {
  blue: '#5b6cff',
  green: '#3dbe8b',
  yellow: '#ffc93c',
  red: '#e5565b',
  purple: '#9b6be8',
  orange: '#ff8a3d',
};

export const COLOR_LABEL: Record<CharacterColor, string> = {
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  purple: 'purple',
  orange: 'orange',
};

export interface FurSet {
  fur: string;
  inner: string;
  muzzle: string;
  nose: string;
}

/** Our own animals, drawn from simple shapes (no outside artwork). */
export const FUR: Record<Animal, FurSet> = {
  bunny: { fur: '#f5efe6', inner: '#f4b6c2', muzzle: '#ffffff', nose: '#ef8fa4' },
  bear: { fur: '#c98f5e', inner: '#e8be96', muzzle: '#ebc9a4', nose: '#3a2e2e' },
  fox: { fur: '#f1893a', inner: '#ffd9b0', muzzle: '#fff7ec', nose: '#2b2a3a' },
  kitten: { fur: '#b8b5c8', inner: '#f4b6c2', muzzle: '#e6e4ef', nose: '#ef8fa4' },
};

export const ANIMAL_LABEL: Record<Animal, string> = {
  bunny: 'bunny',
  bear: 'bear',
  fox: 'fox',
  kitten: 'kitten',
};
