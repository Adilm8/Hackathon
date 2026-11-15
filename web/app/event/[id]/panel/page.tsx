'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Icon } from '@/components/icons';
import { PanelView } from '@/components/panel/PanelView';
import { ChildSwitcher } from '@/components/home/ChildSwitcher';
import { clock } from '@/lib/engine/clock';
import { useEvents } from '@/lib/store/events';
import { switchChild } from '@/lib/store/children';
import { ButtonLink } from '@/components/ui/Button';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { useEventCtx } from '@/lib/store/hooks';
import { eventLabel, readProgress } from '@/lib/store/engine';
import { planHref } from '@/lib/home/path';

/** Parent panel (docs/SPEC.md 4.10), the dark parent room. */
export default function PanelPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Screen room="parent">
      {() => (
        <Suspense>
          <Panel id={id} />
        </Suspense>
      )}
    </Screen>
  );
}

function Panel({ id }: { id: string }) {
  const ctx = useEventCtx(id);
  const after = useSearchParams().get('after') === '1';
  const router = useRouter();
  const all = useEvents((s) => s.events);
  if (!ctx) return <PlanNotFound />;
  // Another child: open the panel of that child's nearest big day (or home when there is none).
  const onSwitch = (childId: string) => {
    const today = clock.today();
    const theirs = all.filter((e) => e.childId === childId).sort((a, b) => (a.date < b.date ? -1 : 1));
    const next = theirs.find((e) => e.date >= today && !e.checkin) ?? theirs.at(-1);
    if (!switchChild(childId, today)) return;
    router.push(next ? `/event/${encodeURIComponent(next.id)}/panel` : '/home');
  };
  const { event, child, template, hasAccess } = ctx;
  const p = readProgress(event);
  const asked = event.questions.filter((q) => q.category !== 'off_topic').length;
  return (
    <div className="flex flex-col gap-6">
      <ChildSwitcher onSwitch={onSwitch} compact />
      <p className="text-sm font-bold text-ink-soft">
        {eventLabel(event, template)} · {p.read} of {p.total} evenings read · {asked} {asked === 1 ? 'question' : 'questions'}
      </p>
      <PanelView event={event} child={child} template={template} today={ctx.today} />
      {!hasAccess && p.total > 1 ? (
        <section className="flex flex-col gap-3 rounded-card border-2 border-accent bg-surface p-5">
          <h2 className="text-lg font-extrabold">Keep going until the big day</h2>
          <p className="text-sm text-ink-soft">
            {p.total - 1} more {p.total - 1 === 1 ? 'chapter' : 'chapters'} that pick up {child.name}&apos;s questions, plus the card for the day.
          </p>
          <ButtonLink href={`/event/${id}/paywall`} size="l">{after ? 'Continue' : 'Unlock the full plan'}</ButtonLink>
        </section>
      ) : (
        <ButtonLink href={planHref(id)} size="l">
          <Icon name="book-open" size={20} /> Back to the plan
        </ButtonLink>
      )}
      {!hasAccess && p.total > 1 && (
        <ButtonLink href={planHref(id)} variant="ghost">Back to the plan</ButtonLink>
      )}
    </div>
  );
}
