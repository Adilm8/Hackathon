'use client';
import Link from 'next/link';
import { BadgeArt } from '@/components/badges';
import { Icon, type IconName } from '@/components/icons';
import { ButtonLink } from '@/components/ui/Button';
import { CreateStoryButton } from '@/components/ui/CreateStoryButton';
import type { BigEvent, ChildProfile, Workspace } from '@/lib/engine/types';
import type { DayTask } from '@/lib/home/path';
import type { Level, Streak, WeekDay, WeekSummary } from '@/lib/home/progress';

const card = 'rounded-card border border-line bg-surface p-5 shadow-step';

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
    <section className="flex flex-col gap-3 rounded-card border-2 border-accent/60 bg-surface p-5 shadow-step" aria-labelledby="plan-h">
      <span className="self-start rounded-pill bg-accent px-2.5 py-0.5 text-xs font-extrabold text-accent-ink">Big Day Pass</span>
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

export function StreakCard({ streak, week, child }: { streak: Streak; week: WeekDay[]; child: ChildProfile }) {
  const shown = child.badges.slice(-3).reverse();
  const n = streak.count;
  return (
    <section className={`${card} flex flex-col gap-4`} aria-labelledby="streak-h">
      <div className="flex items-center justify-between">
        <h2 id="streak-h" className="text-lg font-extrabold">Story evenings</h2>
        <Link href="/home?tab=badges" className="-mr-2 inline-flex min-h-tap items-center rounded-pill px-2 text-sm font-extrabold text-primary-text hover:bg-surface-2">All badges</Link>
      </div>
      <div className="flex items-center gap-3">
        <span className={`flex size-12 items-center justify-center rounded-pill ${n > 0 ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-soft'}`}>
          <Icon name="flame" size={28} />
        </span>
        <p className="flex-1 text-sm">
          {n > 0 ? (
            <><strong className="text-lg">{n}</strong> {n === 1 ? 'evening' : 'evenings'} in a row. Keep it going tonight.</>
          ) : (
            'Read a chapter tonight to start a streak.'
          )}
        </p>
      </div>
      <WeekStrip week={week} />
      {streak.rested.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <Icon name="snowflake" size={16} /> A missed evening was a rest evening, so the streak kept going. One rest a week.
        </p>
      )}
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

const DAY_LABEL: Record<WeekDay['state'], string> = {
  read: 'story read', rest: 'rest evening', missed: 'no story', tonight: 'tonight, not read yet', none: 'no story',
};

/** Seven dots, oldest first: read, rest (snowflake), missed, tonight (ringed). */
export function WeekStrip({ week }: { week: WeekDay[] }) {
  return (
    <ol className="flex justify-between gap-1" aria-label="The last seven evenings">
      {week.map((d) => (
        <li key={d.date} className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-ink-soft" aria-hidden>{d.letter}</span>
          <span
            className={`flex size-8 items-center justify-center rounded-pill ${
              d.state === 'read' ? 'bg-accent text-accent-ink'
                : d.state === 'rest' ? 'bg-surface-2 text-primary-text'
                  : d.state === 'tonight' ? 'border-2 border-dashed border-accent text-ink-soft'
                    : 'bg-surface-2 text-ink-soft'
            }`}
          >
            {d.state === 'read' && <Icon name="flame" size={16} />}
            {d.state === 'rest' && <Icon name="snowflake" size={16} />}
            <span className="sr-only">{d.name}: {DAY_LABEL[d.state]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Stars and the level, with the bar to the next level. */
export function LevelCard({ level, name }: { level: Level; name: string }) {
  return (
    <section className={`${card} flex flex-col gap-3`} aria-labelledby="level-h">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-ink"><Icon name="star" size={26} /></span>
        <div className="flex-1">
          <h2 id="level-h" className="text-lg font-extrabold leading-tight">{level.name}</h2>
          <p className="text-sm font-bold text-ink-soft">Level {level.number}</p>
        </div>
        <p className="text-right text-sm font-bold"><strong className="text-lg">{level.stars}</strong><br /><span className="text-xs text-ink-soft">stars</span></p>
      </div>
      <div
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)}
        aria-label={level.next ? `Stars to ${level.nextName}` : 'Top level'}
        className="h-3 overflow-hidden rounded-pill bg-surface-2"
      >
        <span className="block h-full rounded-pill bg-primary transition-[width]" style={{ width: `${Math.round(level.progress * 100)}%` }} />
      </div>
      <p className="text-xs text-ink-soft">
        {level.next ? `${level.next - level.stars} more stars to ${level.nextName}.` : `${name} reached the top level. Wonderful!`}{' '}
        Stars come from reading together, asking questions and telling how the big day went.
      </p>
    </section>
  );
}

/** The parent's weekly report. */
export function WeekReport({ week, name }: { week: WeekSummary; name: string }) {
  const items: { label: string; value: number; icon: IconName }[] = [
    { label: week.evenings === 1 ? 'story evening' : 'story evenings', value: week.evenings, icon: 'moon-star' },
    { label: week.chapters === 1 ? 'chapter read' : 'chapters read', value: week.chapters, icon: 'book-open' },
    { label: week.questions === 1 ? 'question asked' : 'questions asked', value: week.questions, icon: 'circle-help' },
    { label: 'stars earned', value: week.stars, icon: 'star' },
  ];
  return (
    <section className={`${card} flex flex-col gap-4`} aria-labelledby="week-h">
      <div>
        <h2 id="week-h" className="text-lg font-extrabold">This week with {name}</h2>
        <p className="text-xs text-ink-soft">The last seven days, on this device.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3 rounded-card bg-surface-2 p-3">
            <Icon name={i.icon} size={22} className="shrink-0 text-primary-text" />
            <span className="flex flex-col leading-tight"><strong className="text-lg">{i.value}</strong><span className="text-xs text-ink-soft">{i.label}</span></span>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        {week.evenings >= 3
          ? `A steady routine. Short evenings like these are what help ${name} feel ready.`
          : week.evenings > 0
            ? `A good start. A few short evenings before the big day help the most.`
            : `No story this week yet. Tonight's chapter takes about three minutes.`}
        {week.badges > 0 && ` And ${week.badges === 1 ? 'a new badge' : `${week.badges} new badges`}!`}
      </p>
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
    <section className="flex flex-col gap-3 rounded-card border border-dashed border-line bg-surface-2/70 p-5" aria-labelledby="create-h">
      <h2 id="create-h" className="text-lg font-extrabold">Another big day coming?</h2>
      <p className="text-sm text-ink-soft">
        {workspace === 'sample' ? 'This is a sample family. Make a real story for your own child; the sample stays here.' : 'Make a new story in two minutes. Saved children are filled in for you.'}
      </p>
      <CreateStoryButton workspace={workspace} label={workspace === 'sample' ? 'Create your own story' : 'Create a new story'} className="w-full" />
    </section>
  );
}

/** Link to the bedtime routine timer (wind-down before the story). */
export function RoutineCard({ name }: { name: string }) {
  return (
    <Link href="/routine" className={`${card} flex items-center gap-3 hover:border-ink-soft/40`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-primary-text"><Icon name="moon-star" size={26} /></span>
      <span className="flex flex-1 flex-col">
        <span className="font-extrabold">Bedtime routine</span>
        <span className="text-xs text-ink-soft">Bath, teeth, pyjamas, story, lights: a calm timer for {name}&apos;s evening.</span>
      </span>
      <Icon name="arrow-right" size={20} />
    </Link>
  );
}
