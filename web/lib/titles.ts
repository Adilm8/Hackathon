/** Browser tab titles (layout template "%s · Big Day Stories"). Kept free of React so the server layouts can import it. */
export const APP_NAME = 'Big Day Stories';

/** Title of an event screen from its path, e.g. "/event/abc/read/2" → "Chapter 2 · Dentist visit". */
export function eventScreenTitle(pathname: string, id: string, label: string, childName?: string | null): string {
  const rest = pathname.split(`/event/${id}`)[1]?.replace(/^\/+|\/+$/g, '') ?? '';
  const [screen, arg] = rest.split('/');
  const name = childName?.trim() || null;
  switch (screen) {
    case 'read': return arg ? `Chapter ${arg} · ${label}` : label;
    case 'day': return `Event day · ${label}`;
    case 'checkin': return `Check-in · ${label}`;
    case 'badge': return name ? `${name}’s badge · ${label}` : `Badge · ${label}`;
    case 'panel': return `Parent panel · ${label}`;
    case 'paywall': return `Unlock plan · ${label}`;
    default: return name ? `${label} · ${name}` : label;
  }
}
