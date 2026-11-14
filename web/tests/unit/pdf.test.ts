import { describe, expect, it } from 'vitest';
import { buildCardPdf, pdfSafe } from '@/lib/eventday/pdf';

describe('event-day card PDF (11.7, usability pass: a file, not the print window)', () => {
  it('builds an A5 PDF file', async () => {
    const buf = await buildCardPdf({
      title: "Mia's big day",
      subtitle: 'Dentist visit · Thu, Nov 19',
      steps: ['We sit in the big chair.', 'The dentist counts my teeth, one by one, with a tiny mirror and a light.', 'We get a sticker.'],
      technique: { label: 'Balloon breathing', how: 'Breathe in slowly, like filling a balloon, then let it out.' },
      footnote: 'Not therapy or medical advice.',
    });
    const head = new TextDecoder().decode(new Uint8Array(buf).slice(0, 5));
    expect(head).toBe('%PDF-');
    expect(new TextDecoder().decode(new Uint8Array(buf))).toMatch(/MediaBox \[0 0 419\.5\d* 595\.2\d*\]/);
  });
  it('keeps text inside the built-in fonts', () => {
    expect(pdfSafe('Mia’s “big” day — ok… ✈️')).toBe('Mia\'s "big" day - ok... ');
  });
});
