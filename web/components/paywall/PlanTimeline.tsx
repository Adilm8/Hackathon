import { addDays, dateLabel } from '@/lib/engine/clock';
import type { ISODate } from '@/lib/engine/types';
import { PLANS, formatUsd, type CheckoutPlan } from '@/lib/payments/plans';

export interface TimelineStep {
  when: string;
  title: string;
  text: string;
}

/**
 * "How it works" timeline with real dates (style guide, Trial timeline): what is charged
 * today, when the reminder comes, when it renews. Billing uses the real date, never the
 * Demo override. Pure, so it is unit-tested.
 */
export function timelineSteps(plan: CheckoutPlan, today: ISODate): TimelineStep[] {
  const p = PLANS[plan];
  // The year is added when it differs from this year, so "Nov 14" never reads as today.
  const on = (d: ISODate, weekday = true) =>
    dateLabel(d, { weekday }) + (d.slice(0, 4) !== today.slice(0, 4) ? `, ${d.slice(0, 4)}` : '');
  const now = formatUsd(p.amountCents);
  if (p.mode === 'payment') {
    const end = addDays(today, p.accessDays ?? 90);
    return [
      { when: `Today, ${dateLabel(today)}`, title: `${now}, one time`, text: 'Every chapter and the event-day card open at once.' },
      { when: on(end), title: 'Access ends', text: `You have ${p.accessDays} days to finish the story.` },
      { when: 'Never', title: 'No renewal', text: 'Nothing renews. We will never charge you again.' },
    ];
  }
  const renewal = formatUsd(p.renewalCents ?? p.amountCents);
  if (p.interval === 'month') {
    const next = addDays(today, 30);
    return [
      { when: `Today, ${dateLabel(today)}`, title: `${now} for the first month`, text: 'Every big day opens at once.' },
      { when: `About ${on(next, false)}`, title: `Renews at ${renewal}`, text: 'Then every month on the same day, until you cancel.' },
      { when: 'Anytime', title: 'Cancel in Settings', text: 'You keep access until the end of the month you paid for.' },
    ];
  }
  const end = addDays(today, 365);
  const remind = addDays(end, -(p.reminderDays ?? 30));
  return [
    { when: `Today, ${dateLabel(today)}`, title: `${now} for 12 months`, text: 'Every big day opens at once.' },
    { when: on(remind), title: 'Reminder', text: `${p.reminderDays ?? 30} days before renewal you get a reminder with the date and the price.` },
    { when: on(end), title: `Renews at ${renewal}`, text: 'Unless you cancel before this day in Settings.' },
  ];
}

export function PlanTimeline({ plan, today }: { plan: CheckoutPlan; today: ISODate }) {
  const steps = timelineSteps(plan, today);
  return (
    <section aria-labelledby="timeline-title" className="rounded-card border border-line bg-surface p-5">
      <h2 id="timeline-title" className="mb-4 font-display text-base font-extrabold">
        How it works
      </h2>
      <ol className="relative flex flex-col gap-5">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-4">
            <span aria-hidden className="relative flex flex-col items-center">
              <span
                className={`flex size-7 items-center justify-center rounded-pill text-xs font-extrabold ${
                  i === 0 ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink'
                }`}
              >
                {i + 1}
              </span>
              {i < steps.length - 1 && <span className="absolute top-8 h-[calc(100%+4px)] w-0.5 bg-line" />}
            </span>
            <span className="flex flex-col gap-0.5 pb-1">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{s.when}</span>
              <span className="font-extrabold">{s.title}</span>
              <span className="text-sm text-ink-soft">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
