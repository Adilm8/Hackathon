'use client';

import Link from 'next/link';
import { useGoldHref } from '@/lib/store/hooks';

/**
 * A small "Part of Gold" line where a Gold-only extra would be (docs/SPEC.md 10.1).
 * Shows what the extra is and links to the Gold paywall; never a dead button.
 */
export function GoldNote({ what, className = '' }: { what: string; className?: string }) {
  const href = useGoldHref();
  return (
    <p className={`flex flex-wrap items-center gap-2 text-sm text-ink-soft ${className}`}>
      <span className="rounded-pill bg-accent px-2 py-0.5 text-xs font-extrabold text-accent-ink">Gold</span>
      <span>{what}</span>
      {href && (
        <Link href={href} className="inline-flex min-h-tap items-center font-bold text-primary-text underline">
          Get Gold
        </Link>
      )}
    </p>
  );
}
