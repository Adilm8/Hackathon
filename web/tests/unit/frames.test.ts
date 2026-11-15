import { describe, expect, it } from 'vitest';
import { frameText, framePrompt, FRAME_MAX_CHARS } from '@/lib/frames/prompt';

describe('story frames', () => {
  it('never sends the child placeholder or a name slot to the image model', () => {
    const t = frameText(['[[CHILD]] sits in the big blue chair.', '[[GROWNUP]] holds a hand.']);
    expect(t).toBe('the child sits in the big blue chair. the grown-up holds a hand.');
    expect(t).not.toMatch(/\[\[/);
  });

  it('keeps the prompt short, in the shared style, with no people', () => {
    const long = frameText(['word '.repeat(300)]);
    expect(long.length).toBeLessThanOrEqual(FRAME_MAX_CHARS + 1);
    const p = framePrompt(['[[CHILD]] climbs into a big chair that hums.'], 'dentist');
    expect(p).toContain("children's dental clinic");
    expect(p).toContain('no people');
    expect(p).toContain('picture-book');
    expect(p).toContain('Avoid:');
  });
});
