'use client';
import Link from 'next/link';
import { Character } from '@/components/character';
import { BadgeArt } from '@/components/badges';
import { EventIcon, Icon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { dateLabel } from '@/lib/engine/clock';
import type { BigEvent, ChildProfile } from '@/lib/engine/types';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { useToday } from '@/lib/store/hooks';
import { countdownText, eventLabel, eventPhase, getTemplate, readProgress, tonightChapter } from '@/lib/store/engine';

/** Today view (docs/SPEC.md 4.4). */
export default function HomePage() {
  return <Screen>{() => <Home />}</Screen>;
}

function Home() {
  const child = useChild((s) => s.child);
  const events = useEvents((s) => s.events);
  const today = useToday();
  if (!child || events.length === 0)
    return (
      <EmptyState
        title="No plans here yet"
        text="Start with the big day that's coming up, it takes two minutes."
        action={<ButtonLink href={child ? '/start?again=1' : '/?landing=1'}>{child ? 'Plan a big day' : 'Go to the start page'}</ButtonLink>}
      />
    );

  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : 1));
  const open = sorted.filter((e) => eventPhase(e, today) !== 'done');
  const nearest = open.find((e) => eventPhase(e, today) === 'day') ?? open.find((e) => eventPhase(e, today) === 'after') ?? open[0];
  const upcoming = sorted.filter((e) => e.date >= today && !e.checkin);
  const past = sorted.filter((e) => !(e.date >= today && !e.checkin)).reverse();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-extrabold">Hi! Here is {child.name}&apos;s plan.</h1>
      {nearest && <TopSlot event={nearest} child={child} today={today} />}

      {upcoming.length > 0 && (
        <section aria-labelledby="up" className="flex flex-col gap-3">
          <h2 id="up" className="text-lg font-extrabold">Coming up</h2>
          {upcoming.map((e) => <EventRow key={e.id} event={e} today={today} />)}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/start?again=1" variant="secondary" className="sm:w-auto">
          <Icon name="smile-plus" size={20} /> Plan another big day
        </ButtonLink>
      </div>

      {child.badges.length > 0 && (
        <section aria-labelledby="badges">
          <h2 id="badges" className="mb-3 text-lg font-extrabold">Badges</h2>
          <ul className="flex flex-wrap gap-4">
            {child.badges.map((b) => (
              <li key={b.eventId} className="flex w-24 flex-col items-center text-center text-xs font-bold">
                <BadgeArt eventType={b.eventType} size={80} label={b.label} />
                {b.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past" className="flex flex-col gap-3">
          <h2 id="past" className="text-lg font-extrabold">Past big days</h2>
          {past.map((e) => <EventRow key={e.id} event={e} today={today} />)}
        </section>
      )}
    </div>
  );
}

function TopSlot({ event, child, today }: { event: BigEvent; child: ChildProfile; today: string }) {
  const t = getTemplate(event.type);
  const phase = eventPhase(event, today);
  const label = eventLabel(event, t);
  if (phase === 'day')
    return (
      <Card className="flex items-center gap-4 border-2 border-accent">
        <Character character={child.character} mood="brave" size={88} decorative />
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-lg font-extrabold">Today is the big day: {label}</p>
          <p className="text-sm text-ink-soft">Your &quot;first, then&quot; card is ready.</p>
          <ButtonLink href={`/event/${event.id}/day`} className="self-start">Open today&apos;s card</ButtonLink>
        </div>
      </Card>
    );
  if (phase === 'after')
    return (
      <Card className="flex items-center gap-4 border-2 border-success">
        <Character character={child.character} mood="happy" size={88} decorative />
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-lg font-extrabold">How did it go?</p>
          <p className="text-sm text-ink-soft">30 seconds. It helps the next story remember what worked.</p>
          <ButtonLink href={`/event/${event.id}/checkin`} className="self-start">Tell us</ButtonLink>
        </div>
      </Card>
    );
  const ch = tonightChapter(event, today);
  const p = readProgress(event);
  return (
    <Card className="flex items-center gap-4">
      <Character character={child.character} mood="calm" size={88} decorative />
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-sm font-bold text-ink-soft">{countdownText(event, t, today)}</p>
        <p className="text-lg font-extrabold">{ch ? `Tonight: chapter ${ch.index} of ${p.total}` : 'All chapters read'}</p>
        <ButtonLink href={ch ? `/event/${event.id}/read/${ch.index}` : `/event/${event.id}`} className="self-start">
          {ch ? `Read chapter ${ch.index}` : 'Open the plan'}
        </ButtonLink>
      </div>
    </Card>
  );
}

function EventRow({ event, today }: { event: BigEvent; today: string }) {
  const t = getTemplate(event.type);
  const p = readProgress(event);
  const phase = eventPhase(event, today);
  return (
    <Link href={`/event/${event.id}`} className="flex min-h-tap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-step hover:border-ink-soft/40">
      <span className="flex size-12 items-center justify-center rounded-pill bg-surface-2"><EventIcon type={event.type} size={26} /></span>
      <span className="flex flex-1 flex-col">
        <span className="font-extrabold">{eventLabel(event, t)}</span>
        <span className="text-xs text-ink-soft">
          {dateLabel(event.date, { weekday: true })} · {phase === 'done' ? 'Done' : phase === 'prep' ? `${p.read} of ${p.total} evenings read` : countdownText(event, t, today)}
        </span>
      </span>
      <Icon name="arrow-right" size={20} />
    </Link>
  );
}
