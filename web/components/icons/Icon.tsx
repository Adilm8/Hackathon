import type { SVGProps } from 'react';
import type { EventType } from '@/lib/engine/types';
import { LUCIDE } from './lucide-data';

export type IconName =
  | 'stethoscope' | 'school' | 'plane-takeoff' | 'baby' | 'scissors' | 'syringe' | 'sparkles'
  | 'smile' | 'heart' | 'star' | 'check' | 'clock' | 'calendar-days' | 'printer' | 'download' | 'moon' | 'sun'
  | 'shield-check' | 'hand-heart' | 'bed-double' | 'book-open' | 'party-popper' | 'award'
  | 'sticker' | 'backpack' | 'armchair' | 'users-round' | 'map-pin' | 'sandwich' | 'cloud-moon'
  | 'hand' | 'ear' | 'wind' | 'circle-help' | 'arrow-right' | 'lock' | 'volume-2' | 'pencil'
  | 'door-open' | 'ticket' | 'luggage' | 'mic' | 'mic-off' | 'smile-plus' | 'cookie'
  | 'heart-pulse' | 'droplet' | 'hospital' | 'house' | 'moon-star' | 'users' | 'waves' | 'cake'
  | 'flame' | 'trophy' | 'crown' | 'target' | 'settings'
  | 'x' | 'chevron-up' | 'chevron-down' | 'chevron-right' | 'chevron-left' | 'bell' | 'maximize' | 'minimize'
  | 'snowflake' | 'share-2' | 'timer' | 'library-big' | 'play' | 'pause' | 'rotate-ccw' | 'bath' | 'shirt' | 'lamp' | 'smartphone';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Pixel size of the square icon (default 24). */
  size?: number;
  /** Accessible label; without it the icon is hidden from screen readers. */
  label?: string;
}

/** Lucide stroke icon (ISC licence, see lucide-data.ts). Colour follows `currentColor`. */
export function Icon({ name, size = 24, label, strokeWidth = 2, ...rest }: IconProps) {
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
      dangerouslySetInnerHTML={{ __html: LUCIDE[name] ?? '' }}
    />
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
  other: 'Another big day',
};

export interface EventIconProps extends Omit<IconProps, 'name'> {
  type: EventType;
}

export function EventIcon({ type, label, ...rest }: EventIconProps) {
  return <Icon name={EVENT_ICON[type]} label={label} {...rest} />;
}
