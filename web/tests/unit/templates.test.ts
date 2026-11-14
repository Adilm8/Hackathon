import { describe, expect, it } from 'vitest';
import { EventTemplateSchema } from '@/lib/engine/schemas';
import { allTemplates } from '@/lib/engine/templates';

describe('event templates', () => {
  for (const t of allTemplates()) {
    it(`${t.type} matches the schema and is self-consistent`, () => {
      expect(() => EventTemplateSchema.parse(t)).not.toThrow();
      const techniqueIds = new Set(t.techniques.map((x) => x.id));
      expect(techniqueIds.size).toBe(t.techniques.length);
      for (const mode of ['story', 'social'] as const) {
        for (const pages of Object.values(t.fallbackPages[mode])) {
          for (const p of pages) expect(t.backgrounds).toContain(p.background);
        }
      }
      const text = JSON.stringify(t);
      expect(text).not.toMatch(/won't hurt|will not hurt|no pain\b(?!')/i);
    });
  }
});
