import type { BackgroundId, EventType } from '@/lib/engine/types';
import { SceneImage } from './SceneImage';

/**
 * Scene registry (SPEC 11.4). Every id maps to a static SVG in public/scenes (day and night
 * variants, produced by components/character/scenes/generate.mjs). Nothing is generated at run time.
 */
export const BACKGROUND_IDS = [
  'dentist',
  'school',
  'flight',
  'sibling',
  'haircut',
  'shot',
  'home-evening',
  'outside',
  'cosy-room',
] as const;

export type KnownBackgroundId = (typeof BACKGROUND_IDS)[number];

export interface Background {
  id: KnownBackgroundId;
  src: string;
  nightSrc: string;
  alt: string;
}

const ALT: Record<KnownBackgroundId, string> = {
  dentist: 'A friendly dentist room with a big blue chair and a lamp',
  school: 'A bright classroom with a chalkboard, cubbies and little tables',
  flight: 'An airport window with a plane waiting outside and cosy seats',
  sibling: 'A soft nursery with a crib, a mobile and building blocks',
  haircut: 'A hair salon with a big mirror and a small red chair',
  shot: 'A calm clinic room with an exam table and a rainbow poster',
  'home-evening': 'A living room in the evening with a sofa and a warm lamp',
  outside: 'A friendly building with a blue door and a tree in front',
  'cosy-room': 'A cosy bedroom with a bed, a night lamp and a shelf of books',
};

export const DEFAULT_BACKGROUND: KnownBackgroundId = 'cosy-room';

export function isKnownBackground(id: string): id is KnownBackgroundId {
  return (BACKGROUND_IDS as readonly string[]).includes(id);
}

/** Unknown ids (for example from a model) fall back to the cosy room instead of a broken image. */
export function getBackground(id: BackgroundId): Background {
  const known = isKnownBackground(id) ? id : DEFAULT_BACKGROUND;
  return { id: known, src: `/scenes/${known}.svg`, nightSrc: `/scenes/${known}-night.svg`, alt: ALT[known] };
}

/** The main scene of each event type. Types without a scene of their own reuse the closest one. */
const EVENT_SCENE: Record<EventType, KnownBackgroundId> = {
  dentist: 'dentist', school: 'school', flight: 'flight', sibling: 'sibling', haircut: 'haircut', shot: 'shot',
  doctor: 'shot', blood_test: 'shot', hospital: 'shot', moving: 'outside', sleepover: 'cosy-room',
  babysitter: 'home-evening', swimming: 'outside', party: 'home-evening', tooth_loss: 'home-evening',
  surgery: 'shot',
  potty: 'home-evening',
  daycare: 'school',
  new_school: 'school',
  camp: 'outside',
  sports: 'outside',
  performance: 'school',
  new_class: 'school',
  bike: 'outside',
  road_trip: 'outside',
  holiday: 'home-evening',
  halloween: 'outside',
  playdate: 'home-evening',
  eye_exam: 'dentist',
  big_bed: 'cosy-room',
  test_day: 'school',
  two_homes: 'home-evening',
  new_pet: 'home-evening',
  pet_loss: 'cosy-room',
  parent_trip: 'home-evening',
  other: 'outside',
};

/** The main scene of an event type; "other" uses the neutral outside-a-building scene. */
export function backgroundForEvent(type: EventType): KnownBackgroundId {
  return EVENT_SCENE[type];
}

export interface SceneProps {
  id: BackgroundId;
  night?: boolean;
  className?: string;
  /** Pass true when the scene only decorates the page. */
  decorative?: boolean;
}

/** Fills its parent (position the parent relative); the picture covers the box. */
export function Scene({ id, night = false, className = '', decorative = true }: SceneProps) {
  const bg = getBackground(id);
  const fallback = `/scenes/${DEFAULT_BACKGROUND}.svg`;
  const sources = [...new Set([night ? bg.nightSrc : bg.src, bg.src, fallback])];
  return <SceneImage key={sources.join("|")} sources={sources} alt={decorative ? '' : bg.alt} className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
}
