import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/** Button from the style guide (section 3): primary with a bottom "step", secondary, ghost; sizes M 48 px and L 56 px. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'm' | 'l';

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-extrabold text-button select-none ' +
  'transition-[transform,box-shadow,background-color] duration-fast ease-soft ' +
  'disabled:opacity-50 disabled:pointer-events-none active:translate-y-[2px]';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink shadow-step-primary active:shadow-none hover:brightness-105',
  secondary: 'bg-surface text-ink border-2 border-line shadow-step active:shadow-none',
  ghost: 'bg-transparent text-primary-text hover:bg-surface-2',
  danger: 'bg-danger text-white shadow-step active:shadow-none',
};

const sizes: Record<ButtonSize, string> = {
  m: 'min-h-btn-m px-6',
  l: 'min-h-btn-l px-8 w-full',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'm', extra = ''): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim();
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode; className?: string };

export function Button({ variant, size, className, ...rest }: Common & ComponentProps<'button'>) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant, size, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
