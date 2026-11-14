'use client';
import { useEffect, useState } from 'react';
import { clock } from '@/lib/engine/clock';
import { useSettings } from '@/lib/store/settings';
import { applyTheme, DEFAULT_PALETTE } from '@/lib/theme';

/**
 * Keeps <html data-palette data-mode> in step with Settings on every screen. It waits for the
 * settings to load from storage, so the colours chosen before (applied by the head script) are
 * never replaced by the defaults; "After 7 pm" is checked again every minute.
 */
export function ThemeSync() {
  const [ready, setReady] = useState(() => useSettings.persist?.hasHydrated?.() ?? false);
  const palette = useSettings((s) => s.palette) ?? DEFAULT_PALETTE;
  const nightMode = useSettings((s) => s.nightMode);
  const clockOverride = useSettings((s) => s.clockOverride);
  const [tick, setTick] = useState(0);
  useEffect(() => useSettings.persist?.onFinishHydration?.(() => setReady(true)), []);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (ready) applyTheme(palette, nightMode, clock.hour());
  }, [ready, palette, nightMode, clockOverride, tick]);
  return null;
}
