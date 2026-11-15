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
import doctor from '@/content/events/doctor.json';
import blood_test from '@/content/events/blood_test.json';
import hospital from '@/content/events/hospital.json';
import moving from '@/content/events/moving.json';
import sleepover from '@/content/events/sleepover.json';
import babysitter from '@/content/events/babysitter.json';
import swimming from '@/content/events/swimming.json';
import party from '@/content/events/party.json';
import tooth_loss from '@/content/events/tooth_loss.json';
import surgery from '@/content/events/surgery.json';
import potty from '@/content/events/potty.json';
import daycare from '@/content/events/daycare.json';
import new_school from '@/content/events/new_school.json';
import camp from '@/content/events/camp.json';
import sports from '@/content/events/sports.json';
import performance from '@/content/events/performance.json';
import new_class from '@/content/events/new_class.json';
import bike from '@/content/events/bike.json';
import road_trip from '@/content/events/road_trip.json';
import holiday from '@/content/events/holiday.json';
import halloween from '@/content/events/halloween.json';
import playdate from '@/content/events/playdate.json';
import eye_exam from '@/content/events/eye_exam.json';
import big_bed from '@/content/events/big_bed.json';
import test_day from '@/content/events/test_day.json';
import two_homes from '@/content/events/two_homes.json';
import new_pet from '@/content/events/new_pet.json';
import pet_loss from '@/content/events/pet_loss.json';
import parent_trip from '@/content/events/parent_trip.json';
import other from '@/content/events/other.json';

/**
 * Groups of big days for the picker, in display order. Every type appears exactly once;
 * "other" is shown on its own after the groups.
 */
export const EVENT_GROUPS: readonly { id: string; label: string; types: readonly EventType[] }[] = [
  { id: 'health', label: 'Health and doctors', types: ['dentist', 'doctor', 'shot', 'blood_test', 'eye_exam', 'hospital', 'surgery'] },
  { id: 'growing', label: 'Growing up', types: ['potty', 'big_bed', 'tooth_loss', 'haircut', 'bike'] },
  { id: 'school', label: 'School and learning', types: ['daycare', 'school', 'new_school', 'test_day', 'new_class'] },
  { id: 'fun', label: 'Friends and fun', types: ['party', 'playdate', 'sports', 'performance', 'swimming', 'halloween', 'holiday'] },
  { id: 'away', label: 'Trips and nights away', types: ['flight', 'road_trip', 'sleepover', 'camp', 'babysitter'] },
  { id: 'family', label: 'Family changes', types: ['sibling', 'moving', 'new_pet', 'two_homes', 'pet_loss', 'parent_trip'] },
];

/** Every event type, in the order onboarding shows them; "other" stays last. */
export const EVENT_TYPES: readonly EventType[] = [...EVENT_GROUPS.flatMap((g) => g.types), 'other'];

const RAW: Record<EventType, unknown> = {
  dentist, school, flight, sibling, haircut, shot,
  doctor, blood_test, hospital, moving, sleepover, babysitter, swimming, party,
  tooth_loss,
  surgery,
  potty,
  daycare,
  new_school,
  camp,
  sports,
  performance,
  new_class,
  bike,
  road_trip,
  holiday,
  halloween,
  playdate,
  eye_exam,
  big_bed,
  test_day,
  two_homes,
  new_pet,
  pet_loss,
  parent_trip,
  other,
};

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

/** All templates, in the order of EVENT_TYPES. */
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
 * (components/character/backgrounds.tsx, 11.4): the six original event scenes plus three neutral ones.
 * Newer event types reuse these scenes (see backgroundForEvent).
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
