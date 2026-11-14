import type { ReactNode } from 'react';

/** Pill chip: a toggle (aria-pressed) when onToggle is given, a static label otherwise. */
export function Chip({ children, selected, onToggle, tone = 'neutral' }: { children: ReactNode; selected?: boolean; onToggle?: () => void; tone?: 'neutral' | 'accent' | 'success' }) {
  const toneCls = tone === 'accent' ? 'bg-accent text-accent-ink border-accent' : tone === 'success' ? 'bg-success/15 border-success/40' : '';
  if (!onToggle)
    return <span className={`inline-flex items-center gap-1 rounded-pill border border-line px-3 py-1 text-xs font-bold ${toneCls}`}>{children}</span>;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`inline-flex min-h-tap items-center gap-1 rounded-pill border-2 px-4 text-sm font-bold transition-colors duration-fast
        ${selected ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-surface hover:border-ink-soft/40'}`}
    >
      {children}
    </button>
  );
}
