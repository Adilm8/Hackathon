import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Character, characterLayers, MOODS } from '@/components/character/Character';
import {
  ACCESSORIES, ANIMALS, CHARACTER_COLORS, COMPANIONS, DEFAULT_CHARACTER, FUR_VARIANTS, HEADWEAR, OUTFITS, resolveCharacter,
} from '@/lib/engine/character';
import { BACKGROUND_IDS, backgroundForEvent, getBackground } from '@/components/character/backgrounds';
import { EVENT_ICON, EventIcon } from '@/components/icons/Icon';
import { LUCIDE } from '@/components/icons/lucide-data';
import { BadgeArt } from '@/components/badges/BadgeArt';
import type { Character as CharacterSpec, EventType } from '@/lib/engine/types';

const EVENTS: EventType[] = ['dentist', 'school', 'flight', 'sibling', 'haircut', 'shot', 'other'];
const publicDir = path.resolve(__dirname, '../../public');
const scenesDir = path.join(publicDir, 'scenes');

describe('character', () => {
  it('renders every option of every part and mood', () => {
    const rows: Partial<CharacterSpec>[] = [
      ...ANIMALS.flatMap((animal) => FUR_VARIANTS.map((fur) => ({ animal, fur }))),
      ...CHARACTER_COLORS.flatMap((color) => OUTFITS.map((outfit) => ({ color, outfit }))),
      ...HEADWEAR.map((headwear) => ({ headwear })),
      ...ACCESSORIES.map((accessory) => ({ accessory })),
      ...COMPANIONS.map((companion) => ({ companion })),
    ];
    for (const row of rows)
      for (const mood of MOODS) {
        const character = { ...DEFAULT_CHARACTER, ...row } as CharacterSpec;
        const svg = renderToStaticMarkup(h(Character, { character, mood }));
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain(`data-mood="${mood}"`);
        for (const l of characterLayers(resolveCharacter(character), mood)) {
          const file = path.join(publicDir, l.src!.split('?')[0]);
          expect(fs.existsSync(file), file).toBe(true);
        }
      }
  });
  it('keeps every layer file small', () => {
    const dir = path.join(publicDir, 'avatar');
    for (const level of fs.readdirSync(dir))
      for (const f of fs.readdirSync(path.join(dir, level)))
        expect(fs.statSync(path.join(dir, level, f)).size, `${level}/${f}`).toBeLessThan(40 * 1024);
  });
  it('still draws friends saved before Story friend 2.0', () => {
    const svg = renderToStaticMarkup(h(Character, { character: { animal: 'bunny', color: 'blue', accessory: 'cap' } }));
    expect(svg).toContain('/avatar/headwear/cap--blue.svg');
    expect(svg).toContain('/avatar/outfit/tunic--blue.svg');
  });
  it('is labelled for screen readers unless decorative', () => {
    const spec = { animal: 'bunny', color: 'blue', accessory: 'cap' } as const;
    expect(renderToStaticMarkup(h(Character, { character: spec }))).toContain('aria-label="A calm bunny in a blue tunic with cap');
    expect(renderToStaticMarkup(h(Character, { character: spec, decorative: true }))).toContain('aria-hidden="true"');
  });
});

describe('scenes', () => {
  it('has a day and night file under 150 KB for every registered id', () => {
    for (const id of BACKGROUND_IDS) {
      const bg = getBackground(id);
      for (const src of [bg.src, bg.nightSrc]) {
        const file = path.join(scenesDir, path.basename(src));
        expect(fs.existsSync(file), file).toBe(true);
        expect(fs.statSync(file).size).toBeLessThan(150 * 1024);
      }
    }
  });
  it('falls back to a known scene for unknown ids and covers every event', () => {
    expect(getBackground('made-up-by-model').id).toBe('cosy-room');
    for (const e of EVENTS) expect(BACKGROUND_IDS).toContain(backgroundForEvent(e));
  });
});

describe('icons and badges', () => {
  it('has an icon shape for every event type', () => {
    for (const e of EVENTS) {
      expect(LUCIDE[EVENT_ICON[e]]).toBeTruthy();
      expect(renderToStaticMarkup(h(EventIcon, { type: e }))).toContain('<svg');
      expect(renderToStaticMarkup(h(BadgeArt, { eventType: e }))).toContain('Badge:');
    }
  });
});
