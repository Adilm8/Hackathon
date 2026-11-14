import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ACCESSORIES, ANIMALS, Character, MOODS } from '@/components/character/Character';
import { CLOTHES } from '@/components/character/palette';
import { BACKGROUND_IDS, backgroundForEvent, getBackground } from '@/components/character/backgrounds';
import { EVENT_ICON, EventIcon } from '@/components/icons/Icon';
import { LUCIDE } from '@/components/icons/lucide-data';
import { BadgeArt } from '@/components/badges/BadgeArt';
import type { CharacterColor, EventType } from '@/lib/engine/types';

const EVENTS: EventType[] = ['dentist', 'school', 'flight', 'sibling', 'haircut', 'shot', 'other'];
const scenesDir = path.resolve(__dirname, '../../public/scenes');

describe('character', () => {
  it('renders every animal, colour, accessory and mood', () => {
    for (const animal of ANIMALS)
      for (const color of Object.keys(CLOTHES) as CharacterColor[])
        for (const accessory of ACCESSORIES)
          for (const mood of MOODS) {
            const svg = renderToStaticMarkup(h(Character, { character: { animal, color, accessory }, mood }));
            expect(svg.startsWith('<svg')).toBe(true);
            expect(svg).toContain(`data-mood="${mood}"`);
          }
  });
  it('is labelled for screen readers unless decorative', () => {
    const spec = { animal: 'bunny', color: 'blue', accessory: 'cap' } as const;
    expect(renderToStaticMarkup(h(Character, { character: spec }))).toContain('aria-label="A calm bunny');
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
