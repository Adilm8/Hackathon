'use client';
import { useSyncExternalStore } from 'react';
import type { Mode } from '@/lib/theme';

/**
 * The mode on screen now (<html data-mode>, set by the head script and ThemeSync). Reading it from
 * the page keeps the header toggle, Settings and the reader in step with the device's dark mode.
 */
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  return () => obs.disconnect();
}
const read = (): Mode => (document.documentElement.dataset.mode === 'night' ? 'night' : 'light');

export function useThemeMode(): Mode {
  return useSyncExternalStore(subscribe, read, () => 'light');
}
