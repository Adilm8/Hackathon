/**
 * Event templates (docs/SPEC.md 7): the product's own knowledge, written by the team.
 * Static JSON imports so both the server and the browser bundle get them; each file is
 * validated by zod once, on first use, so a broken template fails loudly in tests and dev.
 */
import type { BigEvent, EventTemplate, EventType } from './types';
import { EventTemplateSchema } from './schemas';
import dentist from '@/content/events/dentist.json';
import school from '@/content/events/school.json';
import flight from '@/content/events/flight.json';
import sibling from '@/content/events/sibling.json';
import haircut from '@/content/events/haircut.json';
import shot from '@/content/events/shot.json';
import other from '@/content/events/other.json';

export const EVENT_TYPES: readonly EventType[] = ['dentist', 'school', 'flight', 'sibling', 'haircut', 'shot', 'other'];

const RAW: Record<EventType, unknown> = { dentist, school, flight, sibling, haircut, shot, other };

const cache = new Map<EventType, EventTemplate>();

/** The validated template of an event type. Throws when a template file is invalid. */
export function getTemplate(type: EventType): EventTemplate {
  let t = cache.get(type);
  if (!t) {
    const parsed = EventTemplateSchema.safeParse(RAW[type]);
    if (!parsed.success) {
      throw new Error(`Invalid event template '${type}': ${parsed.error.message}`);
    }
    if (parsed.data.type !== type) throw new Error(`Template file '${type}' declares type '${parsed.data.type}'`);
    t = parsed.data;
    cache.set(type, t);
  }
  return t;
}

/** All seven templates, in the order of EVENT_TYPES. */
export function allTemplates(): EventTemplate[] {
  return EVENT_TYPES.map(getTemplate);
}

/** Lazily built map, for code that prefers an object. */
export const TEMPLATES: Readonly<Record<EventType, EventTemplate>> = new Proxy({} as Record<EventType, EventTemplate>, {
  get: (_t, key) => (EVENT_TYPES.includes(key as EventType) ? getTemplate(key as EventType) : undefined),
  ownKeys: () => [...EVENT_TYPES],
  getOwnPropertyDescriptor: (_t, key) =>
    EVENT_TYPES.includes(key as EventType)
      ? { enumerable: true, configurable: true, value: getTemplate(key as EventType) }
      : undefined,
});

/**
 * Every scene id the templates may use. It matches BACKGROUND_IDS of the scene registry
 * (components/character/backgrounds.tsx, 11.4): one main scene per event plus three neutral ones.
 */
export const ALL_BACKGROUND_IDS: readonly string[] = [
  'dentist', 'school', 'flight', 'sibling', 'haircut', 'shot', 'home-evening', 'outside', 'cosy-room',
];

/** Display label: the parent's own label for "Other", else the template label. */
export function eventLabel(event: Pick<BigEvent, 'type' | 'customLabel'>, template?: EventTemplate): string {
  if (event.type === 'other' && event.customLabel?.trim()) return event.customLabel.trim();
  return (template ?? getTemplate(event.type)).label;
}

/** "the dentist" in "3 sleeps until the dentist". */
export function countdownLabel(event: Pick<BigEvent, 'type' | 'customLabel'>, template?: EventTemplate): string {
  return (template ?? getTemplate(event.type)).countdownLabel;
}

/** Every type has a template; kept for code written against the first registry. */
export function hasTemplate(type: EventType): boolean {
  return EVENT_TYPES.includes(type);
}

/** Finds a technique by id in a template. */
export function findTechnique(template: EventTemplate, id: string) {
  return template.techniques.find((t) => t.id === id);
}
