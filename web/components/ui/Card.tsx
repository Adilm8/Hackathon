import type { ComponentProps } from 'react';

/** Card from the style guide: radius 20 px, bottom "step" shadow. */
export function Card({ className = '', ...rest }: ComponentProps<'div'>) {
  return <div className={`rounded-card bg-surface border border-line shadow-step p-4 ${className}`} {...rest} />;
}
