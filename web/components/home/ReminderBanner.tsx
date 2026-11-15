'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import type { BigEvent } from '@/lib/engine/types';
import { refreshPush } from '@/lib/push/client';
import { computeReminders, dueNow } from '@/lib/push/reminders';
import { useEvents } from '@/lib/store/events';
import { usePrefs } from '@/lib/store/prefs';

/**
 * The in-app reminder (works everywhere, also where push does not): when a reminder's time has
 * come today, a bright line at the top of /home leads to it. Also refreshes the push reminder
 * times once per visit, so the server always has the current plan.
 */
export function ReminderBanner({ events, today }: { events: BigEvent[]; today: string }) {
  const all = useEvents((s) => s.events);
  const evening = usePrefs((s) => s.reminderEvening);
  const quietStart = usePrefs((s) => s.quietStart);
  const quietEnd = usePrefs((s) => s.quietEnd);
  const push = usePrefs((s) => s.push);
  useEffect(() => {
    if (push) void refreshPush(all);
  }, [push, all, evening, quietStart, quietEnd]);

  const [now] = useState(() => Date.now());
  const r = dueNow(computeReminders(events, today, now, { evening, quietStart, quietEnd }), now, today);
  if (!r) return null;
  return (
    <Link
      href={r.url}
      role="status"
      className="flex min-h-tap items-center gap-3 rounded-card border-2 border-accent bg-surface p-3 shadow-step hover:bg-surface-2"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-ink">
        <Icon name={r.kind === 'chapter' ? 'moon-star' : r.kind === 'day' ? 'sun' : 'smile'} size={22} />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-extrabold">{r.title}</span>
        <span className="text-sm text-ink-soft">{r.body}</span>
      </span>
      <Icon name="arrow-right" size={20} />
    </Link>
  );
}
