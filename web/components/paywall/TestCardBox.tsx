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
    <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-dashed border-line bg-surface-2 p-4 text-sm">
      <span className="rounded-pill bg-accent px-2 py-0.5 text-xs font-extrabold text-accent-ink">Test mode</span>
      <span className="min-w-0 flex-1">
        No real money. Use card <span className="whitespace-nowrap font-mono font-bold">{CARD}</span>, any future date, any CVC.
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-tap items-center rounded-pill border-2 border-line px-4 font-bold hover:bg-surface"
      >
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}
