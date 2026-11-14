/** Next event suggestions by age (docs/SPEC.md 5.9). */
import { addDays, compareDates } from './clock';
import type { BigEvent, ChildProfile, EventType, ISODate } from './types';

const BY_AGE: { maxAge: number; types: EventType[] }[] = [
  { maxAge: 4, types: ['haircut', 'shot', 'dentist', 'school'] },
  { maxAge: 6, types: ['school', 'dentist', 'flight', 'shot'] },
  { maxAge: 8, types: ['dentist', 'flight', 'shot', 'sibling'] },
];
const ALL: EventType[] = ['dentist', 'school', 'flight', 'shot', 'haircut', 'sibling'];

/**
 * Three suggested next events: the age table minus event types the child has had in the
 * last 90 days (or has planned). When fewer than n remain, other types fill the list.
 */
export function suggestNext(
  child: Pick<ChildProfile, 'age'>,
  events: readonly Pick<BigEvent, 'type' | 'date'>[],
  today: ISODate,
  n = 3,
): EventType[] {
  const since = addDays(today, -90);
  const recent = new Set(events.filter((e) => compareDates(e.date, since) >= 0).map((e) => e.type));
  const table = (BY_AGE.find((r) => child.age <= r.maxAge) ?? BY_AGE[BY_AGE.length - 1]).types;
  const out = table.filter((t) => !recent.has(t));
  for (const t of ALL) if (out.length < n && !out.includes(t) && !recent.has(t)) out.push(t);
  return out.slice(0, n);
}
