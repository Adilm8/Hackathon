'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Character } from '@/components/character';
import { PlanTools } from '@/components/eventday/PlanTools';
import { StoryPath } from '@/components/home/StoryPath';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { dateLabel, weekdayLabel } from '@/lib/engine/clock';
import type { Chapter } from '@/lib/engine/types';
import { buildPath } from '@/lib/home/path';
import { useEventCtx } from '@/lib/store/hooks';
import { canReadAhead, countdownText, eventLabel, eventPhase, readProgress } from '@/lib/store/engine';

/** Plan and countdown (docs/SPEC.md 4.6): the same path of evenings as the home page, plus reminders and links. */
export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  return <Screen>{() => <Plan id={id} />}</Screen>;
}

function Plan({ id }: { id: string }) {
  const ctx = useEventCtx(id);
  const router = useRouter();
  const [lockedCh, setLockedCh] = useState<Chapter | null>(null);
  if (!ctx) return <PlanNotFound />;
  const { event, child, template, today, hasAccess } = ctx;
  const p = readProgress(event);
  const phase = eventPhase(event, today);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/home" className="-mb-3 inline-flex min-h-tap items-center gap-1 self-start rounded-pill pr-3 text-sm font-bold text-primary-text hover:bg-surface-2">
        <Icon name="chevron-left" size={18} /> All big days
      </Link>
      <header className="flex items-center gap-4">
        <Character character={child.character} mood={phase === 'day' ? 'brave' : 'calm'} size={96} decorative />
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-sm font-bold text-ink-soft">{eventLabel(event, template)} · {dateLabel(event.date, { weekday: true })}</p>
          <h1 className="font-display text-2xl font-extrabold leading-tight">{countdownText(event, template, today)}</h1>
          <p className="text-sm text-ink-soft">{p.read} of {p.total} evenings read</p>
        </div>
      </header>

      {phase === 'day' && <PhaseCard href={`/event/${id}/day`} title="Today is the big day" cta="Open today’s card" />}
      {phase === 'after' && <PhaseCard href={`/event/${id}/checkin`} title="How did it go?" cta="Tell us in 30 seconds" />}

      <StoryPath
        nodes={buildPath(event, today, hasAccess)}
        child={child}
        onLocked={(n) => {
          const ch = event.chapters.find((c) => c.index === n.chapter);
          if (ch) setLockedCh(ch);
        }}
      />

      <PlanTools event={event} label={eventLabel(event, template)} prep={phase === 'prep'} />

      <Sheet
        open={!!lockedCh}
        onOpenChange={(v) => !v && setLockedCh(null)}
        title={lockedCh ? `This chapter opens on ${weekdayLabel(lockedCh.date, 'long')} evening` : ''}
        description="One chapter a night works best: it gives your child time to think and to ask."
      >
        {lockedCh && canReadAhead(lockedCh, event, today, hasAccess) ? (
          <Button size="l" onClick={() => router.push(`/event/${id}/read/${lockedCh.index}`)}>Read ahead</Button>
        ) : (
          <Button size="l" variant="secondary" onClick={() => setLockedCh(null)}>Okay</Button>
        )}
      </Sheet>
    </div>
  );
}

function PhaseCard({ href, title, cta }: { href: string; title: string; cta: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-card border-2 border-accent bg-surface p-4 shadow-step">
      <span className="text-lg font-extrabold">{title}</span>
      <span className="font-bold text-primary-text">{cta} →</span>
    </Link>
  );
}
