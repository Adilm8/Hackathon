import type { IconName } from '@/components/icons';

/** Large icon for a "first → then" step, picked from its words; a calm default by position. */
const RULES: [RegExp, IconName][] = [
  [/chair|sit|seat/i, 'armchair'],
  [/teeth|tooth|smile|open wide|mouth/i, 'smile'],
  [/sticker|prize|treat|reward/i, 'sticker'],
  [/hand|hold|hug/i, 'hand-heart'],
  [/breath|blow|flower|candle/i, 'wind'],
  [/count|number/i, 'star'],
  [/plane|fly|flight|seat ?belt|take ?off/i, 'plane-takeoff'],
  [/bag|backpack|pack/i, 'backpack'],
  [/school|class|teacher/i, 'school'],
  [/cut|scissor|hair|cape/i, 'scissors'],
  [/shot|arm|needle|band-?aid|plaster/i, 'syringe'],
  [/baby|sister|brother|sibling/i, 'baby'],
  [/snack|eat|lunch|sandwich/i, 'sandwich'],
  [/cookie|ice cream/i, 'cookie'],
  [/door|walk in|arrive|go in/i, 'door-open'],
  [/listen|sound|noise|ear/i, 'ear'],
  [/ticket|check ?in/i, 'ticket'],
  [/suitcase|luggage/i, 'luggage'],
  [/home|bed|sleep/i, 'bed-double'],
  [/wait/i, 'clock'],
];
const BY_POSITION: IconName[] = ['door-open', 'star', 'party-popper'];

export function stepIcon(text: string, i: number): IconName {
  return RULES.find(([re]) => re.test(text))?.[1] ?? BY_POSITION[i] ?? 'star';
}
