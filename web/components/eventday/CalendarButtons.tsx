'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { Sheet } from '@/components/ui/Sheet';
import type { BigEvent } from '@/lib/engine/types';
import { googleCalendarUrl, icsHref, upcomingReminders } from '@/lib/engine/ics';

function reminderData(event: BigEvent, label: string) {
  // Real device time, not the Demo clock: a reminder at 19:30 that has already passed is left out.
  return upcomingReminders(
    { label: label.slice(0, 60), eventId: event.id, chapterDates: event.chapters.map((c) => c.date).slice(0, 5), eventDate: event.date },
    new Date(),
  );
}

const choice =
  'flex min-h-tap items-center gap-3 rounded-card border-2 border-line bg-surface p-3 text-left shadow-step hover:border-ink-soft/40 active:translate-y-[2px] active:shadow-none';

/**
 * One "Add to calendar" button that opens a small sheet with the two ways to add the reminders:
 * a .ics file (Apple, Outlook, Android) or a prefilled Google Calendar event, docs/SPEC.md 11.8.
 * No child name goes into either. Renders nothing when every reminder is already in the past.
 */
export function CalendarButtons({ event, label, className = '' }: { event: BigEvent; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const data = reminderData(event, label);
  if (data.chapterDates.length === 0 && data.skipCheckin) return null;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`inline-flex min-h-tap shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-pill border-2 border-line bg-surface px-4 text-sm font-extrabold shadow-step hover:border-ink-soft/40 active:translate-y-[2px] active:shadow-none ${className}`}
      >
        <Icon name="calendar-days" size={18} /> Add to calendar
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Add the reminders" description="One reminder at 7:30 pm on each story evening. Your child's name is not added.">
        <div className="flex flex-col gap-3">
          <a href={icsHref(data)} download="big-day-stories.ics" onClick={() => setOpen(false)} className={choice}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-2"><Icon name="download" size={20} /></span>
            <span className="flex flex-1 flex-col">
              <span className="font-extrabold">Apple, Outlook or Android</span>
              <span className="text-xs text-ink-soft">Downloads a calendar file, open it to add</span>
            </span>
          </a>
          <a href={googleCalendarUrl(data, { baseUrl: origin })} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={choice}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-2"><Icon name="calendar-days" size={20} /></span>
            <span className="flex flex-1 flex-col">
              <span className="font-extrabold">Google Calendar</span>
              <span className="text-xs text-ink-soft">Opens in a new tab</span>
            </span>
          </a>
        </div>
      </Sheet>
    </>
  );
}
