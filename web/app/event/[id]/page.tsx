'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Character } from '@/components/character';
import { CalendarButtons } from '@/components/eventday/CalendarButtons';
import { Icon, type IconName } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { dateLabel, weekdayLabel } from '@/lib/engine/clock';
import type { Chapter } from '@/lib/engine/types';
import { useEventCtx, type EventCtx } from '@/lib/store/hooks';
import { canReadAhead, chapterStatus, countdownText, eventLabel, eventPhase, readProgress, type ChapterStatus } from '@/lib/store/engine';

/** Plan and countdown (docs/SPEC.md 4.6), drawn as a path of evenings (style guide: Path). */
export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  return <Screen>{() => <Plan id={id} />}</Screen>;
}

const STATUS: Record<ChapterStatus, { label: string; icon: IconName; node: string }> = {
  read: { label: 'Read', icon: 'check', node: 'bg-success text-white border-success' },
  today: { label: 'Tonight', icon: 'book-open', node: 'bg-primary text-primary-ink border-primary-press' },
  catch_up: { label: 'Catch up', icon: 'book-open', node: 'bg-accent text-accent-ink border-accent' },
  locked: { label: 'Opens later', icon: 'moon', node: 'bg-surface-2 text-ink-soft border-line' },
  needs_pay: { label: 'Unlock', icon: 'lock', node: 'bg-surface-2 text-ink-soft border-line' },
};

function Plan({ id }: { id: string }) {
  const ctx = useEventCtx(id);
  const router = useRouter();
  const [lockedCh, setLockedCh] = useState<Chapter | null>(null);
  if (!ctx) return <PlanNotFound />;
  const { event, child, template, today, hasAccess } = ctx;
  const p = readProgress(event);
  const phase = eventPhase(event, today);

  const open = (ch: Chapter) => {
    const s = chapterStatus(ch, event, today, hasAccess);
    if (s === 'needs_pay') router.push(`/event/${id}/paywall`);
    else if (s === 'locked') setLockedCh(ch);
    else router.push(`/event/${id}/read/${ch.index}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Character character={child.character} mood={phase === 'day' ? 'brave' : 'calm'} size={96} decorative />
        <div>
          <p className="text-sm font-bold text-ink-soft">{eventLabel(event, template)} · {dateLabel(event.date, { weekday: true })}</p>
          <h1 className="font-display text-2xl font-extrabold leading-tight">{countdownText(event, template, today)}</h1>
          <p className="text-sm text-ink-soft">{p.read} of {p.total} evenings read</p>
        </div>
      </header>

      {phase === 'day' && <PhaseCard href={`/event/${id}/day`} title="Today is the big day" cta="Open today’s card" />}
      {phase === 'after' && <PhaseCard href={`/event/${id}/checkin`} title="How did it go?" cta="Tell us in 30 seconds" />}

      <ol aria-label="Chapters" className="relative flex flex-col gap-5 pl-2">
        <span aria-hidden className="absolute bottom-6 left-[2.15rem] top-6 w-1 rounded-pill bg-line" />
        {event.chapters.map((ch, k) => (
          <ChapterNode key={ch.index} ch={ch} ctx={ctx} offset={k % 2 === 1} onOpen={() => open(ch)} />
        ))}
      </ol>

      {phase === 'prep' && (
        <section aria-label="Reminders" className="flex flex-col gap-2">
          <p className="text-sm font-bold text-ink-soft">A reminder at 7:30 pm on each story evening</p>
          <CalendarButtons event={event} label={eventLabel(event, template)} />
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink href={`/event/${id}/panel`} variant="secondary">
          <Icon name="hand-heart" size={20} /> Parent panel
        </ButtonLink>
        <ButtonLink href="/home" variant="ghost">All big days</ButtonLink>
      </div>

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

function ChapterNode({ ch, ctx, offset, onOpen }: { ch: Chapter; ctx: EventCtx; offset: boolean; onOpen: () => void }) {
  const s = chapterStatus(ch, ctx.event, ctx.today, ctx.hasAccess);
  const st = STATUS[s];
  const quick = ctx.event.chapters.length === 1;
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full items-center gap-4 rounded-card border border-line bg-surface p-3 text-left shadow-step transition-transform duration-fast active:translate-y-[2px] ${offset ? 'sm:ml-10' : ''} ${s === 'today' ? 'border-2 border-primary' : ''}`}
      >
        <span className={`relative z-10 flex size-14 shrink-0 items-center justify-center rounded-pill border-b-4 ${st.node}`}>
          <Icon name={st.icon} size={26} />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-xs font-bold text-ink-soft">
            {quick ? 'Quick prep' : `Chapter ${ch.index}`} · {ch.date === ctx.today ? 'Tonight' : `${weekdayLabel(ch.date)} evening`}
          </span>
          <span className="text-base font-extrabold leading-tight">{ch.title}</span>
        </span>
        <span className={`rounded-pill px-3 py-1 text-xs font-bold ${s === 'today' ? 'bg-primary text-primary-ink' : s === 'catch_up' ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-soft'}`}>
          {st.label}
        </span>
      </button>
    </li>
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
