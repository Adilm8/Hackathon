import type { ComponentProps, ReactNode } from 'react';

/** Labelled input with helper and error text under the field (docs/SPEC.md 4.5). */
export function Field({ label, helper, error, id, children }: { label: string; helper?: ReactNode; error?: string; id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs font-bold text-danger">{error}</p>
      ) : helper ? (
        <p id={`${id}-help`} className="text-xs text-ink-soft">{helper}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'min-h-btn-m w-full rounded-field border-2 border-line bg-surface px-4 text-base text-ink placeholder:text-ink-soft/70 ' +
  'focus:border-primary focus:outline-none aria-[invalid=true]:border-danger';

export function TextInput(props: ComponentProps<'input'>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: ComponentProps<'textarea'>) {
  return <textarea {...props} className={`${inputClass} min-h-28 py-3 ${props.className ?? ''}`} />;
}
