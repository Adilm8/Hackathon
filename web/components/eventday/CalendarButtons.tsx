'use client';
import { Icon } from '@/components/icons';
import { buttonClass } from '@/components/ui/Button';
import type { BigEvent } from '@/lib/engine/types';
import { googleCalendarUrl, icsHref, type IcsData } from '@/lib/engine/ics';

/**
 * "Add to calendar" (.ics for Apple, Outlook, Android) and "Google Calendar" (a prefilled
 * nightly reminder), docs/SPEC.md 11.8. No child name goes into either.
 */
export function CalendarButtons({ event, label }: { event: BigEvent; label: string }) {
  const data: IcsData = {
    label: label.slice(0, 60),
    eventId: event.id,
    chapterDates: event.chapters.map((c) => c.date).slice(0, 5),
    eventDate: event.date,
  };
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a href={icsHref(data)} download="big-day-stories.ics" className={buttonClass('secondary', 'm')}>
        <Icon name="calendar-days" size={20} /> Add to calendar
      </a>
      <a href={googleCalendarUrl(data, { baseUrl: origin })} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'm')}>
        <Icon name="calendar-days" size={20} /> Google Calendar
      </a>
    </div>
  );
}
