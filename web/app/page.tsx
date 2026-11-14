import { Suspense } from 'react';
import { Character } from '@/components/character';
import { EventIcon } from '@/components/icons';
import { AppShell } from '@/components/ui/AppShell';
import { LandingActions, RedirectIfData } from '@/components/landing/LandingActions';

const STEPS = [
  { n: 1, title: 'Tell us about the big day', text: 'Name, age, the event and what worries your child. Two minutes, no sign-up.' },
  { n: 2, title: 'Read one short chapter a night', text: 'Your child asks questions, and the story answers them on the next page.' },
  { n: 3, title: 'Walk in ready', text: 'A "first, then" card for the day, and a badge to celebrate after.' },
];

const EVENTS = [
  ['dentist', 'Dentist'], ['school', 'First day at school'], ['flight', 'Flight'],
  ['sibling', 'New sibling'], ['haircut', 'Haircut'], ['shot', 'Shot'],
] as const;

/** Landing (docs/SPEC.md 4.3): static, no client data fetching. */
export default function Landing() {
  return (
    <AppShell>
      <Suspense>
        <RedirectIfData />
      </Suspense>
      <section className="grid items-center gap-8 py-4 sm:grid-cols-[1fr_1.1fr] sm:py-10">
        <div className="mx-auto w-48 sm:order-2 sm:w-72">
          <Character character={{ animal: 'bunny', color: 'blue', accessory: 'cap' }} mood="happy" />
        </div>
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            Big day coming up? Get your child ready in 5 evenings
          </h1>
          <p className="text-base text-ink-soft">
            A short story each night, read aloud by you, that answers your child&apos;s own questions. For kids 3 to 8.
          </p>
          <LandingActions />
          <p className="text-sm text-ink-soft">
            Judging or just curious? The sample shows the whole product in 3 minutes.
          </p>
        </div>
      </section>

      <section aria-labelledby="how" className="py-6">
        <h2 id="how" className="sr-only">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-card border border-line bg-surface p-5 shadow-step">
              <span className="flex size-10 items-center justify-center rounded-pill bg-primary font-display text-lg font-extrabold text-primary-ink">
                {s.n}
              </span>
              <h3 className="mt-3 text-lg font-extrabold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Big days we help with" className="py-4">
        <ul className="flex flex-wrap justify-center gap-2">
          {EVENTS.map(([type, label]) => (
            <li key={type} className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-4 py-2 text-sm font-bold">
              <EventIcon type={type} size={18} /> {label}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs text-ink-soft">
          Not therapy or medical advice. Your child&apos;s name is never sent to an AI provider.
        </p>
      </section>
    </AppShell>
  );
}
