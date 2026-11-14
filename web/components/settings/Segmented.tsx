'use client';
import { useId } from 'react';

/** Radio group drawn as big tappable pills (>= 44 px). */
export function Segmented<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold text-ink mb-1">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`min-h-tap inline-flex items-center rounded-pill border-2 px-4 font-bold cursor-pointer ${
              value === o.value ? 'border-primary bg-surface-2 text-ink' : 'border-line bg-surface text-ink-soft'
            } has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-focus`}
          >
            <input
              type="radio" name={name} className="sr-only"
              checked={value === o.value} onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {options.find((o) => o.value === value)?.hint && (
        <p className="text-xs text-ink-soft">{options.find((o) => o.value === value)?.hint}</p>
      )}
    </fieldset>
  );
}
