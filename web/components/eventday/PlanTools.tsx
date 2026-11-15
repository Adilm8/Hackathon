'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CalendarButtons } from '@/components/eventday/CalendarButtons';
import { Icon, type IconName } from '@/components/icons';
import type { BigEvent } from '@/lib/engine/types';

/**
 * The tools under the story path, grouped in one card instead of a wall of equal buttons:
 * reminders (one calendar button with a choice inside), then the parent's places as list rows.
 */
export function PlanTools({ event, label, prep }: { event: BigEvent; label: string; prep: boolean }) {
  const id = encodeURIComponent(event.id);
  return (
    <section aria-label="Plan tools" className="overflow-hidden rounded-card border-2 border-line bg-surface shadow-step">
      {prep && (
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="flex flex-1 items-center gap-3">
            <Tile icon="bell" />
            <span className="flex min-w-0 flex-col">
              <span className="font-extrabold">Evening reminders</span>
              <span className="text-sm text-ink-soft">7:30 pm on each story evening</span>
            </span>
          </span>
          <CalendarButtons event={event} label={label} className="sm:self-center" />
        </div>
      )}
      <ul className={`divide-y divide-line ${prep ? 'border-t-2 border-line' : ''}`}>
        <Row href={`/event/${id}/panel`} icon="hand-heart" title="Parent panel" text="What to say, your child's questions, how it's going" />
        {prep && <Row href={`/event/${id}/story`} icon="pencil" title="Story options" text="Genre, length, names and words to avoid" />}
      </ul>
    </section>
  );
}

function Tile({ icon }: { icon: IconName }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-primary-text">
      <Icon name={icon} size={22} />
    </span>
  );
}

function Row({ href, icon, title, text }: { href: string; icon: IconName; title: string; text: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex min-h-tap items-center gap-3 p-4 hover:bg-surface-2 focus-visible:bg-surface-2">
        <Tile icon={icon} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-extrabold">{title}</span>
          <span className="truncate text-sm text-ink-soft">{text}</span>
        </span>
        <Icon name="chevron-right" size={20} className="shrink-0 text-ink-soft" />
      </Link>
    </li>
  );
}
