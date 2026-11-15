import type { CharacterColor } from '@/lib/engine/types';
import { CLOTHES_SWATCH } from './art/generated';

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

/**
 * Outfit colours (SPEC 6), the main tone of each swatch the avatar pipeline recolours to
 * (web/scripts/avatar/colors.json).
 */
export const CLOTHES = Object.fromEntries(
  Object.entries(CLOTHES_SWATCH).map(([k, v]) => [k, v.main]),
) as Record<CharacterColor, string>;
