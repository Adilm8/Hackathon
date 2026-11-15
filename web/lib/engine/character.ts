import type { Accessory, Animal, Character, CharacterColor, Companion, FurVariant, Headwear, Outfit } from './types';

/**
 * Story friend options and the one place that turns a saved Character (old or new) into a
 * complete one (SPEC 6, 11.4; art: docs/design/avatar-prompts.md). No React here, so the
 * server (story prompts) and the screens share it.
 */

export const ANIMALS: Animal[] = ['bunny', 'bear', 'fox', 'kitten', 'dragon', 'owl', 'hedgehog', 'fawn'];
export const CHARACTER_COLORS: CharacterColor[] = ['blue', 'green', 'yellow', 'red', 'purple', 'orange', 'teal', 'pink'];
export const OUTFITS: Outfit[] = [
  'tunic', 'raincoat', 'star-robe', 'knight-tabard', 'overalls', 'moon-pajamas', 'explorer-vest', 'knit-sweater',
];
export const HEADWEAR: Headwear[] = [
  'none', 'cap', 'wizard-hat', 'flower-crown', 'star-crown', 'beret', 'acorn-cap', 'bow-headband', 'goggles',
];
/** Accessories offered in the builder ('cap' is legacy and lives under headwear now). */
export const ACCESSORIES: Exclude<Accessory, 'cap'>[] = [
  'none', 'scarf', 'backpack', 'cape', 'satchel', 'star-necklace', 'star-wand', 'lantern', 'plush-star',
];
export const COMPANIONS: Companion[] = [
  'none', 'firefly', 'cloud-puff', 'star-sprite', 'crystal-snail', 'ladybug', 'tiny-turtle', 'mushroom-sprout', 'pebble-chick',
];
export const FUR_VARIANTS: FurVariant[] = ['classic', 'dusk', 'dawn'];

export interface ResolvedCharacter {
  animal: Animal;
  color: CharacterColor;
  outfit: Outfit;
  headwear: Headwear;
  accessory: Exclude<Accessory, 'cap'>;
  companion: Companion;
  fur: FurVariant;
}

export const DEFAULT_CHARACTER: Character = {
  animal: 'bunny', color: 'blue', accessory: 'none', outfit: 'tunic', headwear: 'cap', companion: 'none', fur: 'classic',
};

function oneOf<T extends string>(list: readonly T[], v: unknown, fallback: T): T {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

/**
 * Fills the Story friend 2.0 fields and translates old values without loss:
 * accessory 'cap' becomes headwear 'cap'; scarf and backpack stay accessories.
 * Unknown values (for example from an older or newer app version) fall back to defaults.
 */
export function resolveCharacter(c: Partial<Character> | null | undefined): ResolvedCharacter {
  const legacyCap = c?.accessory === 'cap';
  return {
    animal: oneOf(ANIMALS, c?.animal, 'bunny'),
    color: oneOf(CHARACTER_COLORS, c?.color, 'blue'),
    outfit: oneOf(OUTFITS, c?.outfit, 'tunic'),
    headwear: oneOf(HEADWEAR, c?.headwear, legacyCap ? 'cap' : 'none'),
    accessory: legacyCap ? 'none' : oneOf(ACCESSORIES, c?.accessory, 'none'),
    companion: oneOf(COMPANIONS, c?.companion, 'none'),
    fur: oneOf(FUR_VARIANTS, c?.fur, 'classic'),
  };
}

/** The complete, current form to save (no legacy values). */
export function normalizeCharacter(c: Partial<Character> | null | undefined): Character {
  return { ...resolveCharacter(c) };
}

/** Names shown to children and parents. */
export const ANIMAL_NAME: Record<Animal, string> = {
  bunny: 'Moon Bunny', bear: 'Cloud Cub', fox: 'Ember Fox', kitten: 'Star Kitten',
  dragon: 'Puff Dragon', owl: 'Owlet Sage', hedgehog: 'Moss Hedgehog', fawn: 'Dew Fawn',
};
/** Plain animal word for story text and alt text. */
export const ANIMAL_WORD: Record<Animal, string> = {
  bunny: 'bunny', bear: 'bear cub', fox: 'fox', kitten: 'kitten',
  dragon: 'little dragon', owl: 'owlet', hedgehog: 'hedgehog', fawn: 'fawn',
};
export const COLOR_NAME: Record<CharacterColor, string> = {
  blue: 'blue', green: 'green', yellow: 'yellow', red: 'red', purple: 'purple', orange: 'orange', teal: 'teal', pink: 'pink',
};
export const OUTFIT_NAME: Record<Outfit, string> = {
  tunic: 'Tunic', raincoat: 'Raincoat', 'star-robe': 'Star robe', 'knight-tabard': 'Knight tabard',
  overalls: 'Overalls', 'moon-pajamas': 'Moon pajamas', 'explorer-vest': 'Explorer vest', 'knit-sweater': 'Knit sweater',
};
export const HEADWEAR_NAME: Record<Headwear, string> = {
  none: 'No hat', cap: 'Cap', 'wizard-hat': 'Wizard hat', 'flower-crown': 'Flower crown', 'star-crown': 'Star crown',
  beret: 'Beret', 'acorn-cap': 'Acorn cap', 'bow-headband': 'Bow', goggles: 'Goggles',
};
export const ACCESSORY_NAME: Record<Exclude<Accessory, 'cap'>, string> = {
  none: 'Nothing', scarf: 'Scarf', backpack: 'Backpack', cape: 'Cape', satchel: 'Satchel',
  'star-necklace': 'Star necklace', 'star-wand': 'Star wand', lantern: 'Lantern', 'plush-star': 'Plush star',
};
export const COMPANION_NAME: Record<Companion, string> = {
  none: 'No buddy', firefly: 'Firefly', 'cloud-puff': 'Cloud puff', 'star-sprite': 'Star sprite',
  'crystal-snail': 'Crystal snail', ladybug: 'Ladybug', 'tiny-turtle': 'Tiny turtle',
  'mushroom-sprout': 'Mushroom sprout', 'pebble-chick': 'Pebble chick',
};
export const FUR_NAME: Record<FurVariant, string> = { classic: 'Classic', dusk: 'Dusk', dawn: 'Dawn' };

function a(word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;
}

/** "a fox in a blue star robe with a wizard hat and a lantern, with a little firefly friend" */
export function describeCharacter(c: Partial<Character>): string {
  const r = resolveCharacter(c);
  const outfit = OUTFIT_NAME[r.outfit].toLowerCase();
  const extras = [
    r.headwear !== 'none' ? a(HEADWEAR_NAME[r.headwear].toLowerCase()) : '',
    r.accessory !== 'none' ? a(ACCESSORY_NAME[r.accessory].toLowerCase()) : '',
  ].filter(Boolean);
  const buddy = r.companion !== 'none' ? `, with a little ${COMPANION_NAME[r.companion].toLowerCase()} friend` : '';
  return `${a(ANIMAL_WORD[r.animal])} in ${a(`${COLOR_NAME[r.color]} ${outfit}`)}${extras.length ? ` with ${extras.join(' and ')}` : ''}${buddy}`;
}
