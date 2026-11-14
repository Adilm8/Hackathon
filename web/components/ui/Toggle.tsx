'use client';
import * as Switch from '@radix-ui/react-switch';

/** Accessible switch (Radix UI, MIT) with a label and an optional one-line explanation. */
export function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="flex flex-col">
        <span className="text-base font-bold">{label}</span>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </label>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative mt-1 h-8 w-14 shrink-0 rounded-pill bg-line transition-colors duration-fast data-[state=checked]:bg-primary"
      >
        <Switch.Thumb className="block size-6 translate-x-1 rounded-pill bg-surface shadow transition-transform duration-fast ease-soft data-[state=checked]:translate-x-7" />
      </Switch.Root>
    </div>
  );
}
