'use client';

import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import type { Workspace } from '@/lib/engine/types';
import { announceEntitlements, paymentsApi } from '@/lib/payments/client';
import { PLANS, type CheckoutPlan } from '@/lib/payments/plans';

type State =
  | { kind: 'verifying' }
  | { kind: 'done'; plan: CheckoutPlan; eventId?: string }
  | { kind: 'error'; message: string; retry: boolean };

/** `/paid`: return from Stripe, verification with the server, success (docs/SPEC.md 4.11, 10.2). */
export function PaidScreen({ sessionId, workspace }: { sessionId: string | null; workspace: Workspace }) {
  const [state, setState] = useState<State>(
    sessionId ? { kind: 'verifying' } : { kind: 'error', message: 'This link has no payment in it.', retry: false },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // No "already started" guard: StrictMode runs the effect twice and cancels the first run,
    // so the second run must call verify again. Verify is idempotent on the session id.
    if (!sessionId) return;
    let alive = true;
    void (async () => {
      const r = await paymentsApi.verify(workspace, sessionId);
      if (!alive) return;
      if (r.ok) {
        announceEntitlements(r.data.entitlements);
        setState({ kind: 'done', plan: r.data.purchase.plan, eventId: r.data.purchase.eventId });
      } else {
        setState({ kind: 'error', message: r.message, retry: r.status !== 403 && r.status !== 404 });
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, workspace, attempt]);

  if (state.kind === 'verifying') {
    return (
      <div role="status" className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <span aria-hidden className="size-10 animate-spin rounded-pill border-4 border-line border-t-primary motion-reduce:animate-none" />
        <p className="text-base font-bold">Checking your payment…</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <h1 className="font-display text-xl font-extrabold">We couldn&apos;t confirm the payment</h1>
        <p role="alert" className="text-base text-ink-soft">
          {state.message}
        </p>
        {state.retry && (
          <Button
            onClick={() => {
              setState({ kind: 'verifying' });
              setAttempt((a) => a + 1);
            }}
          >
            Try again
          </Button>
        )}
        <ButtonLink href="/home" variant="ghost">
          Back to my plans
        </ButtonLink>
      </div>
    );
  }

  const p = PLANS[state.plan];
  const href = state.eventId ? `/event/${encodeURIComponent(state.eventId)}` : '/home';
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-pill bg-success text-white">
        <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 className="font-display text-xl font-extrabold">You&apos;re all set</h1>
      <p className="text-base text-ink-soft">
        {p.mode === 'payment'
          ? 'Every chapter of this big day and the event-day card are open now.'
          : `${p.name} is on. Every chapter of every big day is open now. You can cancel anytime in Settings.`}
      </p>
      <ButtonLink href={href} size="l">
        Continue the story
      </ButtonLink>
    </div>
  );
}
