'use client';
import { Icon } from '@/components/icons';
import { clock } from '@/lib/engine/clock';
import { useSettings } from '@/lib/store/settings';
import { systemPrefersDark, toggledNightMode } from '@/lib/theme';
import { useThemeMode } from '@/lib/useThemeMode';

/**
 * Sun/moon button in the top-right corner of every screen: switches between the light and night
 * colours of the chosen palette. The choice is saved with Settings; by default ('auto') the app
 * follows the device's dark mode and bedtime. Shows the mode it switches to.
 */
export function ThemeToggle({ quiet = false }: { quiet?: boolean }) {
  const mode = useThemeMode();
  const nightMode = useSettings((s) => s.nightMode);
  const setNightMode = useSettings((s) => s.setNightMode);
  const night = mode === 'night';
  return (
    <button
      type="button"
      onClick={() => setNightMode(toggledNightMode(nightMode, clock.hour(), systemPrefersDark()))}
      aria-label={night ? 'Switch to light mode' : 'Switch to dark mode'}
      title={night ? 'Light mode' : 'Dark mode'}
      className={`inline-flex size-tap shrink-0 items-center justify-center rounded-pill transition-colors hover:bg-surface-2 ${
        quiet ? 'text-ink-soft hover:text-ink' : ''
      }`}
    >
      <Icon name={night ? 'sun' : 'moon'} size={quiet ? 20 : 22} />
    </button>
  );
}
