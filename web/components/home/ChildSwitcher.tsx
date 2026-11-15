'use client';
import Link from 'next/link';
import { Character } from '@/components/character';
import { Icon } from '@/components/icons';
import { childChoices, useRoster } from '@/lib/store/children';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { loadProfiles } from '@/lib/store/profiles';
import { getWorkspace } from '@/lib/store/workspace';

/**
 * Quick switch between the children on this device (shown with two or more). Each chip is a
 * child's story friend and first name; the active one is ringed. "Add a child" starts a story
 * for someone new.
 */
export function ChildSwitcher({ onSwitch, compact = false }: { onSwitch: (childId: string) => void; compact?: boolean }) {
  const active = useChild((s) => s.child);
  const others = useRoster((s) => s.others);
  const events = useEvents((s) => s.events);
  const choices = childChoices(active, others, events, loadProfiles());
  if (choices.length < 2) return null;
  return (
    <nav aria-label="Switch child" className="flex items-center gap-2 overflow-x-auto pb-1">
      {!compact && <span className="shrink-0 text-xs font-extrabold uppercase tracking-wide text-ink-soft">Stories for</span>}
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={c.active}
          onClick={() => !c.active && onSwitch(c.id)}
          className={`flex min-h-tap shrink-0 items-center gap-2 rounded-pill border-2 py-1 pl-1 pr-3 text-sm font-extrabold ${
            c.active ? 'border-primary bg-surface-2 text-ink' : 'border-line bg-surface text-ink-soft hover:border-ink-soft/40'
          }`}
        >
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-pill bg-surface-2">
            <Character character={c.character} mood={c.active ? 'happy' : 'calm'} size={36} framing="head" decorative />
          </span>
          {c.name}
          {c.active && <span className="sr-only">(shown now)</span>}
        </button>
      ))}
      {getWorkspace() === 'real' && (
        <Link href="/start?again=1" className="flex min-h-tap shrink-0 items-center gap-1 rounded-pill border-2 border-dashed border-line px-3 text-sm font-bold text-ink-soft hover:border-ink-soft/40">
          <Icon name="smile-plus" size={18} /> Add a child
        </Link>
      )}
    </nav>
  );
}
