/**
 * Memory of what helped (docs/SPEC.md 5.7, F11). The child profile keeps one record per
 * technique and check-in; the newest record wins when a technique has both outcomes.
 */
import { compareDates, dateLabel } from './clock';
import { EVENT_TYPES, getTemplate } from './templates';
import { lowerFirst } from './text';
import type { ChildProfile, EventTemplate, TechniqueMemory, Topic } from './types';

export const CUSTOM_PREFIX = 'custom:';

export function isCustomTechnique(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

/** Newest record per technique id (later in the array wins on the same date). */
export function latestOutcomes(records: readonly TechniqueMemory[], opts: { excludeEventId?: string } = {}): TechniqueMemory[] {
  const byId = new Map<string, { r: TechniqueMemory; i: number }>();
  records.forEach((r, i) => {
    if (opts.excludeEventId && r.eventId === opts.excludeEventId) return;
    const prev = byId.get(r.techniqueId);
    if (!prev || compareDates(r.date, prev.r.date) >= 0) byId.set(r.techniqueId, { r, i });
  });
  return [...byId.values()]
    .sort((a, b) => compareDates(b.r.date, a.r.date) || b.i - a.i)
    .map((x) => x.r);
}

/**
 * What goes into the story context: "prefer" and "never use". Template techniques are
 * given by id (the prompt lists ids); a parent's own technique by its label.
 */
export function techniqueMemory(
  child: Pick<ChildProfile, 'techniques'> | null | undefined,
  opts: { excludeEventId?: string } = {},
): { helpedBefore: string[]; avoid: string[] } {
  const latest = latestOutcomes(child?.techniques ?? [], opts);
  const term = (r: TechniqueMemory) => (isCustomTechnique(r.techniqueId) ? r.label : r.techniqueId);
  return {
    helpedBefore: latest.filter((r) => r.outcome === 'helped').map(term).slice(0, 50),
    avoid: latest.filter((r) => r.outcome === 'didnt_help').map(term).slice(0, 50),
  };
}

/** Finds a technique by id in any template (memory travels across event types). */
export function findTechniqueAnywhere(id: string, prefer?: EventTemplate) {
  const inPreferred = prefer?.techniques.find((t) => t.id === id);
  if (inPreferred) return inPreferred;
  for (const type of EVENT_TYPES) {
    const t = getTemplate(type).techniques.find((x) => x.id === id);
    if (t) return t;
  }
  return undefined;
}

/** Short event name for memory lines: "haircut", "dentist visit". */
export function shortEventName(type: TechniqueMemory['eventType']): string {
  return lowerFirst(getTemplate(type).label);
}

/** "Last time: counting to ten helped (haircut, Oct 25)" (4.10). Helped lines first, at most `max`. */
export function memoryLines(
  child: Pick<ChildProfile, 'techniques'> | null | undefined,
  opts: { excludeEventId?: string; max?: number } = {},
): string[] {
  const latest = latestOutcomes(child?.techniques ?? [], opts);
  const line = (r: TechniqueMemory) =>
    `Last time: ${lowerFirst(r.label)} ${r.outcome === 'helped' ? 'helped' : "didn't help"} (${shortEventName(r.eventType)}, ${dateLabel(r.date)})`;
  const helped = latest.filter((r) => r.outcome === 'helped').map(line);
  const didnt = latest.filter((r) => r.outcome === 'didnt_help').map(line);
  return [...helped, ...didnt].slice(0, opts.max ?? 3);
}

export interface DayTechnique {
  id: string;
  label: string;
  how: string;
  reason: 'helped_before' | 'top_topic' | 'default';
}

/**
 * The one technique for the event day (4.10, 4.12): a technique that helped last time;
 * otherwise the template technique matching the top topic; never one that didn't help.
 */
export function pickDayTechnique(
  template: EventTemplate,
  child: Pick<ChildProfile, 'techniques'> | null | undefined,
  topTopics: readonly Topic[],
  opts: { excludeEventId?: string } = {},
): DayTechnique {
  const latest = latestOutcomes(child?.techniques ?? [], opts);
  const avoid = new Set(latest.filter((r) => r.outcome === 'didnt_help').map((r) => r.techniqueId));
  const helped = latest.filter((r) => r.outcome === 'helped');
  // Prefer a helped technique this template knows, then any helped one.
  const known = helped.find((r) => template.techniques.some((t) => t.id === r.techniqueId)) ?? helped[0];
  if (known) {
    const t = isCustomTechnique(known.techniqueId) ? undefined : findTechniqueAnywhere(known.techniqueId, template);
    return {
      id: known.techniqueId,
      label: t?.label ?? known.label,
      how: t?.how ?? 'It helped last time. Try it again.',
      reason: 'helped_before',
    };
  }
  const allowed = template.techniques.filter((t) => !avoid.has(t.id));
  for (const topic of topTopics) {
    const t = allowed.find((x) => x.topics.includes(topic));
    if (t) return { id: t.id, label: t.label, how: t.how, reason: 'top_topic' };
  }
  const t = allowed[0] ?? template.techniques[0];
  return { id: t.id, label: t.label, how: t.how, reason: 'default' };
}
