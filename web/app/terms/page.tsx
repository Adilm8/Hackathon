import type { Metadata } from 'next';
import { AppShell } from '@/components/ui/AppShell';

export const metadata: Metadata = { title: 'Terms' };

/** Terms (docs/SPEC.md 4.16, 10.5). */
export default function TermsPage() {
  return (
    <AppShell>
      <article className="mx-auto flex max-w-2xl flex-col gap-4 text-base leading-relaxed">
        <h1 className="font-display text-2xl font-extrabold">Terms</h1>
        <p><strong>Not therapy or medical advice.</strong> Big Day Stories helps parents prepare a child for an everyday event. It does not diagnose or treat anything. Ask a doctor or a qualified professional about health or behaviour.</p>
        <p><strong>AI-generated stories.</strong> Stories are written by an AI model following our rules and templates. A parent reads them first and stays in charge. Sensitive questions go to you before your child hears an answer.</p>
        <p><strong>Who can use it.</strong> Parents and guardians aged 18 or over.</p>
        <p><strong>Payments.</strong> The Event Pack ($9.99) is a one-time payment with no renewal and covers one big day for 90 days.</p>
        <p><strong>Automatic renewal.</strong> Family Year renews automatically at $49 per year, and Monthly at $7.99 per month, until you cancel. We remind you 30 days before a yearly renewal. Cancel anytime in Settings → Subscription; access continues until the end of the paid period.</p>
        <p><strong>Your data.</strong> See Privacy. You can delete everything in one tap.</p>
        <p className="text-sm text-ink-soft">This product is in test mode during the Business Cup 2.0 hackathon; no real payments are taken.</p>
      </article>
    </AppShell>
  );
}
