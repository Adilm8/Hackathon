'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Character } from '@/components/character';
import { Icon, type IconName } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { chime } from '@/lib/fx/celebrate';
import { clockText, ROUTINE, routineSteps, type RoutineStep } from '@/lib/home/library';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { useToday } from '@/lib/store/hooks';
import { tonightChapter } from '@/lib/store/engine';
import { usePrefs } from '@/lib/store/prefs';

const ICON: Record<RoutineStep['id'], IconName> = { bath: 'bath', teeth: 'sparkles', pyjamas: 'shirt', story: 'book-open', lights: 'lamp' };

/** Bedtime routine: a calm step-by-step timer before the story (benchmark: sleep apps' wind-down). */
export default function RoutinePage() {
  return <Screen>{() => <Routine />}</Screen>;
}

type Run = { idx: number; endsAt: number; pausedLeft?: number } | { done: true } | null;

function Routine() {
  const child = useChild((s) => s.child);
  const events = useEvents((s) => s.events);
  const today = useToday();
  const off = usePrefs((s) => s.routineOff);
  const toggleStep = usePrefs((s) => s.toggleRoutineStep);
  const steps = routineSteps(off);
  const [run, setRun] = useState<Run>(null);
  const [now, setNow] = useState(() => Date.now());
  const rang = useRef(false);

  const active = run && !('done' in run) ? run : null;
  useEffect(() => {
    if (!active || active.pausedLeft !== undefined) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active]);

  const left = active ? (active.pausedLeft ?? active.endsAt - now) : 0;
  useEffect(() => {
    if (active && left <= 0 && !rang.current) {
      rang.current = true;
      chime();
    }
  }, [active, left]);

  const name = child?.name ?? 'your child';
  const tonight = events.map((e) => ({ e, ch: tonightChapter(e, today) })).find((x) => x.ch);
  const storyHref = tonight ? `/event/${encodeURIComponent(tonight.e.id)}/read/${tonight.ch!.index}` : '/home?tab=library';

  const start = (idx: number) => {
    if (idx >= steps.length) return setRun({ done: true });
    const t = Date.now();
    setNow(t);
    rang.current = false;
    setRun({ idx, endsAt: t + steps[idx].minutes * 60_000 });
  };

  if (run && 'done' in run)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        {child && <Character character={child.character} mood="calm" size={140} decorative />}
        <h1 className="font-display text-2xl font-extrabold">Good night, {name}</h1>
        <p className="text-ink-soft">The routine is done. Sleep tight, and see you tomorrow evening.</p>
        <Button variant="secondary" onClick={() => setRun(null)}>Back to the routine</Button>
        <ButtonLink href="/home" variant="ghost">Home</ButtonLink>
      </div>
    );

  if (active) {
    const step = steps[active.idx];
    const total = step.minutes * 60_000;
    const pct = Math.min(100, Math.max(0, ((total - left) / total) * 100));
    const paused = active.pausedLeft !== undefined;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-6 text-center">
        <p className="text-sm font-bold text-ink-soft">Step {active.idx + 1} of {steps.length}</p>
        <div
          className="relative flex size-56 items-center justify-center rounded-pill"
          style={{ background: `conic-gradient(var(--primary) ${pct}%, var(--surface-2) 0)` }}
          role="timer" aria-label={`${step.label}: ${clockText(left)} left`}
        >
          <div className="flex size-48 flex-col items-center justify-center gap-1 rounded-pill bg-bg">
            <Icon name={ICON[step.id]} size={40} className="text-primary-text" />
            <span className="font-display text-4xl font-extrabold tabular-nums" aria-hidden>{clockText(left)}</span>
          </div>
        </div>
        <h1 className="font-display text-2xl font-extrabold">{step.label}</h1>
        {left <= 0 && <p className="font-bold text-primary-text">Time is up. Ready for the next step?</p>}
        {step.id === 'story' && (
          <ButtonLink href={storyHref} className="w-full">
            <Icon name="book-open" size={20} /> {tonight ? `Open tonight's chapter ${tonight.ch!.index}` : 'Pick a story from the library'}
          </ButtonLink>
        )}
        <div className="flex w-full gap-3">
          <Button
            variant="secondary" className="flex-1"
            onClick={() => setRun(paused ? { idx: active.idx, endsAt: Date.now() + active.pausedLeft! } : { ...active, pausedLeft: Math.max(0, active.endsAt - Date.now()) })}
          >
            <Icon name={paused ? 'play' : 'pause'} size={20} /> {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button className="flex-1" onClick={() => start(active.idx + 1)}>
            {active.idx + 1 < steps.length ? 'Next step' : 'Finish'} <Icon name="arrow-right" size={20} />
          </Button>
        </div>
        <button type="button" onClick={() => setRun(null)} className="text-sm font-bold text-ink-soft underline">Stop the routine</button>
      </div>
    );
  }

  const minutes = steps.reduce((n, s) => n + s.minutes, 0);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <Link href="/home" className="text-sm font-bold text-primary-text">← Home</Link>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Bedtime routine</h1>
        <p className="text-ink-soft">The same calm steps every evening help {name} wind down. The timer is a gentle guide; go at your own pace.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {ROUTINE.map((s) => {
          const on = !off.includes(s.id);
          return (
            <li key={s.id}>
              <label className={`flex min-h-tap cursor-pointer items-center gap-3 rounded-card border-2 bg-surface p-3 ${on ? 'border-primary' : 'border-line opacity-70'}`}>
                <input type="checkbox" checked={on} onChange={() => toggleStep(s.id)} className="size-5 accent-[var(--primary)]" />
                <Icon name={ICON[s.id]} size={24} className="text-primary-text" />
                <span className="flex-1 font-bold">{s.label}</span>
                <span className="text-sm text-ink-soft">{s.minutes} min</span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button onClick={() => start(0)} disabled={steps.length === 0} className="w-full">
        <Icon name="timer" size={20} /> Start ({minutes} min)
      </Button>
    </div>
  );
}
