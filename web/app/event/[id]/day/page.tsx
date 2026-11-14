'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RitualCardView } from '@/components/eventday/RitualCardView';
import { Icon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { dateLabel } from '@/lib/engine/clock';
import type { RitualCard } from '@/lib/engine/types';
import { buildCardPdf, saveFile } from '@/lib/eventday/pdf';
import { loadRitual } from '@/lib/eventday/ritual';
import { renderText } from '@/lib/engine/text';
import { useEvents } from '@/lib/store/events';
import { useEventCtx, type EventCtx } from '@/lib/store/hooks';
import { eventLabel, eventPhase, fallbackRitual } from '@/lib/store/engine';

/** Event-day card (docs/SPEC.md 4.12): paid, printable as an A5 card (11.7). */
export default function DayPage() {
  const { id } = useParams<{ id: string }>();
  return <Screen>{() => <Day id={decodeURIComponent(id)} />}</Screen>;
}

function Day({ id }: { id: string }) {
  const ctx = useEventCtx(id);
  if (!ctx) return <PlanNotFound />;
  return ctx.hasAccess ? <PaidDay ctx={ctx} /> : <LockedDay ctx={ctx} />;
}

function PaidDay({ ctx }: { ctx: EventCtx }) {
  const { event, child, template, today } = ctx;
  const setRitual = useEvents((s) => s.setRitual);
  const [card, setCard] = useState<RitualCard | null>(event.ritual ?? null);
  const [failed, setFailed] = useState(false);
  const [pdfState, setPdfState] = useState<'idle' | 'busy' | 'error'>('idle');
  const label = eventLabel(event, template);
  const phase = eventPhase(event, today);

  useEffect(() => {
    if (card) return;
    let alive = true;
    loadRitual({ event, child, template }).then((r) => {
      if (!alive) return;
      if ('error' in r) {
        // The server has no access row (e.g. it expired): show the template card, never an empty screen.
        setFailed(true);
        setCard(fallbackRitual(template, event, child));
        return;
      }
      if (r.store) setRitual(event.id, r.card);
      setCard(r.card);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  async function download() {
    if (!card) return;
    setPdfState('busy');
    try {
      const pdf = await buildCardPdf({
        title: `${child.name}'s big day`,
        subtitle: `${label} · ${dateLabel(event.date, { weekday: true })}`,
        steps: [renderText(card.steps[0], child), renderText(card.steps[1], child), renderText(card.steps[2], child)],
        technique: { label: card.technique.label, how: renderText(card.technique.how, child) },
        footnote: `Not therapy or medical advice.${card.source === 'llm' ? ' Steps written with AI from our checked template.' : ''} Big Day Stories`,
      });
      saveFile(pdf, 'big-day-card.pdf');
      setPdfState('idle');
    } catch {
      setPdfState('error');
    }
  }

  function print() {
    const title = document.title;
    document.title = 'big-day-card';
    const restore = () => {
      document.title = title;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      {/* A5 portrait, black-and-white safe (11.7). Only this page sets the paper size. */}
      <style>{`@media print { @page { size: A5 portrait; margin: 8mm; } .ritual-card { border-color: #000 !important; box-shadow: none !important; break-inside: avoid; } main { padding: 0 !important; max-width: none !important; } .bg-bg, body { background: #fff !important; } }`}</style>
      <div className="no-print flex flex-col gap-1">
        <p className="text-sm font-bold text-ink-soft">
          {phase === 'day' ? 'Today is the big day' : phase === 'prep' ? `For ${dateLabel(event.date, { weekday: true })}` : 'The big day'}
        </p>
        <p className="text-base">Read it together in the morning, then take it with you.</p>
      </div>

      {card ? (
        <RitualCardView card={card} child={child} label={label} dateText={dateLabel(event.date, { weekday: true })} />
      ) : (
        <div className="flex flex-col gap-3" aria-busy>
          <Skeleton className="h-28" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {failed && <p className="no-print text-sm text-ink-soft">We showed the standard card for this big day.</p>}

      <div className="no-print flex flex-col gap-3">
        <Button size="l" onClick={download} disabled={!card || pdfState === 'busy'}>
          <Icon name="download" size={22} /> {pdfState === 'busy' ? 'Making the PDF…' : 'Download PDF'}
        </Button>
        {pdfState === 'error' && <p role="alert" className="text-center text-sm text-danger">Could not make the file. Try Print instead.</p>}
        <Button variant="secondary" onClick={print} disabled={!card}>
          <Icon name="printer" size={20} /> Print on A5
        </Button>
        <Link href={`/event/${encodeURIComponent(event.id)}/checkin`} className="mx-auto inline-flex min-h-tap items-center px-4 font-bold text-primary-text underline">
          Already back? Tell us how it went
        </Link>
        <ButtonLink href={`/event/${encodeURIComponent(event.id)}`} variant="ghost">Back to the plan</ButtonLink>
      </div>
    </div>
  );
}

/** Without access the card is blurred behind an unlock button (4.12). The preview is the template card. */
function LockedDay({ ctx }: { ctx: EventCtx }) {
  const { event, child, template } = ctx;
  const preview = fallbackRitual(template, event, child);
  const base = `/event/${encodeURIComponent(event.id)}`;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="relative">
        <div aria-hidden className="pointer-events-none select-none blur-sm">
          <RitualCardView card={preview} child={child} label={eventLabel(event, template)} dateText={dateLabel(event.date, { weekday: true })} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-pill bg-surface shadow-step"><Icon name="lock" size={28} /></span>
          <p className="max-w-xs rounded-card bg-surface/95 p-3 text-lg font-extrabold shadow-step">
            {child.name}&apos;s &ldquo;first, then&rdquo; card for the big day, with a printable PDF
          </p>
          <ButtonLink href={`${base}/paywall`}>Unlock the card</ButtonLink>
        </div>
      </div>
      <Link href={`${base}/checkin`} className="mx-auto inline-flex min-h-tap items-center px-4 font-bold text-primary-text underline">
        Already back? Tell us how it went
      </Link>
    </div>
  );
}
