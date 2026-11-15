import { describe, expect, it } from 'vitest';
import { describeCharacter, normalizeCharacter, resolveCharacter } from '@/lib/engine/character';
import { CharacterSchema } from '@/lib/engine/schemas';

describe('Story friend model', () => {
  it('translates a friend saved before 2.0 without loss', () => {
    expect(resolveCharacter({ animal: 'fox', color: 'purple', accessory: 'cap' })).toEqual({
      animal: 'fox', color: 'purple', outfit: 'tunic', headwear: 'cap', accessory: 'none', companion: 'none', fur: 'classic', size: 'm',
    });
    expect(resolveCharacter({ animal: 'bear', color: 'red', accessory: 'scarf' })).toMatchObject({ accessory: 'scarf', headwear: 'none' });
    expect(resolveCharacter({ animal: 'kitten', color: 'green', accessory: 'backpack' })).toMatchObject({ accessory: 'backpack' });
  });
  it('falls back to defaults for unknown values', () => {
    const r = resolveCharacter({ animal: 'unicorn', color: 'gold', accessory: 'sword' } as never);
    expect(r).toMatchObject({ animal: 'bunny', color: 'blue', accessory: 'none' });
  });
  it('old and new friends both pass the schema', () => {
    expect(CharacterSchema.safeParse({ animal: 'bunny', color: 'blue', accessory: 'cap' }).success).toBe(true);
    const full = normalizeCharacter({ animal: 'owl', color: 'teal', accessory: 'lantern', outfit: 'star-robe', headwear: 'wizard-hat', companion: 'firefly', fur: 'dusk' });
    expect(CharacterSchema.safeParse(full).success).toBe(true);
    expect(full.accessory).toBe('lantern');
  });
  it('describes the friend for the story prompt', () => {
    expect(describeCharacter({ animal: 'owl', color: 'teal', accessory: 'lantern', outfit: 'star-robe', headwear: 'acorn-cap', companion: 'firefly' }))
      .toBe('an owlet in a teal star robe with an acorn cap and a lantern, with a little firefly friend');
    expect(describeCharacter({ animal: 'bunny', color: 'blue', accessory: 'cap' })).toBe('a bunny in a blue tunic with a cap');
  });
  it('keeps the size, defaulting to medium', () => {
    expect(resolveCharacter({ animal: 'bunny', color: 'blue', accessory: 'cap' }).size).toBe('m');
    expect(resolveCharacter({ animal: 'bunny', color: 'blue', accessory: 'none', size: 'l' }).size).toBe('l');
    expect(CharacterSchema.safeParse({ animal: 'bunny', color: 'blue', accessory: 'none', size: 's' }).success).toBe(true);
    expect(CharacterSchema.safeParse({ animal: 'bunny', color: 'blue', accessory: 'none', size: 'xl' }).success).toBe(false);
  });
});
