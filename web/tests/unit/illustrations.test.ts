import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import manifest from '@/content/illustrations/manifest.json';
import { backgroundForEvent } from '@/components/character/backgrounds';
import { BEATS, beatForPage, illustrationKey, illustrationSrc } from '@/lib/illustrations';
import { allIllustrationKeys, ILLUSTRATED_EVENTS, illustrationPrompt } from '@/lib/illustrations/prompts';
import { getTemplate } from '@/lib/engine/templates';

const publicDir = path.resolve(__dirname, '../../public');

describe('illustrated scenes', () => {
  it('has prompts for every event type, beat and neutral room', () => {
    expect(ILLUSTRATED_EVENTS).toHaveLength(15);
    expect(allIllustrationKeys()).toHaveLength(15 * 5 + 3);
    for (const k of allIllustrationKeys()) {
      const p = illustrationPrompt(k);
      expect(p, k).toBeTruthy();
      expect(p).toContain('picture-book');
      expect(p).toContain('Avoid:');
      expect(p).not.toMatch(/\[\[CHILD\]\]|\[\[GROWNUP\]\]/);
    }
  });

  it('every template beat has a picture key', () => {
    for (const t of ILLUSTRATED_EVENTS) expect(Object.keys(getTemplate(t).beats).sort()).toEqual([...BEATS].sort());
  });

  it('splits pages between the beats of a chapter in order', () => {
    expect(beatForPage(['what_happens'], 3, 6)).toBe('what_happens');
    expect([0, 1, 2, 3, 4, 5].map((i) => beatForPage(['what_happens', 'who_is_there'], i, 6))).toEqual([
      'what_happens', 'what_happens', 'what_happens', 'who_is_there', 'who_is_there', 'who_is_there',
    ]);
    expect(beatForPage([], 0, 0)).toBe('what_happens');
  });

  it('uses the neutral room away from the event and the beat picture at the event', () => {
    expect(illustrationKey('dentist', 'cosy-room', backgroundForEvent('dentist'), 'if_scared')).toBe('neutral/cosy-room');
    expect(illustrationKey('dentist', 'dentist', backgroundForEvent('dentist'), 'if_scared')).toBe('events/dentist/if_scared');
    // A sleepover happens in a bedroom: its own scene is the cosy room, so the beat picture shows.
    expect(illustrationKey('sleepover', 'cosy-room', backgroundForEvent('sleepover'), 'what_i_do')).toBe('events/sleepover/what_i_do');
  });

  it('lists only pictures that exist, and nothing unknown', () => {
    const keys = new Set(allIllustrationKeys());
    for (const [k, v] of Object.entries(manifest.files as Record<string, string>)) {
      expect(keys.has(k), k).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'illustrations', `${k}.webp`)), k).toBe(true);
      expect(illustrationSrc(k)).toBe(`/illustrations/${k}.webp?v=${v}`);
    }
    expect(illustrationSrc('events/dentist/nope')).toBeNull();
  });
});
