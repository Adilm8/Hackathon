'use client';
import { useParams, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useEventCtx } from '@/lib/store/hooks';
import { eventLabel } from '@/lib/store/engine';
import { APP_NAME, eventScreenTitle } from '@/lib/titles';

/**
 * Tab title of the event screens with the event and the child's first name,
 * e.g. "Chapter 2 · Dentist visit · Big Day Stories". The stores live in the browser,
 * so this runs on the client after the static title from the route's layout.
 */
export function EventTitle() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const ctx = useEventCtx(id);
  const label = ctx ? eventLabel(ctx.event, ctx.template) : null;
  const childName = ctx?.child.name ?? null;

  useEffect(() => {
    if (!label) return;
    const title = `${eventScreenTitle(pathname, id, label, childName)} · ${APP_NAME}`;
    const apply = () => { if (document.title !== title) document.title = title; };
    apply();
    // On the first load of a dynamic route Next writes the static <title> from the layout
    // after this effect, so keep ours on top while this screen is open.
    const obs = new MutationObserver(apply);
    obs.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => obs.disconnect();
  }, [pathname, id, label, childName]);

  return null;
}
