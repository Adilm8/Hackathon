import type { Metadata } from 'next';
import { EventTitle } from '@/components/ui/EventTitle';
import { APP_NAME } from '@/lib/titles';

/** Static title until the family stores load; EventTitle then adds the event and child name. */
// The template is repeated here: a nested layout with a plain string title would drop it for the screens below.
export const metadata: Metadata = { title: { default: 'Big day', template: `%s · ${APP_NAME}` } };

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EventTitle />
      {children}
    </>
  );
}
