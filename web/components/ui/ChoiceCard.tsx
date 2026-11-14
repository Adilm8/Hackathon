import type { ReactNode } from 'react';

/** Choice tile of the style guide: icon, title, caption; selected = primary border. Used as radio or checkbox. */
export function ChoiceCard({
  selected, onSelect, icon, title, caption, disabled, role = 'radio', className = '',
}: {
  selected: boolean; onSelect: () => void; icon?: ReactNode; title: string; caption?: string;
  disabled?: boolean; role?: 'radio' | 'checkbox'; className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`relative flex min-h-tap items-center gap-3 rounded-card border-2 bg-surface p-3 text-left shadow-step transition-colors duration-fast
        ${selected ? '!border-primary bg-surface-2 ring-2 ring-primary/30' : 'border-line hover:border-ink-soft/40'} disabled:opacity-50 ${className}`}
    >
      {icon && <span className="flex size-10 shrink-0 items-center justify-center text-2xl" aria-hidden>{icon}</span>}
      <span className="flex flex-col">
        <span className="text-base font-bold leading-tight">{title}</span>
        {caption && <span className="text-xs text-ink-soft">{caption}</span>}
      </span>
      {selected && (
        <span aria-hidden className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-ink">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
        </span>
      )}
    </button>
  );
}
