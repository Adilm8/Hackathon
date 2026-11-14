'use client';
import type { StyleMode } from '@/lib/engine/types';

/** Social story style (Carol Gray): first person, literal, no fantasy. A switch with a one-line explanation. */
export function StyleToggle({ value, onChange }: { value: StyleMode; onChange: (v: StyleMode) => void }) {
  const on = value === 'social';
  return (
    <div className="flex items-start gap-3">
      <button
        type="button" role="switch" aria-checked={on} aria-labelledby="style-toggle-label"
        onClick={() => onChange(on ? 'story' : 'social')}
        className={`relative mt-0.5 h-tap w-[72px] shrink-0 rounded-pill border-2 transition-colors ${
          on ? 'bg-primary border-primary' : 'bg-surface border-line'
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-surface shadow-step transition-[left] duration-fast ${
            on ? 'left-[34px]' : 'left-1'
          }`}
        />
      </button>
      <div>
        <p id="style-toggle-label" className="font-bold text-ink">Social story style</p>
        <p className="text-sm text-ink-soft">
          Short, literal sentences in the child&apos;s own voice (&ldquo;I will sit in the chair&rdquo;), with no animals or make-believe.
          Helpful for children who like things predictable.
        </p>
      </div>
    </div>
  );
}
