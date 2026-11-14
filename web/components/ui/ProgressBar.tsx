'use client';
import * as Progress from '@radix-ui/react-progress';

/** Progress bar of the style guide (top of the onboarding and the reader), with an optional back arrow. */
export function ProgressBar({ value, max, label, onBack }: { value: number; max: number; label: string; onBack?: () => void }) {
  const pct = Math.round((Math.min(value, max) / max) * 100);
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="inline-flex size-tap shrink-0 items-center justify-center rounded-pill text-ink-soft hover:bg-surface-2"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <Progress.Root value={pct} aria-label={label} className="relative h-4 flex-1 overflow-hidden rounded-pill bg-line">
        <Progress.Indicator
          className="h-full rounded-pill bg-success transition-transform duration-base ease-soft"
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </Progress.Root>
    </div>
  );
}
