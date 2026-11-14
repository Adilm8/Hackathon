'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Entitlement, Workspace } from '@/lib/engine/types';
import { paymentsApi } from '@/lib/payments/client';
import { PLANS, activeSubscription, formatUsd, ownsEventPack, renewalTerms } from '@/lib/payments/plans';

/**
 * "Add $39 and get the full year" on the badge screen (docs/SPEC.md 10.3).
 * Shown only to Big Day Pass owners without a subscription; renders nothing otherwise.
 */
export function UpgradeOffer({
  workspace,
  eventId,
  entitlements,
  now: nowProp,
  onRedirect,
}: {
  workspace: Workspace;
  eventId: string;
  entitlements: Entitlement[];
  now?: number;
  onRedirect?: (url: string) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [now] = useState(() => nowProp ?? Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ownsEventPack(entitlements, now) || activeSubscription(entitlements, now)) return null;
  const p = PLANS.upgrade;

  async function upgrade() {
    setBusy(true);
    setError(null);
    const r = await paymentsApi.checkout(workspace, 'upgrade', eventId, consent);
    if (r.ok) {
      (onRedirect ?? ((u: string) => window.location.assign(u)))(r.data.url);
      return;
    }
    setBusy(false);
    setError(r.message);
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-base font-extrabold">{p.headline}</h2>
      <p className="text-sm text-ink-soft">
        Your {PLANS.event.name} counts toward {p.name}: every big day for 12 months for {formatUsd(p.amountCents)} today.
      </p>
      <p className="text-xs text-ink-soft">{renewalTerms('upgrade')}</p>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]"
        />
        <span>I agree that it renews automatically at {formatUsd(p.renewalCents ?? 0)} per year until I cancel.</span>
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <Button onClick={upgrade} disabled={!consent || busy}>
        {busy ? 'Opening secure payment…' : `Upgrade for ${formatUsd(p.amountCents)}`}
      </Button>
    </Card>
  );
}
