import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SettingsSchema } from '@/lib/engine/schemas';
import { isNight, PALETTES, THEME_COLOR } from '@/lib/theme';

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8');

function tokens(palette: string, mode: string): Record<string, string> {
  const m = css.match(new RegExp(`\\[data-palette="${palette}"\\]\\[data-mode="${mode}"\\]\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`no block for ${palette} ${mode}`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((x) => [x[1], x[2]]));
}

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [text, background, minimum]: WCAG AA (4.5 normal text, 3 for large bold labels and focus rings)
const PAIRS: [string, string, number][] = [
  ['ink', 'bg', 4.5], ['ink', 'surface', 4.5], ['ink', 'surface-2', 4.5],
  ['ink-soft', 'bg', 4.5], ['ink-soft', 'surface', 4.5], ['ink-soft', 'surface-2', 4.5],
  ['primary-text', 'bg', 4.5], ['primary-text', 'surface', 4.5],
  ['primary-ink', 'primary', 3], ['accent-ink', 'accent', 4.5], ['success-ink', 'success', 4.5],
  ['danger-ink', 'danger', 3], ['focus', 'bg', 3],
];

describe('colour palettes', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'night'] as const) {
      it(`${p.id} ${mode} keeps WCAG AA contrast`, () => {
        const t = tokens(p.id, mode);
        for (const [fg, bg, min] of PAIRS) {
          expect(t[fg], `${fg} missing`).toBeDefined();
          expect(ratio(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
        }
        expect(THEME_COLOR[p.id][mode]).toBe(t.bg);
      });
    }
  }

  it('turns night colours on after 7 pm in auto, always with on, never with off', () => {
    expect(isNight('auto', 19)).toBe(true);
    expect(isNight('auto', 5)).toBe(true);
    expect(isNight('auto', 12)).toBe(false);
    expect(isNight('on', 12)).toBe(true);
    expect(isNight('off', 23)).toBe(false);
  });

  it('accepts settings saved before palettes existed', () => {
    expect(SettingsSchema.safeParse({ textSize: 'm', nightMode: 'auto', schemaVersion: 1 }).success).toBe(true);
    expect(SettingsSchema.safeParse({ textSize: 'm', nightMode: 'auto', palette: 'ocean', schemaVersion: 1 }).success).toBe(true);
    expect(SettingsSchema.safeParse({ textSize: 'm', nightMode: 'auto', palette: 'pink', schemaVersion: 1 }).success).toBe(false);
  });
});

describe('dark mode toggle', () => {
  it('auto follows the device dark mode', async () => {
    const { isNight } = await import('@/lib/theme');
    expect(isNight('auto', 12, true)).toBe(true);
    expect(isNight('off', 12, true)).toBe(false);
  });
  it('flips the mode on screen and returns to auto when that matches', async () => {
    const { toggledNightMode } = await import('@/lib/theme');
    expect(toggledNightMode('auto', 12, false)).toBe('on');
    expect(toggledNightMode('on', 12, false)).toBe('auto');
    expect(toggledNightMode('auto', 12, true)).toBe('off');
    expect(toggledNightMode('off', 12, true)).toBe('auto');
    expect(toggledNightMode('auto', 21, false)).toBe('off');
  });
});
