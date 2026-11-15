'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { clock } from '@/lib/engine/clock';
import type { Workspace } from '@/lib/engine/types';
import { isOn } from '@/lib/flags';
import { paymentsApi } from '@/lib/payments/client';
import { LEVELS, PLANS, formatUsd, isSubscription, renewalTerms, type CheckoutPlan } from '@/lib/payments/plans';
import { PlanCard } from './PlanCard';
import { PlanTimeline } from './PlanTimeline';
import { TestCardBox } from './TestCardBox';

export interface PaywallProps {
  workspace: Workspace;
  eventId: string;
  /** First name or nickname of the child, for the headline. */
  childName?: string;
  /** What the family has already seen, e.g. questions asked in chapter 1. */
  questionsAsked?: number;
  /** Chapters of this event, for "4 more chapters". */
  chaptersTotal?: number;
  /** Came back from a cancelled Stripe Checkout. */
  canceled?: boolean;
  /** "Not now" goes here (the plan). */
  backHref: string;
  /** Jury demo mode: the "Skip payment (demo access)" button of the sample (SPEC 10.4a). */
  demoSlot?: ReactNode;
  /** Redirect hook (tests). */
  onRedirect?: (url: string) => void;
  /** Came for a Gold extra (pictures, premium voice): only the Gold card is offered. */
  goldOnly?: boolean;
}

/**
 * Paywall (docs/SPEC.md 4.11, 10). Three levels (Free, Big Day Pass, Gold), two large options (Big Day Pass, Gold yearly) and a
 * small monthly line, a timeline with real dates, honest auto-renewal terms with a
 * required consent, the test card box. No timers, no pressure copy (N12).
 */
export function Paywall({
  workspace,
  eventId,
  childName,
  questionsAsked = 0,
  chaptersTotal,
  canceled = false,
  backHref,
  demoSlot,
  onRedirect,
  goldOnly = false,
}: PaywallProps) {
  const monthly = isOn('monthlyPlan');
  const [plan, setPlan] = useState<CheckoutPlan>('year');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = clock.realToday();
  const sub = isSubscription(plan);
  const p = PLANS[plan];
  const name = childName?.trim() || 'your child';
  const more = chaptersTotal && chaptersTotal > 1 ? `${chaptersTotal - 1} more chapters` : 'the rest of the story';

  function choose(next: CheckoutPlan) {
    setPlan(next);
    setError(null);
  }

  async function pay() {
    if (sub && !consent) {
      setError('Please tick the box to confirm the auto-renewal terms.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await paymentsApi.checkout(workspace, plan, eventId, sub ? consent : undefined);
    if (r.ok) {
      (onRedirect ?? ((u: string) => window.location.assign(u)))(r.data.url);
      return;
    }
    setBusy(false);
    setError(r.message);
  }

  const goldSelected = plan === 'year' || plan === 'month';
  const payLabel =
    plan === 'event' ? `Pay ${formatUsd(p.amountCents)}` : `Start ${p.name} for ${formatUsd(p.amountCents)}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
          {goldOnly ? `Make every big day richer for ${name}` : <>Keep {name}&apos;s story going</>}
        </h1>
        <p className="text-base text-ink-soft">
          {goldOnly ? 'Gold adds painted pictures, Cartoon mode, the Moon Storyteller voice and stories in your own voice, for every big day.' : null}
          {!goldOnly && questionsAsked > 0
            ? `${name === 'your child' ? 'Your child' : name} asked ${questionsAsked} ${questionsAsked === 1 ? 'question' : 'questions'} in chapter 1. `
            : ''}
          {!goldOnly && <>Unlock {more} and the event-day card.</>}
        </p>
      </header>

      {canceled && (
        <p role="status" className="rounded-card border border-line bg-surface p-4 text-center text-sm">
          Payment was cancelled. Nothing was charged.
        </p>
      )}

      <div role="radiogroup" aria-label="Choose a plan" className={`grid gap-5 pt-2 ${goldOnly ? 'mx-auto w-full max-w-md' : 'sm:grid-cols-2'}`}>
        {!goldOnly && <PlanCard
          name={PLANS.event.name}
          price={formatUsd(PLANS.event.amountCents)}
          per="once"
          fine={`For this big day. Access for ${PLANS.event.accessDays} days.`}
          perks={PLANS.event.perks}
          selected={plan === 'event'}
          onSelect={() => choose('event')}
        />}
        <PlanCard
          name={PLANS.year.name}
          price={plan === 'month' ? formatUsd(PLANS.month.amountCents) : formatUsd(PLANS.year.amountCents)}
          per={plan === 'month' ? 'a month' : 'a year'}
          fine={
            plan === 'month'
              ? `Billed monthly. ${formatUsd(PLANS.month.amountCents * 12)} over a year.`
              : `About ${formatUsd(Math.round(PLANS.year.amountCents / 12))} a month, billed yearly.`
          }
          perks={PLANS.year.perks}
          badge="Best value"
          selected={goldSelected}
          onSelect={() => choose(plan === 'month' ? 'month' : 'year')}
        >
          {monthly && (
            <div role="group" aria-label="Billing period" className="flex rounded-pill bg-surface-2 p-1 text-sm font-bold">
              {(['year', 'month'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={plan === id}
                  onClick={() => choose(id)}
                  className={`min-h-tap flex-1 rounded-pill px-3 ${plan === id ? 'bg-surface text-ink shadow-step' : 'text-ink-soft'}`}
                >
                  {id === 'year' ? 'Yearly' : `or ${formatUsd(PLANS.month.amountCents)} a month`}
                </button>
              ))}
            </div>
          )}
        </PlanCard>
      </div>

      <details className="rounded-card border border-line bg-surface p-4 text-sm">
        <summary className="min-h-tap cursor-pointer font-bold">Compare Free, {PLANS.event.name} and {PLANS.year.name}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-2 font-bold">What you get</th>
                <th scope="col" className="px-2 py-2 font-bold">Free</th>
                <th scope="col" className="px-2 py-2 font-bold">{PLANS.event.name}</th>
                <th scope="col" className="px-2 py-2 font-bold">{PLANS.year.name}</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((r) => (
                <tr key={r.feature} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-2 font-normal">{r.feature}</th>
                  {[r.free, r.pass, r.gold].map((v, i) => (
                    <td key={i} className={`px-2 py-2 ${v === '-' ? 'text-ink-soft' : 'font-bold'}`}>{v === '-' ? <span aria-label="no">–</span> : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <PlanTimeline plan={plan} today={today} />

      <section aria-label="Terms" className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">{renewalTerms(plan)}</p>
        {sub && (
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]"
            />
            <span>
              I agree that {p.name} renews automatically at {formatUsd(p.renewalCents ?? p.amountCents)}{' '}
              {p.interval === 'year' ? 'per year' : 'per month'} until I cancel.
            </span>
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <Button size="l" onClick={pay} disabled={busy || (sub && !consent)} aria-busy={busy}>
          {busy ? 'Opening secure payment…' : payLabel}
        </Button>
        <p className="text-center text-xs text-ink-soft">Secure payment by Stripe. We never see your card.</p>
      </section>

      <TestCardBox />

      {demoSlot}

      <Link href={backHref} className="mx-auto inline-flex min-h-tap items-center px-4 font-bold text-primary-text underline">
        Not now
      </Link>
    </div>
  );
}
