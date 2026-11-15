'use client';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/icons';
import type { Workspace } from '@/lib/engine/types';
import { ownStoryHref, startOwnStory } from '@/lib/store/sample';

export type HomeTab = 'path' | 'days' | 'library' | 'badges' | 'child';

interface NavItem { key: string; label: string; icon: IconName; href: string; tab?: HomeTab }

function items(panelHref: string | null): NavItem[] {
  return [
    { key: 'path', label: 'Stories', icon: 'house', href: '/home', tab: 'path' },
    { key: 'days', label: 'Big days', icon: 'calendar-days', href: '/home?tab=days', tab: 'days' },
    { key: 'library', label: 'Library', icon: 'library-big', href: '/home?tab=library', tab: 'library' },
    { key: 'badges', label: 'Badges', icon: 'trophy', href: '/home?tab=badges', tab: 'badges' },
    ...(panelHref ? [{ key: 'panel', label: 'Parent panel', icon: 'hand-heart' as IconName, href: panelHref }] : []),
    { key: 'child', label: 'Child', icon: 'smile', href: '/home?tab=child', tab: 'child' },
    { key: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
  ];
}

/** Left column from 1024 px: the sections of the parent's home. */
export function SideNav({ tab, panelHref, workspace }: { tab: HomeTab; panelHref: string | null; workspace: Workspace }) {
  return (
    <nav aria-label="Home sections" className="sticky top-20 hidden flex-col gap-1 self-start lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex">
      {items(panelHref).map((it) => {
        const on = it.tab === tab;
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={on ? 'page' : undefined}
            className={`flex min-h-tap items-center gap-3 rounded-card border-2 px-3 py-2 text-sm font-extrabold
              ${on ? 'border-primary bg-surface-2 text-primary-text' : 'border-transparent text-ink-soft hover:bg-surface-2'}`}
          >
            <Icon name={it.icon} size={24} tone="auto" /> {it.label}
          </Link>
        );
      })}
      <CreateNavButton workspace={workspace} className="mt-3" />
    </nav>
  );
}

function CreateNavButton({ workspace, className = '' }: { workspace: Workspace; className?: string }) {
  const cls = `flex min-h-tap items-center justify-center gap-2 rounded-pill bg-primary px-4 py-3 text-sm font-extrabold text-primary-ink shadow-step-primary hover:brightness-105 ${className}`;
  if (workspace === 'sample')
    return (
      <button type="button" onClick={startOwnStory} className={cls}>
        <Icon name="sparkles" size={18} /> Create your own story
      </button>
    );
  return (
    <Link href={ownStoryHref()} className={cls}>
      <Icon name="sparkles" size={18} /> New story
    </Link>
  );
}

/** Below 1024 px the sections become a bottom tab bar, with "New story" in the middle. */
export function TabBar({ tab, workspace }: { tab: HomeTab; workspace: Workspace }) {
  const all = items(null).filter((i) => i.tab);
  const left = all.slice(0, 2);
  const right = all.slice(2);
  const cell = (it: NavItem) => {
    const on = it.tab === tab;
    return (
      <Link
        key={it.key}
        href={it.href}
        aria-current={on ? 'page' : undefined}
        className={`flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold ${on ? 'text-primary-text' : 'text-ink-soft'}`}
      >
        <span className={`flex h-8 w-12 items-center justify-center rounded-pill ${on ? 'bg-surface-2' : ''}`}>
          <Icon name={it.icon} size={22} tone="auto" />
        </span>
        {it.label}
      </Link>
    );
  };
  const createCls = 'flex size-12 items-center justify-center rounded-pill bg-primary text-primary-ink shadow-step-primary';
  return (
    <nav aria-label="Home sections" className="no-print border-t border-line bg-surface lg:hidden">
      <div className="mx-auto flex max-w-xl items-center px-2 py-1">
        {left.map(cell)}
        <div className="flex flex-1 justify-center">
          {workspace === 'sample' ? (
            <button type="button" onClick={startOwnStory} aria-label="Create your own story (leaves the sample)" className={createCls}>
              <Icon name="sparkles" size={24} />
            </button>
          ) : (
            <Link href={ownStoryHref()} aria-label="Create a new story" className={createCls}>
              <Icon name="sparkles" size={24} />
            </Link>
          )}
        </div>
        {right.map(cell)}
      </div>
    </nav>
  );
}
