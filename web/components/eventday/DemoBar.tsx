'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { clock, dateLabel } from '@/lib/engine/clock';
import type { BigEvent, Workspace } from '@/lib/engine/types';
import {
  clearSeen, demoEvent, demoModeOn, isDemoAccess, markSeen, readSeen, realTimeGroupOn, sampleAccess, timeTravelDate,
  tourEvent, tourSteps, type TimeTarget, type TourSeen,
} from '@/lib/demo/demo';
import { setEntitlements, useEntitlements } from '@/lib/store/entitlement';
import { useEvents } from '@/lib/store/events';
import { useToday } from '@/lib/store/hooks';
import { startSample } from '@/lib/store/sample';
import { useSettings } from '@/lib/store/settings';
import { nowMs } from '@/lib/store/time';

const TIME: { id: TimeTarget; label: string }[] = [
  { id: 'evening2', label: 'Evening 2' },
  { id: 'day', label: 'Event day' },
  { id: 'after', label: 'After the event' },
  { id: 'today', label: 'Back to today' },
];

const OPEN_KEY = 'bds:sample:demo-open';

/**
 * The Demo bar (docs/SPEC.md 4.3, 5.1): a collapsible strip at the bottom of every sample screen
 * with the six-step guided tour, time travel and the access buttons. It only moves "today" and
 * calls the server; screens react through the same rules as for a real family.
 * For a real family `?demo=1` shows the time group only.
 */
export function DemoBar({ workspace }: { workspace: Workspace }) {
  const sample = workspace === 'sample';
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const events = useEvents((s) => s.events);
  const list = useEntitlements((s) => s.list);
  const override = useSettings((s) => s.clockOverride);
  const setOverride = useSettings((s) => s.setClockOverride);
  const today = useToday();
  // The bar mounts only after the stores hydrated (Screen), so reading the browser here is safe.
  const [open, setOpen] = useState(() => {
    try {
      const saved = window.localStorage.getItem(OPEN_KEY);
      // First visit: open on wide screens; on a phone the strip with "Next step" is enough.
      return saved === null ? window.matchMedia('(min-width: 768px)').matches : saved === '1';
    } catch {
      return false;
    }
  });
  const [timeOnly] = useState(() => !sample && realTimeGroupOn(window.location.search));
  const [accessOn, setAccessOn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // A new screen starts with the bar folded, so the open tour never covers the page it led to.
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  const onScreenId = /^\/event\/([^/]+)/.exec(pathname)?.[1];
  const event = demoEvent(events, clock.realToday(), onScreenId ? decodeURIComponent(onScreenId) : undefined);

  useEffect(() => {
    if (!sample) return;
    let alive = true;
    demoModeOn().then((on) => alive && setAccessOn(on));
    return () => {
      alive = false;
    };
  }, [sample]);

  // "Panel opened" and "day card seen" are not in the family data: noted per browser.
  // Both count only on the tour's own event, which is fixed the first time the bar shows it.
  const stored = sample ? readSeen() : {};
  const tour = sample ? tourEvent(events, clock.realToday(), stored) : undefined;
  const onTour = !!tour && onScreenId !== undefined && decodeURIComponent(onScreenId) === tour.id;
  const here: TourSeen = { panel: (onTour && /\/panel$/.test(pathname)) || undefined, day: (onTour && /\/day$/.test(pathname)) || undefined };
  useEffect(() => {
    if (sample && tour) markSeen({ ...here, eventId: tour.id });
  }, [sample, tour?.id, here.panel, here.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const seen: TourSeen = { panel: stored.panel || here.panel, day: stored.day || here.day };

  if (!sample && !timeOnly) return null;
  if (!event) return null;
  // The onboarding form is a real family's first step; tour hints there only confuse.
  if (pathname.startsWith('/start')) return null;

  const setOpenSaved = (v: boolean) => {
    setOpen(v);
    try {
      window.localStorage.setItem(OPEN_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  const toggle = () => setOpenSaved(!open);

  // After a jump the bar folds away, so the screen it opened is fully visible on a phone.
  const travel = (t: TimeTarget, on: Pick<BigEvent, 'date' | 'chapters'> = event) => {
    setOverride(timeTravelDate(on, t));
    setOpenSaved(false);
  };

  async function access(action: 'grant' | 'reset') {
    setBusy(action);
    setNote(null);
    const r = await sampleAccess(action);
    if (action === 'reset') {
      clearSeen();
      try {
        window.localStorage.removeItem(OPEN_KEY);
      } catch {
        /* ignore */
      }
      // A fresh sample: unpaid, back to today, no answers from the last person at this phone.
      await startSample();
      return;
    }
    setBusy(null);
    if (r) {
      setEntitlements(r);
      setNote('Demo access is on for 24 hours. Everything is unlocked.');
    } else setNote('Demo access is not available right now.');
  }

  const steps = sample && tour ? tourSteps(tour, list, nowMs(), seen) : [];
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  const demo = isDemoAccess(workspace, list, nowMs());
  const onStepPage = !!nextStep && decodeURIComponent(pathname) === decodeURIComponent(nextStep.href);
  const canGrant = nextStep?.action === 'grant' && accessOn && !demo;

  return (
    <div className="no-print sticky bottom-0 z-30 border-t-2 border-accent bg-surface text-ink shadow-pop" role="region" aria-label="Demo bar">
      <div className="mx-auto max-w-5xl px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={`${sample ? `Demo tour, ${doneCount} of 6 steps done` : 'Demo clock'}. ${open ? 'Hide' : 'Show'} the demo controls`}
            className="inline-flex min-h-tap min-w-0 flex-1 items-center gap-2 text-left text-sm font-extrabold"
          >
            <Icon name="sparkles" size={18} />
            <span className="whitespace-nowrap">{sample ? `Demo ${doneCount}/6` : 'Demo clock'}</span>
            {/* Phones: the status line is in the open bar; the folded strip keeps room for "Next step". */}
            <span className={`truncate font-bold text-ink-soft ${open || override || demo ? '' : 'max-sm:hidden'}`}>
              · {override ? `Today: ${dateLabel(today, { weekday: true })}` : 'Real today'}
              {demo ? ' · Demo access' : ''}
            </span>
            <Icon name={open ? 'chevron-down' : 'chevron-up'} size={18} className="ml-auto shrink-0 text-ink-soft" />
          </button>
          {!open && nextStep && !onStepPage && (
            <Link
              href={nextStep.href}
              onClick={() => nextStep.time && setOverride(timeTravelDate(tour ?? event, nextStep.time))}
              className="inline-flex min-h-tap shrink-0 items-center rounded-pill bg-primary px-3 text-sm font-extrabold text-primary-ink"
            >
              Next step →
            </Link>
          )}
          {!open && nextStep && onStepPage && canGrant && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => access('grant')}
              className="inline-flex min-h-tap shrink-0 items-center rounded-pill bg-accent px-3 text-sm font-extrabold text-accent-ink disabled:opacity-50"
            >
              {busy === 'grant' ? 'Unlocking…' : 'Skip payment →'}
            </button>
          )}
        </div>
        {!open && nextStep && !onStepPage && <p className="truncate pb-1 text-xs text-ink-soft">Next: {nextStep.label}</p>}
        {!open && sample && steps.length > 0 && !nextStep && (
          <p className="truncate pb-1 text-xs text-ink-soft">Tour complete. Open the bar to start again with Reset demo.</p>
        )}
        {/* On the step's own screen opening it again does nothing, so the strip says what to do here. */}
        {!open && nextStep && onStepPage && (
          <p role="status" className="pb-1 text-sm font-bold">
            <span className="text-ink-soft">{nextStep.label}: </span>
            {nextStep.hint ?? 'You are on this step now.'}
          </p>
        )}
        {!open && note && <p role="status" className="pb-1 text-xs font-bold">{note}</p>}
        {open && (
          <div className="flex max-h-[45dvh] flex-col gap-3 overflow-y-auto overscroll-contain pb-2">
            {sample && (
              <ol aria-label="Guided tour" className="grid gap-1 sm:grid-cols-2">
                {steps.map((s, i) => (
                  <li key={s.id}>
                    <Link
                      href={s.href}
                      onClick={() => (s.time ? travel(s.time, tour) : setOpenSaved(false))}
                      className="flex min-h-tap items-center gap-2 rounded-card px-2 text-sm hover:bg-surface-2"
                    >
                      <span
                        aria-hidden
                        className={`flex size-6 shrink-0 items-center justify-center rounded-pill text-xs font-extrabold ${s.done ? 'bg-success text-success-ink' : 'border-2 border-line text-ink-soft'}`}
                      >
                        {s.done ? <Icon name="check" size={14} /> : i + 1}
                      </span>
                      <span className={s.done ? 'text-ink-soft line-through decoration-1' : 'font-bold'}>
                        {s.label}
                        {s === nextStep && onStepPage && s.hint && <span className="block text-xs font-normal text-ink-soft">{s.hint}</span>}
                      </span>
                      <span className="sr-only">{s.done ? '(done)' : ''}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <div role="group" aria-label="Time travel" className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-ink-soft">Skip to</span>
              {TIME.map((t) => {
                const target = timeTravelDate(event, t.id);
                const active = t.id === 'today' ? !override : override === target;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => travel(t.id)}
                    className={`min-h-tap rounded-pill border-2 px-3 text-sm font-bold ${active ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-surface'}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {sample && (
              <div role="group" aria-label="Access" className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/event/${encodeURIComponent(event.id)}/paywall`)}
                  className="min-h-tap rounded-pill border-2 border-line bg-surface px-3 text-sm font-bold"
                >
                  Pay with the test card
                </button>
                {accessOn && (
                  <>
                    <button
                      type="button"
                      disabled={!!busy || demo}
                      onClick={() => access('grant')}
                      className="min-h-tap rounded-pill border-2 border-accent bg-accent px-3 text-sm font-bold text-accent-ink disabled:opacity-50"
                    >
                      {demo ? 'Demo access is on' : busy === 'grant' ? 'Unlocking…' : 'Skip payment (demo access)'}
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => access('reset')}
                      className="min-h-tap rounded-pill px-3 text-sm font-bold text-primary-text underline disabled:opacity-50"
                    >
                      {busy === 'reset' ? 'Resetting…' : 'Reset demo'}
                    </button>
                  </>
                )}
              </div>
            )}
            {note && <p role="status" className="text-sm font-bold">{note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** "Demo access" next to "Sample data" in the header while demo access is active (4.3). */
export function DemoAccessBadge({ workspace }: { workspace: Workspace }) {
  const list = useEntitlements((s) => s.list);
  if (!isDemoAccess(workspace, list, nowMs())) return null;
  return (
    // Below 400 px the header has no room; the Demo bar strip says "Demo access" there instead.
    <span className="hidden whitespace-nowrap rounded-pill border border-accent px-2 py-0.5 text-xs font-bold min-[400px]:inline">
      Demo access
    </span>
  );
}
