/**
 * Colour palettes and night mode for the whole app (Settings > Colours).
 * The values live in app/globals.css; this file names them and decides which one is on.
 */
import type { Settings } from '@/lib/engine/types';

export type PaletteId = NonNullable<Settings['palette']>;
export type Mode = 'light' | 'night';

export const PALETTES: { id: PaletteId; label: string; hint: string }[] = [
  { id: 'warm', label: 'Warm', hint: 'Cream, indigo and honey' },
  { id: 'ocean', label: 'Ocean', hint: 'Sea blue and sand' },
  { id: 'forest', label: 'Forest', hint: 'Leaf green and sunshine' },
  { id: 'lavender', label: 'Lavender', hint: 'Soft violet and honey' },
];

export const DEFAULT_PALETTE: PaletteId = 'warm';

/** Browser colour (address bar) per palette and mode: the palette's --bg. */
export const THEME_COLOR: Record<PaletteId, Record<Mode, string>> = {
  warm: { light: '#fff9f0', night: '#1f1a2c' },
  ocean: { light: '#f1f8fb', night: '#0f1d25' },
  forest: { light: '#f4f8f0', night: '#121b14' },
  lavender: { light: '#f8f5fd', night: '#191427' },
};

/**
 * Night colours. 'auto' (the default) follows the device's dark mode, and also turns on at
 * bedtime, 19:00 to 06:00; 'on' and 'off' are the parent's own choice (header sun/moon button).
 */
export function isNight(mode: Settings['nightMode'], hour: number, systemDark = false): boolean {
  return mode === 'on' || (mode === 'auto' && (systemDark || hour >= 19 || hour < 6));
}

export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Whether the device asks for dark mode. False on the server and in old browsers. */
export function systemPrefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * The header toggle: flip what is on screen now. When the flipped mode is what 'auto' would show
 * anyway, go back to 'auto', so the app keeps following the device and bedtime from then on.
 */
export function toggledNightMode(mode: Settings['nightMode'], hour: number, systemDark: boolean): Settings['nightMode'] {
  const wantNight = !isNight(mode, hour, systemDark);
  return isNight('auto', hour, systemDark) === wantNight ? 'auto' : wantNight ? 'on' : 'off';
}

export function isPalette(v: unknown): v is PaletteId {
  return PALETTES.some((p) => p.id === v);
}

/** Last applied theme, read before the first paint by the script in app/layout.tsx. */
export const THEME_KEY = 'bds:theme';

export function applyTheme(palette: PaletteId, nightMode: Settings['nightMode'], hour: number, systemDark = systemPrefersDark()): Mode {
  const mode: Mode = isNight(nightMode, hour, systemDark) ? 'night' : 'light';
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.dataset.mode = mode;
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', THEME_COLOR[palette][mode]);
  try {
    window.localStorage.setItem(THEME_KEY, JSON.stringify({ palette, nightMode }));
  } catch {
    /* private mode: the theme still applies for this page */
  }
  return mode;
}

/**
 * Inline script for <head>: applies the saved palette before React starts, so a page never
 * flashes in the default colours. Kept tiny and dependency-free.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem('${THEME_KEY}')||'{}');var p=['warm','ocean','forest','lavender'].indexOf(t.palette)>=0?t.palette:'warm';var h=new Date().getHours();var d=false;try{d=matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}var n=t.nightMode==='on'||((t.nightMode||'auto')==='auto'&&(d||h>=19||h<6));var r=document.documentElement;r.dataset.palette=p;r.dataset.mode=n?'night':'light';}catch(e){}})();`;
