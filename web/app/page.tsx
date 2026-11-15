import { Suspense } from 'react';
import { Character } from '@/components/character';
import type { Character as CharacterT } from '@/lib/engine/types';

const SHOWCASE: CharacterT = {
  animal: 'dragon', color: 'purple', outfit: 'star-robe', headwear: 'wizard-hat', accessory: 'star-wand', companion: 'firefly', fur: 'classic',
};
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
  ['doctor', 'Doctor check-up'], ['blood_test', 'Blood test'], ['hospital', 'Hospital stay'],
  ['moving', 'Moving house'], ['sleepover', 'Sleepover'], ['babysitter', 'New babysitter'],
  ['swimming', 'Swimming lesson'], ['party', 'Birthday party'],
] as const;

/** Landing (docs/SPEC.md 4.3): static, no client data fetching. */
export default function Landing() {
  return (
    <AppShell>
      <Suspense>
        <RedirectIfData />
      </Suspense>
      <section className="grid items-center gap-8 py-4 sm:py-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="order-2">
          <div className="relative mx-auto max-w-sm rounded-card border border-line bg-surface p-4 shadow-pop">
            <div className="flex items-center justify-between gap-2 pb-3">
              <span className="rounded-pill bg-surface-2 px-3 py-1 text-xs font-extrabold text-primary-text">Chapter 1 · Tonight</span>
              <span className="rounded-pill bg-accent px-2.5 py-0.5 text-[11px] font-extrabold text-accent-ink">Preview</span>
            </div>
            <div className="flex items-center gap-4 rounded-card bg-surface-2 p-4">
              <div className="w-24 shrink-0">
                <Character character={SHOWCASE} mood="happy" />
              </div>
              <p className="text-sm font-bold leading-snug text-ink">
                &ldquo;Tomorrow we visit the friendly dentist chair. First we count your teeth, then you pick a sticker!&rdquo;
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-primary/50 bg-bg px-3 py-2 text-xs font-bold">
              <span className="text-ink-soft">Child asked: &ldquo;Will it hurt?&rdquo;</span>
              <span className="text-primary-text">Answered on page 2 →</span>
            </div>
          </div>
        </div>
        <div className="order-1 flex flex-col gap-5">
          <h1 className="text-balance font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            Big day coming up? Get your child ready in 5 evenings
          </h1>
          <p className="text-base text-ink-soft">
            For children 3 to 8. A short story each night, read aloud by you, that answers your child&apos;s own questions inside the story.
          </p>
          <LandingActions />
          <p className="text-sm text-ink-soft">
            Judging or just curious? The sample shows the whole product in 3 minutes.
          </p>
        </div>
      </section>

      <section aria-labelledby="how" className="py-8">
        <h2 id="how" className="font-display text-xl font-extrabold">How it works</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-4">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative flex gap-4 sm:flex-col sm:gap-3">
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-5 top-12 h-[calc(100%-2rem)] w-0.5 -translate-x-1/2 rounded-pill bg-line sm:left-12 sm:top-5 sm:h-0.5 sm:w-[calc(100%-2.5rem)] sm:translate-x-0 sm:-translate-y-1/2"
                />
              )}
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-pill bg-primary font-display text-lg font-extrabold text-primary-ink">
                {s.n}
              </span>
              <div className="min-w-0 pt-1.5 sm:pt-0">
                <h3 className="text-lg font-extrabold leading-snug">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
              </div>
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
