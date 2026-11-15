import type { SVGProps } from 'react';
import type { EventType } from '@/lib/engine/types';
import { LUCIDE } from './lucide-data';
import { EVENT_TONE, ICON_TONE, TONES, toneBg, toneFill, toneInk, type Tone } from './tones';

export type IconName =
  | 'stethoscope' | 'school' | 'plane-takeoff' | 'baby' | 'scissors' | 'syringe' | 'sparkles'
  | 'smile' | 'heart' | 'star' | 'check' | 'clock' | 'calendar-days' | 'printer' | 'download' | 'moon' | 'sun'
  | 'shield-check' | 'hand-heart' | 'bed-double' | 'book-open' | 'party-popper' | 'award'
  | 'sticker' | 'backpack' | 'armchair' | 'users-round' | 'map-pin' | 'sandwich' | 'cloud-moon'
  | 'hand' | 'ear' | 'wind' | 'circle-help' | 'arrow-right' | 'lock' | 'volume-2' | 'pencil'
  | 'door-open' | 'ticket' | 'luggage' | 'mic' | 'mic-off' | 'smile-plus' | 'cookie'
  | 'heart-pulse' | 'droplet' | 'hospital' | 'house' | 'moon-star' | 'users' | 'waves' | 'cake'
  | 'flame' | 'trophy' | 'crown' | 'target' | 'settings'
  | 'x' | 'chevron-up' | 'chevron-down' | 'chevron-right' | 'chevron-left' | 'bell' | 'maximize' | 'minimize' | 'keyboard'
  | 'snowflake' | 'share-2' | 'timer' | 'library-big' | 'play' | 'pause' | 'rotate-ccw' | 'bath' | 'shirt' | 'lamp' | 'smartphone'
  | 'briefcase' | 'heart-handshake' | 'paw-print' | 'house-plus' | 'notebook-pen' | 'bed-single' | 'glasses' | 'puzzle' | 'ghost'
  | 'gift' | 'car-front' | 'bike' | 'music' | 'drama' | 'medal' | 'tent' | 'blocks' | 'toilet' | 'bandage' | 'clapperboard';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Pixel size of the square icon (default 24). */
  size?: number;
  /** Accessible label; without it the icon is hidden from screen readers. */
  label?: string;
  /**
   * Coloured (duotone) look: a tone name, a hex colour, or 'auto' for the icon's default tone.
   * Without it the icon is a plain line icon in `currentColor`.
   */
  tone?: Tone | 'auto' | (string & {});
}

/** Resolves a tone prop to a hex colour, or null for a plain icon. */
export function resolveTone(name: string, tone: IconProps['tone']): string | null {
  if (!tone) return null;
  if (tone === 'auto') return TONES[ICON_TONE[name] ?? 'blue'];
  if (tone in TONES) return TONES[tone as Tone];
  return tone;
}

/**
 * Lucide stroke icon (ISC licence, see lucide-data.ts). Colour follows `currentColor`; with
 * `tone` the shapes get a soft colour fill under a coloured outline (works in light and night).
 */
export function Icon({ name, size = 24, label, strokeWidth = 2, tone, ...rest }: IconProps) {
  const inner = LUCIDE[name] ?? '';
  const hex = resolveTone(name, tone);
  const html = hex
    ? `<g fill="${toneFill(hex)}" stroke="none">${inner}</g><g stroke="${toneInk(hex)}">${inner}</g>`
    : inner;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export interface IconChipProps extends IconProps {
  /** Diameter of the round chip in px (default: icon size × 1.75). */
  chip?: number;
  className?: string;
}

/** A coloured icon on a soft round background of the same hue. */
export function IconChip({ name, size = 24, chip, tone = 'auto', className = '', ...rest }: IconChipProps) {
  const hex = resolveTone(name, tone) ?? TONES.blue;
  const d = chip ?? Math.round(size * 1.75);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-pill ${className}`}
      style={{ width: d, height: d, background: toneBg(hex) }}
    >
      <Icon name={name} size={size} tone={hex} {...rest} />
    </span>
  );
}

export const EVENT_ICON: Record<EventType, IconName> = {
  dentist: 'stethoscope',
  school: 'school',
  flight: 'plane-takeoff',
  sibling: 'baby',
  haircut: 'scissors',
  shot: 'syringe',
  doctor: 'heart-pulse',
  blood_test: 'droplet',
  hospital: 'hospital',
  moving: 'house',
  sleepover: 'moon-star',
  babysitter: 'users',
  swimming: 'waves',
  party: 'cake',
  tooth_loss: 'smile-plus',
  surgery: 'bandage',
  potty: 'toilet',
  daycare: 'blocks',
  new_school: 'backpack',
  camp: 'tent',
  sports: 'medal',
  performance: 'drama',
  new_class: 'music',
  bike: 'bike',
  road_trip: 'car-front',
  holiday: 'gift',
  halloween: 'ghost',
  playdate: 'puzzle',
  eye_exam: 'glasses',
  big_bed: 'bed-single',
  test_day: 'notebook-pen',
  two_homes: 'house-plus',
  new_pet: 'paw-print',
  pet_loss: 'heart-handshake',
  parent_trip: 'briefcase',
  other: 'sparkles',
};

export const EVENT_LABEL: Record<EventType, string> = {
  dentist: 'Dentist visit',
  school: 'First day at school',
  flight: 'Flight',
  sibling: 'New sibling',
  haircut: 'Haircut',
  shot: 'Shot at the doctor',
  doctor: 'Doctor check-up',
  blood_test: 'Blood test',
  hospital: 'Hospital stay',
  moving: 'Moving house',
  sleepover: 'First sleepover',
  babysitter: 'New babysitter',
  swimming: 'First swimming lesson',
  party: 'Birthday party',
  tooth_loss: 'Losing a tooth',
  surgery: 'Operation',
  potty: 'Big kid toilet',
  daycare: 'New daycare',
  new_school: 'Changing schools',
  camp: 'Summer camp',
  sports: 'Sports game',
  performance: 'Show or recital',
  new_class: 'New class or club',
  bike: 'Learning to ride a bike',
  road_trip: 'Long car trip',
  holiday: 'Family holiday',
  halloween: 'Halloween',
  playdate: 'First playdate',
  eye_exam: 'Eye test',
  big_bed: 'Big bed',
  test_day: 'Big test',
  two_homes: 'Two homes',
  new_pet: 'New pet',
  pet_loss: 'Saying goodbye to a pet',
  parent_trip: 'Grown-up goes away',
  other: 'Another big day',
};

export interface EventIconProps extends Omit<IconProps, 'name'> {
  type: EventType;
}

export function EventIcon({ type, label, tone, ...rest }: EventIconProps) {
  return <Icon name={EVENT_ICON[type]} label={label} tone={tone === 'auto' ? EVENT_TONE[type] : tone} {...rest} />;
}

/** The event's icon in its own colour on a soft round chip. */
export function EventChip({ type, size = 24, chip, className }: { type: EventType; size?: number; chip?: number; className?: string }) {
  return <IconChip name={EVENT_ICON[type]} tone={EVENT_TONE[type]} size={size} chip={chip} className={className} />;
}
