import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CartoonPlayer, cameraMove } from '@/components/reader/CartoonPlayer';
import { DEFAULT_CHARACTER } from '@/lib/engine/character';
import type { ChildProfile, Page } from '@/lib/engine/types';

const child = {
  id: 'c1', name: 'Max', age: 5, character: DEFAULT_CHARACTER,
  values: { tone: 'secular', bodyWords: 'family', family: ['Mom'] }, styleMode: 'story', techniques: [], badges: [], createdOn: '2026-11-15',
} as unknown as ChildProfile;
const page = (id: string, background: string, text: string): Page => ({
  id, kind: 'story', sentences: [{ text, kind: 'describe' }], mood: 'calm', background, addresses: [], source: 'fallback',
});

describe('cartoon mode', () => {
  it('moves the camera differently on neighbouring pages', () => {
    expect(cameraMove(0)).not.toBe(cameraMove(1));
    expect(cameraMove(5)).toBe(cameraMove(0));
  });

  it('shows the page picture, the friend and the subtitle with the child name', () => {
    const html = renderToStaticMarkup(h(CartoonPlayer, {
      pages: [page('p1', 'dentist', '[[CHILD]] sits in the big chair.'), page('p2', 'cosy-room', 'Time for bed.')],
      child, eventType: 'dentist', beats: ['what_happens'], night: false, onClose: () => {},
    }));
    expect(html).toContain('aria-label="Cartoon"');
    expect(html).toContain('1 / 2');
    expect(html).toContain('Max');
    expect(html).toContain('/illustrations/events/dentist/what_happens.webp');
    expect(html).toContain('<svg');
  });
});
