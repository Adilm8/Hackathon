import { AppShell } from '@/components/ui/AppShell';
import { ButtonLink } from '@/components/ui/Button';

/** Placeholder landing; the Screens stream replaces it with 4.3. */
export default function Landing() {
  return (
    <AppShell>
      <section className="mx-auto flex max-w-xl flex-col gap-6 py-10 text-center">
        <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
          Big day coming up? Get your child ready in 5 evenings
        </h1>
        <p className="text-base text-ink-soft">
          A short story each night, read aloud by you, that answers your child&apos;s own questions.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/start">Start for free</ButtonLink>
          <ButtonLink href="/home" variant="secondary">Try a sample</ButtonLink>
        </div>
      </section>
    </AppShell>
  );
}
