import type { ReactNode } from 'react';

/**
 * Plan card from the style guide (section 3, Quizlet reference): name, large price,
 * small fine print, a "Best value" badge on the highlighted plan, a short list of ticks.
 * It is one option of a radio group; the whole card is the tap target.
 */
export function PlanCard({
  name,
  price,
  per,
  fine,
  perks,
  badge,
  selected,
  onSelect,
  children,
}: {
  name: string;
  price: string;
  per: string;
  fine: string;
  perks: string[];
  badge?: string;
  selected: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-card border-2 bg-surface p-5 pt-6 shadow-step transition-colors duration-fast ${
        selected ? 'border-accent' : 'border-line'
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-5 rounded-pill bg-accent px-3 py-0.5 text-xs font-extrabold text-accent-ink">
          {badge}
        </span>
      )}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex flex-col gap-3 text-left after:absolute after:inset-0 after:rounded-card after:content-['']"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="font-display text-lg font-extrabold">{name}</span>
          <span
            aria-hidden
            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-pill border-2 ${
              selected ? 'border-accent bg-accent' : 'border-line'
            }`}
          >
            {selected && <span className="size-2.5 rounded-pill bg-accent-ink" />}
          </span>
        </span>
        <span className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-extrabold">{price}</span>
          <span className="text-sm font-bold text-ink-soft">{per}</span>
        </span>
        <span className="text-xs text-ink-soft">{fine}</span>
        <ul className="flex flex-col gap-2 text-sm">
          {perks.map((p) => (
            <li key={p} className="flex gap-2">
              <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </button>
      {children && <div className="relative z-10 mt-4">{children}</div>}
    </div>
  );
}
