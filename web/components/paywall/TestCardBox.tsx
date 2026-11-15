'use client';

import { useState } from 'react';

const CARD = '4242 4242 4242 4242';

/** "Test mode" box with the Stripe test card and a Copy button (docs/SPEC.md 4.11). */
export function TestCardBox() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(CARD.replace(/ /g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-card border-2 border-dashed border-line bg-surface-2 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-pill bg-accent px-2 py-0.5 text-xs font-extrabold text-accent-ink">Test mode</span>
        <span className="text-xs font-bold text-ink-soft">No real money</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-field border border-line bg-surface px-4 py-2">
        <span className="whitespace-nowrap font-mono text-base font-bold tracking-wide tabular-nums">{CARD}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Card number copied' : 'Copy the test card number'}
          className="inline-flex min-h-tap shrink-0 items-center rounded-pill border-2 border-line px-4 font-bold hover:bg-surface-2"
        >
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <p className="text-ink-soft">Any future date, any CVC, any ZIP.</p>
    </div>
  );
}
