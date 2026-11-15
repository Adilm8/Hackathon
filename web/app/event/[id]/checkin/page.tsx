'use client';
import { getWorkspace } from '@/lib/store/workspace';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Character } from '@/components/character';
import { Face, RATING_LABEL } from '@/components/eventday/Faces';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/icons';
import { BRAVE_MOMENTS, MAX_BRAVE_PER_CHECKIN } from '@/lib/home/achievements';
import { Field, TextInput } from '@/components/ui/Field';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { dateLabel } from '@/lib/engine/clock';
import type { Checkin } from '@/lib/engine/types';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { useEventCtx, type EventCtx } from '@/lib/store/hooks';
import { checkinTechniqueOptions, eventLabel, saveCheckin } from '@/lib/store/engine';
import { planHref } from '@/lib/home/path';

/** Check-in after the big day (docs/SPEC.md 4.13). Free for everyone; about 30 seconds. */
export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  return <Screen>{() => <CheckinScreen id={decodeURIComponent(id)} />}</Screen>;
}

function CheckinScreen({ id }: { id: string }) {
  const ctx = useEventCtx(id);
  if (!ctx) return <PlanNotFound />;
  // Demo (sample family): the check-in opens early so the jury can see it and the badge.
  if (ctx.today < ctx.event.date && getWorkspace() !== 'sample')
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <Character character={ctx.child.character} mood="calm" size={120} decorative />
        <h1 className="font-display text-xl font-extrabold">The check-in opens on the big day</h1>
        <p className="text-ink-soft">Come back on {dateLabel(ctx.event.date, { weekday: true })} and tell us how it went.</p>
        <ButtonLink href={planHref(id)}>Back to the plan</ButtonLink>
      </div>
    );
  return <Form ctx={ctx} />;
}

function Form({ ctx }: { ctx: EventCtx }) {
  const { event, child, template, today } = ctx;
  const router = useRouter();
  const setChild = useChild((s) => s.setChild);
  const updateEvent = useEvents((s) => s.updateEvent);
  const options = useMemo(() => checkinTechniqueOptions(event, template), [event, template]);
  const prev: Checkin | undefined = event.checkin;
  const [rating, setRating] = useState<Checkin['rating'] | undefined>(prev?.rating);
  const [helped, setHelped] = useState<string[]>(prev?.helped ?? []);
  const [didnt, setDidnt] = useState<string[]>(prev?.didntHelp ?? []);
  const [custom, setCustom] = useState(prev?.custom ?? '');
  const [brave, setBrave] = useState<string[]>(prev?.brave ?? []);
  const [error, setError] = useState<string | null>(null);

  const flip = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  function save() {
    if (!rating) {
      setError('Pick one face first.');
      return;
    }
    const r = saveCheckin({ event, child, input: { rating, helped, didntHelp: didnt, custom: custom.trim() || undefined, brave }, today, template });
    setChild(r.child);
    updateEvent(event.id, () => r.event);
    router.push(`/event/${encodeURIComponent(event.id)}/badge`);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center gap-4">
        <Character character={child.character} mood="happy" size={88} decorative />
        <div>
          <p className="text-sm font-bold text-ink-soft">{eventLabel(event, template)} · {dateLabel(event.date)}</p>
          <h1 className="font-display text-2xl font-extrabold leading-tight">How did it go?</h1>
          <p className="text-sm text-ink-soft">30 seconds. The next story will remember what worked.</p>
        </div>
      </header>

      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className="text-lg font-extrabold">How was it for {child.name}?</h2>
        <div role="radiogroup" aria-labelledby="how" className="grid grid-cols-3 gap-3">
          {([1, 2, 3] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={rating === r}
              onClick={() => {
                setRating(r);
                setError(null);
              }}
              className={`flex min-h-tap flex-col items-center gap-2 rounded-card border-2 bg-surface p-3 font-bold shadow-step transition-colors duration-fast ${
                rating === r ? '!border-primary bg-surface-2 ring-2 ring-primary/30' : 'border-line'
              } ${r === 1 ? 'text-success' : r === 2 ? 'text-accent-ink' : 'text-primary-text'}`}
            >
              <Face rating={r} />
              <span className="text-sm text-ink">{RATING_LABEL[r]}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="helped" className="flex flex-col gap-3">
        <h2 id="helped" className="text-lg font-extrabold">What helped?</h2>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip
              key={o.id}
              selected={helped.includes(o.id)}
              onToggle={() => {
                setHelped((l) => flip(l, o.id));
                setDidnt((l) => l.filter((x) => x !== o.id));
              }}
            >
              {o.label}
            </Chip>
          ))}
        </div>
        <Field id="custom" label="Something else that helped (optional)">
          <TextInput id="custom" value={custom} maxLength={60} onChange={(e) => setCustom(e.target.value)} placeholder="For example: singing our song" />
        </Field>
      </section>

      <section aria-labelledby="didnt" className="flex flex-col gap-3">
        <h2 id="didnt" className="text-lg font-extrabold">Anything that didn&apos;t work? <span className="text-sm font-bold text-ink-soft">(optional)</span></h2>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip
              key={o.id}
              selected={didnt.includes(o.id)}
              onToggle={() => {
                setDidnt((l) => flip(l, o.id));
                setHelped((l) => l.filter((x) => x !== o.id));
              }}
            >
              {o.label}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-ink-soft">Leave a box empty if you didn&apos;t try it. We may suggest it again.</p>
      </section>

      <section aria-labelledby="brave" className="flex flex-col gap-3">
        <h2 id="brave" className="text-lg font-extrabold">Brave moments <span className="text-sm font-bold text-ink-soft">(optional, up to {MAX_BRAVE_PER_CHECKIN})</span></h2>
        <p className="text-xs text-ink-soft">{child.name} gets a sticker for each moment you were proud of.</p>
        <div className="flex flex-wrap gap-2">
          {BRAVE_MOMENTS.map((m) => {
            const on = brave.includes(m.id);
            return (
              <Chip
                key={m.id}
                selected={on}
                onToggle={() => setBrave((l) => (on ? l.filter((x) => x !== m.id) : l.length >= MAX_BRAVE_PER_CHECKIN ? l : [...l, m.id]))}
              >
                <Icon name={m.icon} size={16} /> {m.label}
              </Chip>
            );
          })}
        </div>
      </section>

      {error && <p role="alert" className="text-sm font-bold text-danger">{error}</p>}
      <Button size="l" onClick={save}>{prev ? 'Save again' : 'Save'}</Button>
      <ButtonLink href={planHref(event.id)} variant="ghost">Back to the plan</ButtonLink>
    </div>
  );
}
