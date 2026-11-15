'use client';
import { useEffect, useState } from 'react';
import { clock } from '@/lib/engine/clock';
import { useSettings } from '@/lib/store/settings';
import { applyTheme, DARK_QUERY, DEFAULT_PALETTE } from '@/lib/theme';

/**
 * Keeps <html data-palette data-mode> in step with Settings on every screen. It waits for the
 * settings to load from storage, so the colours chosen before (applied by the head script) are
 * never replaced by the defaults; "Auto" follows the device's dark mode and bedtime, checked again every minute.
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
    // Follow the device switching to dark mode (or back) while the app is open.
    const mq = window.matchMedia?.(DARK_QUERY);
    const onChange = () => setTick((n) => n + 1);
    mq?.addEventListener?.('change', onChange);
    return () => {
      window.clearInterval(id);
      mq?.removeEventListener?.('change', onChange);
    };
  }, []);
  useEffect(() => {
    if (ready) applyTheme(palette, nightMode, clock.hour());
  }, [ready, palette, nightMode, clockOverride, tick]);
  return null;
}
