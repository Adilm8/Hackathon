'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dateLabel, fromDate } from '@/lib/engine/clock';
import type { Entitlement, Workspace } from '@/lib/engine/types';
import { paymentsApi } from '@/lib/payments/client';
import { PLANS, activeSubscription, formatUsd } from '@/lib/payments/plans';

/**
 * "Subscription" block of Settings (docs/SPEC.md 4.15, 10.5): the plan, the renewal or end
 * date, and Cancel subscription, which opens the Stripe customer portal.
 */
export function SubscriptionCard({
  workspace,
  entitlements,
  now: nowProp,
  onRedirect,
}: {
  workspace: Workspace;
  entitlements: Entitlement[];
  now?: number;
  onRedirect?: (url: string) => void;
}) {
  const [now] = useState(() => nowProp ?? Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sub = activeSubscription(entitlements, now);
  const passes = entitlements.filter((e) => e.plan === 'event' && e.expiresAt > now);

  async function manage() {
    setBusy(true);
    setError(null);
    const r = await paymentsApi.portal(workspace);
    if (r.ok) {
      (onRedirect ?? ((u: string) => window.location.assign(u)))(r.data.url);
      return;
    }
    setBusy(false);
    setError(r.message);
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-base font-extrabold">Subscription</h2>
      {!sub && passes.length === 0 && <p className="text-sm text-ink-soft">Free plan. Chapter 1 of every big day is free.</p>}
      {sub && (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-bold">
            {PLANS[sub.plan].name}, {formatUsd(PLANS[sub.plan].renewalCents ?? PLANS[sub.plan].amountCents)}{' '}
            {sub.plan === 'year' ? 'per year' : 'per month'}
          </p>
          <p className="text-ink-soft">
            {sub.renews
              ? `Renews on ${dateLabel(fromDate(new Date(sub.expiresAt)))}. You can cancel anytime before.`
              : `Cancelled. Access stays until ${dateLabel(fromDate(new Date(sub.expiresAt)))}. Nothing more will be charged.`}
          </p>
        </div>
      )}
      {passes.map((e) => (
        <p key={`${e.eventId}-${e.expiresAt}`} className="text-sm text-ink-soft">
          {PLANS.event.name} for one big day, open until {dateLabel(fromDate(new Date(e.expiresAt)))}. It does not renew.
        </p>
      ))}
      {sub?.renews && (
        <Button variant="secondary" onClick={manage} disabled={busy}>
          {busy ? 'Opening…' : 'Cancel subscription'}
        </Button>
      )}
      {sub && !sub.renews && (
        <Button variant="ghost" onClick={manage} disabled={busy}>
          Manage plan
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
