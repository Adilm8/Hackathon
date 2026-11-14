'use client';
import Link from 'next/link';
import { BadgeArt } from '@/components/badges';
import { Icon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/Button';
import { CreateStoryButton } from '@/components/ui/CreateStoryButton';
import type { BigEvent, ChildProfile, Workspace } from '@/lib/engine/types';
import type { DayTask } from '@/lib/home/path';

const card = 'rounded-card border-2 border-line bg-surface p-5';

/** Plan upsell while the nearest big day is not unlocked; a quiet "plan is on" line once it is. */
export function PlanCard({ event, hasAccess, label }: { event: BigEvent | null; hasAccess: boolean; label: string }) {
  if (!event) return null;
  if (hasAccess)
    return (
      <section className={`${card} flex items-center gap-3`} aria-label="Your plan">
        <span className="flex size-10 items-center justify-center rounded-pill bg-accent text-accent-ink"><Icon name="crown" size={22} /></span>
        <div className="flex-1">
          <p className="font-extrabold">Every chapter is open</p>
          <p className="text-xs text-ink-soft">{label}: all evenings, the day card and the badge.</p>
        </div>
      </section>
    );
  return (
    <section className={`${card} flex flex-col gap-3`} aria-labelledby="plan-h">
      <span className="self-start rounded-pill bg-accent px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-accent-ink">Big Day Pass</span>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 id="plan-h" className="text-lg font-extrabold leading-tight">Unlock the whole story</h2>
          <p className="mt-1 text-sm text-ink-soft">Chapters 2 to 5, the &quot;first, then&quot; card and the badge for {label.toLowerCase()}. Gold and up cover every big day.</p>
        </div>
        <Icon name="crown" size={40} className="shrink-0 text-accent" />
      </div>
      <ButtonLink href={`/event/${event.id}/paywall`} className="w-full">See plans</ButtonLink>
    </section>
  );
}

export function StreakCard({ streak, child }: { streak: number; child: ChildProfile }) {
  const shown = child.badges.slice(-3).reverse();
  return (
    <section className={`${card} flex flex-col gap-4`} aria-labelledby="streak-h">
      <div className="flex items-center justify-between">
        <h2 id="streak-h" className="text-lg font-extrabold">Story evenings</h2>
        <Link href="/home?tab=badges" className="text-sm font-extrabold uppercase text-primary-text">Badges</Link>
      </div>
      <div className="flex items-center gap-3">
        <span className={`flex size-12 items-center justify-center rounded-pill ${streak > 0 ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-soft'}`}>
          <Icon name="flame" size={28} />
        </span>
        <p className="flex-1 text-sm">
          {streak > 0 ? (
            <><strong className="text-lg">{streak}</strong> {streak === 1 ? 'evening' : 'evenings'} in a row. Keep it going tonight.</>
          ) : (
            'Read a chapter tonight to start a streak.'
          )}
        </p>
      </div>
      {shown.length > 0 ? (
        <ul className="flex gap-3" aria-label="Latest badges">
          {shown.map((b) => (
            <li key={b.eventId} title={b.label}><BadgeArt eventType={b.eventType} size={56} label={b.label} /></li>
          ))}
          <li className="self-center text-xs font-bold text-ink-soft">{child.badges.length} in total</li>
        </ul>
      ) : (
        <p className="text-xs text-ink-soft">The first badge comes after the big day&apos;s check-in.</p>
      )}
    </section>
  );
}

export function TasksCard({ tasks }: { tasks: DayTask[] }) {
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className={`${card} flex flex-col gap-4`} aria-labelledby="tasks-h">
      <div className="flex items-center justify-between">
        <h2 id="tasks-h" className="text-lg font-extrabold">Today</h2>
        <span className="text-sm font-bold text-ink-soft">{done} of {tasks.length}</span>
      </div>
      <ul className="flex flex-col gap-3">
        {tasks.map((t) => (
          <li key={t.key}>
            <Link href={t.href ?? '#'} className="flex min-h-tap items-center gap-3 rounded-card hover:bg-surface-2">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-pill ${t.done ? 'bg-success text-success-ink' : 'bg-surface-2 text-primary-text'}`}>
                <Icon name={t.done ? 'check' : 'target'} size={20} />
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className={`text-sm font-bold ${t.done ? 'text-ink-soft line-through' : ''}`}>{t.label}</span>
                <span className="h-2 overflow-hidden rounded-pill bg-surface-2" aria-hidden>
                  <span className={`block h-full rounded-pill ${t.done ? 'w-full bg-success' : 'w-0'}`} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CreateCard({ workspace }: { workspace: Workspace }) {
  return (
    <section className={`${card} flex flex-col gap-3`} aria-labelledby="create-h">
      <h2 id="create-h" className="text-lg font-extrabold">Another big day coming?</h2>
      <p className="text-sm text-ink-soft">
        {workspace === 'sample' ? 'This is a sample family. Make a real story for your own child; the sample stays here.' : 'Make a new story in two minutes. Saved children are filled in for you.'}
      </p>
      <CreateStoryButton workspace={workspace} label={workspace === 'sample' ? 'Create your own story' : 'Create a new story'} className="w-full" />
    </section>
  );
}
