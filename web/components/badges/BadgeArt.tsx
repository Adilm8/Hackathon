import type { EventType } from '@/lib/engine/types';
import { LUCIDE } from '@/components/icons/lucide-data';
import { EVENT_ICON } from '@/components/icons/Icon';
import { INK, mix } from '@/components/character/palette';

/** Medal colours per event type; the gold centre stays the shared "I'm ready" accent. */
const RIBBON: Record<EventType, string> = {
  dentist: '#5b6cff',
  school: '#e5565b',
  flight: '#3dbe8b',
  sibling: '#9b6be8',
  haircut: '#ff8a3d',
  shot: '#2fa6c9',
  other: '#6b6a7b',
};

/** Suggested labels; the template's own `badge.label` (SPEC 7) wins when it exists. */
export const BADGE_LABEL: Record<EventType, string> = {
  dentist: 'Brave Smile',
  school: 'Brave Backpack',
  flight: 'Brave Flyer',
  sibling: 'Big Sibling',
  haircut: 'Cool Cut',
  shot: 'Brave Arm',
  other: 'Brave Heart',
};

export interface BadgeArtProps {
  eventType: EventType;
  /** Earned badges are bright; unearned ones are grey outlines for the collection. */
  earned?: boolean;
  size?: number;
  className?: string;
  label?: string;
}

export function BadgeArt({ eventType, earned = true, size = 160, className, label }: BadgeArtProps) {
  const ribbon = earned ? RIBBON[eventType] : '#c9c6d6';
  const gold = earned ? '#ffb547' : '#e3e0ec';
  const goldDark = mix(gold, INK, 0.2);
  const ink = earned ? INK : '#8e8ca3';
  const text = label ?? BADGE_LABEL[eventType];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 230"
      width={size}
      height={Math.round((size * 230) / 200)}
      className={className}
      role="img"
      aria-label={earned ? `Badge: ${text}` : `Not earned yet: ${text}`}
      focusable="false"
    >
      <path d="M62 150 L40 218 L72 204 L88 228 L104 160 Z" fill={ribbon} />
      <path d="M138 150 L160 218 L128 204 L112 228 L96 160 Z" fill={mix(ribbon, INK, 0.2)} />
      <circle cx="100" cy="94" r="80" fill={goldDark} />
      <circle cx="100" cy="90" r="80" fill={gold} />
      <circle cx="100" cy="90" r="64" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" opacity={earned ? 0.9 : 0.6} />
      <circle cx="100" cy="90" r="52" fill="#fff" opacity={earned ? 0.92 : 0.7} />
      <g transform="translate(64 54) scale(3)" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: LUCIDE[EVENT_ICON[eventType]] ?? '' }} />
      {earned && (
        <path d="M156 30 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill="#fff" opacity="0.9" />
      )}
    </svg>
  );
}

/** The "I'm ready" star shown after the story finale (style guide, component Badge). */
export function ReadyStar({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="Ready star" focusable="false">
      <path d="M50 8 L61 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L39 36 Z" fill="#ffb547" stroke="#e08f12" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 22 L56 40 L74 41 L60 53" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
