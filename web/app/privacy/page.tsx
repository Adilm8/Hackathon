import type { Metadata } from 'next';
import { AppShell } from '@/components/ui/AppShell';

export const metadata: Metadata = { title: 'Privacy · Big Day Stories' };

/** Privacy (docs/SPEC.md 4.16, FR-A4): fits one screen. */
export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="mx-auto flex max-w-2xl flex-col gap-4 text-base leading-relaxed">
        <h1 className="font-display text-2xl font-extrabold">Privacy</h1>
        <p><strong>What we collect.</strong> Your child&apos;s first name or nickname (never a last name), age, the big day and its date, the worries you pick, the questions your child asks in the story, and your check-ins.</p>
        <p><strong>Where it is stored.</strong> In our database and in this browser. Place photos and voice recordings stay only in this browser.</p>
        <p><strong>What AI providers receive.</strong> The story context without your child&apos;s name: age, the event, the worries and the questions. Providers we use do not train on this data.</p>
        <p><strong>Payments.</strong> Stripe handles payment. We never see or store card numbers.</p>
        <p><strong>How long we keep it.</strong> Until you delete it. Guest families not used for 12 months are removed; sample families after 7 days.</p>
        <p><strong>Delete everything.</strong> Settings → Delete all data removes our server copy and everything in this browser in one tap.</p>
        <p>We do not use your data for advertising. A parent or guardian enters everything; children do not use the app on their own.</p>
        <p className="text-sm text-ink-soft">Contact: the Big Day Stories team. A contact address is added before public launch.</p>
      </article>
    </AppShell>
  );
}
