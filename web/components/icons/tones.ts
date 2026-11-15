import type { EventType } from '@/lib/engine/types';

/**
 * Colours for the coloured ("duotone") icons. Fixed hues that read on every palette: the icon
 * stroke is the hue mixed with --ink (darker by day, lighter at night) and the soft fill is the
 * hue at low opacity, so the same tone works in light and night mode without extra tokens.
 */
export const TONES = {
  blue: '#5b6cff',
  sky: '#3aa0e0',
  teal: '#22a99a',
  green: '#3dbe8b',
  yellow: '#f5b400',
  orange: '#ff8a3d',
  coral: '#ef5f5f',
  pink: '#ec5f9a',
  purple: '#9b6be8',
  slate: '#7a7f9a',
} as const;

export type Tone = keyof typeof TONES;

/** Stroke colour of a toned icon: readable on --surface / --bg in both modes. */
export const toneInk = (hex: string) => `color-mix(in srgb, ${hex} 72%, var(--ink))`;
/** Soft fill inside the icon's closed shapes. */
export const toneFill = (hex: string) => `color-mix(in srgb, ${hex} 30%, transparent)`;
/** Round background of an icon chip. */
export const toneBg = (hex: string) => `color-mix(in srgb, ${hex} 17%, var(--surface))`;

/** Default tone per icon name, so `<Icon tone="auto">` picks a fitting colour. */
export const ICON_TONE: Record<string, Tone> = {
  house: 'blue', 'calendar-days': 'coral', 'library-big': 'teal', trophy: 'yellow', 'hand-heart': 'pink',
  smile: 'orange', 'smile-plus': 'orange', settings: 'slate', sparkles: 'purple', 'book-open': 'blue',
  sun: 'yellow', moon: 'purple', 'moon-star': 'purple', 'cloud-moon': 'purple', star: 'yellow', crown: 'yellow',
  flame: 'orange', snowflake: 'sky', heart: 'pink', 'heart-pulse': 'coral', 'circle-help': 'sky',
  target: 'coral', check: 'green', award: 'yellow', medal: 'yellow', timer: 'teal', smartphone: 'sky',
  download: 'teal', bell: 'yellow', lock: 'slate', 'shield-check': 'green', gift: 'coral', music: 'purple',
  'volume-2': 'sky', mic: 'pink', pencil: 'orange', printer: 'slate', 'share-2': 'sky', cookie: 'orange',
  'paw-print': 'orange', 'party-popper': 'pink', cake: 'pink', ear: 'orange', wind: 'sky', hand: 'orange',
  'door-open': 'teal', ticket: 'pink', luggage: 'sky', backpack: 'coral', sticker: 'pink', clock: 'sky',
  bath: 'sky', shirt: 'blue', lamp: 'yellow', 'bed-double': 'purple', 'bed-single': 'purple', keyboard: 'slate',
  play: 'green', pause: 'slate', 'rotate-ccw': 'slate', 'users-round': 'teal', users: 'teal', 'map-pin': 'coral',
  sandwich: 'orange', 'arrow-right': 'blue', 'chevron-right': 'blue', 'notebook-pen': 'blue', puzzle: 'green',
  blocks: 'orange', drama: 'purple', tent: 'green', bike: 'teal', 'car-front': 'sky', ghost: 'purple',
  glasses: 'sky', toilet: 'sky', bandage: 'coral', clapperboard: 'slate', 'heart-handshake': 'pink',
  briefcase: 'orange', 'house-plus': 'orange', waves: 'sky', droplet: 'coral', hospital: 'teal',
  stethoscope: 'blue', school: 'coral', 'plane-takeoff': 'green', baby: 'purple', scissors: 'orange', syringe: 'sky',
};

/** One colour per event type: the medal ribbon, the event chip and the coloured event icon. */
export const EVENT_TONE: Record<EventType, string> = {
  dentist: '#5b6cff',
  school: '#e5565b',
  flight: '#3dbe8b',
  sibling: '#9b6be8',
  haircut: '#ff8a3d',
  shot: '#2fa6c9',
  doctor: '#3aa0e0',
  blood_test: '#e0527a',
  hospital: '#4fb3a9',
  moving: '#c98a3d',
  sleepover: '#5a5fc9',
  babysitter: '#d46bb3',
  swimming: '#2bb5d6',
  party: '#f06c9b',
  tooth_loss: '#f2a93b',
  surgery: '#4f8fd9',
  potty: '#7cc36b',
  daycare: '#f07a5a',
  new_school: '#d9534f',
  camp: '#4caf7a',
  sports: '#e8a33d',
  performance: '#b05fd6',
  new_class: '#5aa9e6',
  bike: '#3fae9b',
  road_trip: '#6b8bd6',
  holiday: '#e0654f',
  halloween: '#f08a24',
  playdate: '#e86fa0',
  eye_exam: '#3a9bd9',
  big_bed: '#7a6be0',
  test_day: '#5c7fb8',
  two_homes: '#c77d5a',
  new_pet: '#d99a3d',
  pet_loss: '#8a7fb8',
  parent_trip: '#4f9fa8',
  other: '#6b6a7b',
};
