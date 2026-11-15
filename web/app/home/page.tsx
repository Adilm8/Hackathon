'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Character } from '@/components/character';
import { BadgeArt } from '@/components/badges';
import { EventIcon, Icon } from '@/components/icons';
import { SideNav, TabBar, type HomeTab } from '@/components/home/HomeNav';
import { CreateCard, LevelCard, RoutineCard, PlanCard, StreakCard, TasksCard, WeekReport } from '@/components/home/SideCards';
import { StoryPath } from '@/components/home/StoryPath';
import { InstallCard } from '@/components/home/InstallCard';
import { ButtonLink } from '@/components/ui/Button';
import { CreateStoryButton } from '@/components/ui/CreateStoryButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { dateLabel } from '@/lib/engine/clock';
import type { BigEvent, ChildProfile, Workspace } from '@/lib/engine/types';
import { buildPath, todayTasks } from '@/lib/home/path';
import { levelFor, streakWithRest, totalStars, weekStrip, weekSummary } from '@/lib/home/progress';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { useHasAccess, useToday } from '@/lib/store/hooks';
import { countdownText, eventLabel, eventPhase, getTemplate, readProgress, tonightChapter } from '@/lib/store/engine';
import { loadProfiles } from '@/lib/store/profiles';
import { usePrefs } from '@/lib/store/prefs';
import { libraryItems, type LibraryItem } from '@/lib/home/library';
import { getWorkspace } from '@/lib/store/workspace';

const TABS: HomeTab[] = ['path', 'days', 'library', 'badges', 'child'];

/** The parent's home (docs/SPEC.md 4.4): sections on the left, the story path in the middle, today's cards on the right. */
export default function HomePage() {
  return (
    <Suspense>
      <HomeFrame />
    </Suspense>
  );
}

function HomeFrame() {
  const params = useSearchParams();
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'path';
  return (
    <Screen wide bottomBar={<TabBarSlot tab={tab} />}>
      {() => <Home tab={tab} eventParam={params.get('event')} />}
    </Screen>
  );
}

function TabBarSlot({ tab }: { tab: HomeTab }) {
  return <TabBar tab={tab} workspace={getWorkspace()} />;
}

function pickNearest(events: BigEvent[], today: string): BigEvent | null {
  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : 1));
  const open = sorted.filter((e) => eventPhase(e, today) !== 'done');
  return (
    open.find((e) => eventPhase(e, today) === 'day') ?? open.find((e) => eventPhase(e, today) === 'after') ?? open[0] ?? sorted.at(-1) ?? null
  );
}

function Home({ tab, eventParam }: { tab: HomeTab; eventParam: string | null }) {
  const child = useChild((s) => s.child);
  const events = useEvents((s) => s.events);
  const today = useToday();
  const ws = getWorkspace();
  const chosen = events.find((e) => e.id === eventParam) ?? pickNearest(events, today);
  const hasAccess = useHasAccess(chosen?.id);

  if (!child || events.length === 0 || !chosen)
    return (
      <EmptyState
        title="No stories here yet"
        text="Tell us about the big day that's coming up. It takes two minutes, and the first chapter is written for your child."
        action={<CreateStoryButton workspace={ws} />}
      />
    );

  const label = eventLabel(chosen, getTemplate(chosen.type));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Link href="/home?tab=child" className="inline-flex min-h-tap items-center gap-2 rounded-pill border border-line bg-surface px-3 text-sm font-bold">
          <Icon name="smile" size={18} /> {child.name}
        </Link>
        <Link href={`/event/${chosen.id}/panel`} className="inline-flex min-h-tap items-center gap-1.5 rounded-pill border border-line bg-surface px-3 text-xs font-extrabold uppercase">
          <Icon name="hand-heart" size={16} /> Parent panel
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_300px]">
        <SideNav tab={tab} panelHref={`/event/${chosen.id}/panel`} workspace={ws} />
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1">
          {tab === 'path' && <PathTab event={chosen} events={events} child={child} today={today} hasAccess={hasAccess} />}
          {tab === 'days' && <DaysTab events={events} today={today} workspace={ws} />}
          {tab === 'library' && <LibraryTab events={events} child={child} />}
          {tab === 'badges' && <BadgesTab child={child} events={events} today={today} />}
          {tab === 'child' && <ChildTab child={child} events={events} today={today} />}
        </div>
        <aside className={`${tab === 'path' ? 'flex' : 'hidden xl:flex'} flex-col gap-4 lg:col-start-2 xl:col-start-3 xl:row-start-1`} aria-label="Today">
          <TasksCard tasks={todayTasks(chosen, today)} />
          <StreakCard streak={streakWithRest(events, today)} week={weekStrip(events, today)} child={child} />
          <LevelCard level={levelFor(totalStars(events, child))} name={child.name} />
          <RoutineCard name={child.name} />
          <InstallCard />
          <PlanCard event={chosen} hasAccess={hasAccess} label={label} />
          <CreateCard workspace={ws} />
        </aside>
      </div>
    </div>
  );
}

function PathTab({ event, events, child, today, hasAccess }: { event: BigEvent; events: BigEvent[]; child: ChildProfile; today: string; hasAccess: boolean }) {
  const t = getTemplate(event.type);
  const label = eventLabel(event, t);
  const p = readProgress(event);
  const phase = eventPhase(event, today);
  const ch = tonightChapter(event, today);
  const others = events.filter((e) => e.id !== event.id && eventPhase(e, today) !== 'done');
  const status =
    phase === 'day' ? 'Today is the big day' : phase === 'after' ? 'How did it go? Tell us' : phase === 'done' ? 'All done. Well done!'
      : ch ? `Tonight: chapter ${ch.index} of ${p.total}` : `${p.read} of ${p.total} chapters read`;
  return (
    <>
      <header className="flex flex-wrap items-center gap-3 rounded-card bg-primary p-4 text-primary-ink shadow-step-primary sm:p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-primary-ink/15"><EventIcon type={event.type} size={28} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wide opacity-85">{child.name}&apos;s big day · {dateLabel(event.date, { weekday: true })}</p>
          <h1 className="font-display text-lg font-extrabold leading-tight sm:text-xl">{label}</h1>
          <p className="text-base font-bold leading-snug">{status}</p>
        </div>
        <Link href={`/event/${event.id}`} className="inline-flex min-h-tap items-center gap-2 rounded-card border-2 border-primary-ink/30 px-3 text-sm font-extrabold uppercase hover:bg-primary-ink/10">
          <Icon name="book-open" size={18} /> Plan &amp; reminders
        </Link>
      </header>

      {others.length > 0 && (
        <nav aria-label="Other big days" className="flex flex-wrap gap-2">
          {[event, ...others].map((e) => (
            <Link
              key={e.id}
              href={`/home?event=${e.id}`}
              aria-current={e.id === event.id ? 'page' : undefined}
              className={`inline-flex min-h-tap items-center gap-2 rounded-pill border-2 px-3 text-sm font-bold ${e.id === event.id ? 'border-primary bg-surface-2' : 'border-line bg-surface'}`}
            >
              <EventIcon type={e.type} size={18} /> {eventLabel(e, getTemplate(e.type))}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex items-center gap-3 text-sm font-bold text-ink-soft">
        <span className="h-0.5 flex-1 rounded-pill bg-line" />
        {countdownText(event, t, today) ?? `${p.read} of ${p.total} evenings read`}
        <span className="h-0.5 flex-1 rounded-pill bg-line" />
      </div>

      <StoryPath nodes={buildPath(event, today, hasAccess)} child={child} />
    </>
  );
}

function DaysTab({ events, today, workspace }: { events: BigEvent[]; today: string; workspace: Workspace }) {
  const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : 1));
  const upcoming = sorted.filter((e) => e.date >= today && !e.checkin);
  const past = sorted.filter((e) => !(e.date >= today && !e.checkin)).reverse();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">Big days</h1>
        <CreateStoryButton workspace={workspace} label="New big day" className="sm:w-auto" />
      </div>
      {upcoming.length > 0 && (
        <section aria-labelledby="up" className="flex flex-col gap-3">
          <h2 id="up" className="text-lg font-extrabold">Coming up</h2>
          {upcoming.map((e) => <EventRow key={e.id} event={e} today={today} />)}
        </section>
      )}
      {past.length > 0 && (
        <section aria-labelledby="past" className="flex flex-col gap-3">
          <h2 id="past" className="text-lg font-extrabold">Past big days</h2>
          {past.map((e) => <EventRow key={e.id} event={e} today={today} />)}
        </section>
      )}
    </>
  );
}

function BadgesTab({ child, events, today }: { child: ChildProfile; events: BigEvent[]; today: string }) {
  const coming = events.filter((e) => !e.checkin && !child.badges.some((b) => b.eventId === e.id) && eventPhase(e, today) !== 'done');
  return (
    <>
      <h1 className="font-display text-xl font-extrabold">{child.name}&apos;s badges</h1>
      {child.badges.length === 0 && coming.length === 0 && <p className="text-sm text-ink-soft">Badges come after each big day&apos;s check-in.</p>}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {child.badges.map((b) => (
          <li key={b.eventId}>
            <Link href={`/event/${b.eventId}/badge`} className="flex flex-col items-center gap-2 rounded-card border-2 border-line bg-surface p-4 text-center text-sm font-bold hover:border-ink-soft/40">
              <BadgeArt eventType={b.eventType} size={96} label={b.label} />
              {b.label}
            </Link>
          </li>
        ))}
        {coming.map((e) => (
          <li key={e.id} className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-line p-4 text-center text-sm font-bold text-ink-soft">
            <BadgeArt eventType={e.type} earned={false} size={96} label={`Badge for ${eventLabel(e, getTemplate(e.type))}, not earned yet`} />
            After {eventLabel(e, getTemplate(e.type)).toLowerCase()}
          </li>
        ))}
      </ul>
    </>
  );
}

function ChildTab({ child, events, today }: { child: ChildProfile; events: BigEvent[]; today: string }) {
  const others = loadProfiles().filter((p) => p.childId !== child.id && p.name.toLowerCase() !== child.name.toLowerCase());
  return (
    <>
      <section className="flex items-center gap-4 rounded-card border-2 border-line bg-surface p-5">
        <Character character={child.character} mood="happy" size={96} decorative />
        <div className="flex flex-1 flex-col gap-1">
          <h1 className="font-display text-xl font-extrabold">{child.name}</h1>
          <p className="text-sm text-ink-soft">{child.age} years · {child.badges.length} {child.badges.length === 1 ? 'badge' : 'badges'}</p>
          <ButtonLink href="/settings" variant="secondary" className="mt-2 self-start whitespace-nowrap">
            <Icon name="pencil" size={18} /> Edit in Settings
          </ButtonLink>
        </div>
      </section>
      <WeekReport week={weekSummary(events, child, today)} name={child.name} />
      <LevelCard level={levelFor(totalStars(events, child))} name={child.name} />
      <section aria-labelledby="saved" className="flex flex-col gap-3">
        <h2 id="saved" className="text-lg font-extrabold">Other children on this device</h2>
        {others.length === 0 && <p className="text-sm text-ink-soft">When you make a story for another child, they are saved here, so you never type them again.</p>}
        {others.map((p) => (
          <Link key={p.childId} href={`/start?again=1&child=${encodeURIComponent(p.childId)}`} className="flex min-h-tap items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-step hover:border-ink-soft/40">
            <Character character={p.character} mood="calm" size={48} decorative />
            <span className="flex flex-1 flex-col">
              <span className="font-extrabold">{p.name}</span>
              <span className="text-xs text-ink-soft">{p.age} years · make a story for {p.name}</span>
            </span>
            <Icon name="arrow-right" size={20} />
          </Link>
        ))}
      </section>
    </>
  );
}

function EventRow({ event, today }: { event: BigEvent; today: string }) {
  const t = getTemplate(event.type);
  const p = readProgress(event);
  const phase = eventPhase(event, today);
  return (
    <Link href={`/home?event=${event.id}`} className="flex min-h-tap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-step hover:border-ink-soft/40">
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

function LibraryTab({ events, child }: { events: BigEvent[]; child: ChildProfile }) {
  const favorites = usePrefs((s) => s.favorites);
  const items = libraryItems(events, favorites);
  const favs = items.filter((i) => i.favorite);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">{child.name}&apos;s story library</h1>
        <ButtonLink href="/routine" variant="secondary" className="sm:w-auto"><Icon name="timer" size={18} /> Bedtime routine</ButtonLink>
      </div>
      {items.length === 0 && (
        <EmptyState
          title="No chapters read yet"
          text="Every chapter you read together lands here, so you can read a favourite again on any evening."
          action={<ButtonLink href="/home">Go to tonight&apos;s chapter</ButtonLink>}
        />
      )}
      {favs.length > 0 && (
        <section aria-labelledby="favs" className="flex flex-col gap-3">
          <h2 id="favs" className="text-lg font-extrabold">Favourites</h2>
          {favs.map((i) => <LibraryRow key={i.key} item={i} events={events} />)}
        </section>
      )}
      {items.length > 0 && (
        <section aria-labelledby="all" className="flex flex-col gap-3">
          <h2 id="all" className="text-lg font-extrabold">All chapters read</h2>
          <p className="text-sm text-ink-soft">Reading a story again is good: children feel safe with what they already know. Tap the heart to keep a chapter at the top.</p>
          {items.map((i) => <LibraryRow key={i.key} item={i} events={events} />)}
        </section>
      )}
    </>
  );
}

function LibraryRow({ item, events }: { item: LibraryItem; events: BigEvent[] }) {
  const toggle = usePrefs((s) => s.toggleFavorite);
  const ev = events.find((e) => e.id === item.eventId)!;
  const label = eventLabel(ev, getTemplate(ev.type));
  return (
    <div className="flex items-center gap-2 rounded-card border border-line bg-surface p-3 shadow-step">
      <Link href={`/event/${encodeURIComponent(item.eventId)}/read/${item.chapter}`} className="flex min-h-tap flex-1 items-center gap-3 rounded-card hover:bg-surface-2">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-surface-2"><EventIcon type={item.eventType} size={24} /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-extrabold">{item.title || `Chapter ${item.chapter}`}</span>
          <span className="text-xs text-ink-soft">{label} · chapter {item.chapter} · read {dateLabel(item.readOn)}</span>
        </span>
        <span className="hidden text-sm font-extrabold uppercase text-primary-text sm:inline">Read again</span>
      </Link>
      <button
        type="button"
        onClick={() => toggle(item.eventId, item.chapter)}
        aria-pressed={item.favorite}
        aria-label={item.favorite ? `Remove ${item.title || `chapter ${item.chapter}`} from favourites` : `Add ${item.title || `chapter ${item.chapter}`} to favourites`}
        className={`flex size-11 shrink-0 items-center justify-center rounded-pill ${item.favorite ? 'bg-accent text-accent-ink' : 'text-ink-soft hover:bg-surface-2'}`}
      >
        <Icon name="heart" size={22} />
      </button>
    </div>
  );
}
