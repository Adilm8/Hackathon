import { describe, expect, it } from 'vitest';
import { ALL_BACKGROUND_IDS, EVENT_TYPES, getTemplate } from '@/lib/engine/templates';
import { EventTemplateSchema } from '@/lib/engine/schemas';
import { containsAnyWord, countWords, sentencesToText } from '@/lib/engine/text';
import { BACKGROUND_IDS, backgroundForEvent } from '@/components/character/backgrounds';
import { EVENT_ICON, EVENT_LABEL } from '@/components/icons/Icon';
import { BADGE_LABEL } from '@/components/badges/BadgeArt';
import { LUCIDE } from '@/components/icons/lucide-data';
import { EventTypeEnum } from '@/lib/engine/schemas';
import type { Beat, StyleMode } from '@/lib/engine/types';

const BEATS: Beat[] = ['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal'];
const STYLES: StyleMode[] = ['story', 'social'];
// docs/SPEC.md 8.6 level 4: never in any text the child hears.
const STOP = [
  /won'?t hurt/i, /will not hurt/i, /nothing bad will happen/i, /\bi promise\b/i, /our secret/i,
  /don'?t tell/i, /i'?m real/i, /i am alive/i, /\d+\s?(mg|ml)\b/i, /\bpills?\b/i, /https?:/i,
  /doesn'?t hurt/i, /no pain/i,
];
const PLACEHOLDER = /\[\[([A-Z]+)\]\]/g;

function childTexts(t: ReturnType<typeof getTemplate>): string[] {
  const out: string[] = [];
  for (const s of STYLES) for (const b of BEATS) for (const p of t.fallbackPages[s][b]) out.push(sentencesToText(p.sentences));
  for (const q of t.questionButtons) out.push(q.text, ...q.fallbackAnswer);
  out.push(...t.ritual);
  return out;
}

it('template scenes are exactly the scenes of the background registry', () => {
  expect([...ALL_BACKGROUND_IDS].sort()).toEqual([...BACKGROUND_IDS].sort());
});

it('every event type of the contract has a template, an icon, a scene and a badge', () => {
  expect([...EVENT_TYPES].sort()).toEqual([...EventTypeEnum.options].sort());
  expect(EVENT_TYPES[EVENT_TYPES.length - 1]).toBe('other');
  for (const type of EVENT_TYPES) {
    expect(LUCIDE[EVENT_ICON[type]], type).toBeTruthy();
    expect(EVENT_LABEL[type], type).toBeTruthy();
    expect(BADGE_LABEL[type], type).toBeTruthy();
    expect(BACKGROUND_IDS, type).toContain(backgroundForEvent(type));
  }
});

describe.each(EVENT_TYPES)('template %s', (type) => {
  const t = getTemplate(type);

  it('is detailed: steps, sensory details, eight or more questions and techniques', () => {
    expect(t.steps.length).toBeGreaterThanOrEqual(6);
    expect(t.sensory.length).toBeGreaterThanOrEqual(5);
    expect(t.questionButtons.length).toBeGreaterThanOrEqual(8);
    expect(t.techniques.length).toBeGreaterThanOrEqual(8);
    expect(t.honestyNotes.length).toBeGreaterThan(40);
    for (const b of Object.values(t.beats)) expect(b.parentSkill.length).toBeGreaterThan(20);
  });

  it('badge, labels and ritual are filled in', () => {
    expect(t.badge.label).toBeTruthy();
    expect(t.countdownLabel.startsWith('the ') || t.countdownLabel === 'moving day').toBe(true);
    for (const r of t.ritual) expect(r.length).toBeGreaterThan(5);
  });

  it('matches the schema and its file name', () => {
    expect(EventTemplateSchema.safeParse(t).success).toBe(true);
    expect(t.type).toBe(type);
  });

  it('has unique ids and enough buttons and techniques', () => {
    const ids = t.questionButtons.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    const tech = t.techniques.map((x) => x.id);
    expect(new Set(tech).size).toBe(tech.length);
    expect(tech.length).toBeGreaterThanOrEqual(3);
  });

  it('uses only known scenes', () => {
    for (const b of t.backgrounds) expect(ALL_BACKGROUND_IDS).toContain(b);
    for (const s of STYLES)
      for (const b of BEATS) for (const p of t.fallbackPages[s][b]) expect(t.backgrounds).toContain(p.background);
  });

  it('has four fallback pages per beat and style, about 2-3 minutes read aloud together', () => {
    for (const s of STYLES)
      for (const b of BEATS) {
        const pages = t.fallbackPages[s][b];
        expect(pages.length, `${s}/${b}`).toBe(4);
        let total = 0;
        for (const p of pages) {
          const n = countWords(sentencesToText(p.sentences));
          total += n;
          expect(n, `${s}/${b}: ${sentencesToText(p.sentences)}`).toBeGreaterThanOrEqual(36);
          expect(n, `${s}/${b}: ${sentencesToText(p.sentences)}`).toBeLessThanOrEqual(125);
        }
        expect(total, `${s}/${b} words`).toBeGreaterThanOrEqual(260);
        expect(total, `${s}/${b} words`).toBeLessThanOrEqual(450);
      }
  });

  it('every claimed topic is proved by its word list (A9)', () => {
    for (const s of STYLES)
      for (const b of BEATS)
        for (const p of t.fallbackPages[s][b]) {
          expect(p.addresses.length, `${s}/${b}`).toBeGreaterThan(0);
          for (const topic of p.addresses) {
            const words = t.topicWords[topic] ?? [];
            expect(containsAnyWord(sentencesToText(p.sentences), words), `${s}/${b} ${topic}`).toBe(true);
          }
        }
  });

  it('social pages keep at least two describing sentences per coaching one (FR-B3)', () => {
    for (const b of BEATS) {
      const all = t.fallbackPages.social[b].flatMap((p) => p.sentences);
      const d = all.filter((x) => x.kind === 'describe').length;
      const c = all.filter((x) => x.kind === 'coach').length;
      expect(d, b).toBeGreaterThanOrEqual(2 * c);
    }
  });

  it('social pages are in the first person', () => {
    for (const b of BEATS)
      for (const p of t.fallbackPages.social[b]) expect(/\b(I|my|me)\b/.test(sentencesToText(p.sentences)), b).toBe(true);
  });

  it('is honest and uses only the two placeholders', () => {
    for (const text of childTexts(t)) {
      for (const re of STOP) expect(re.test(text), `${re} in: ${text}`).toBe(false);
      for (const m of text.matchAll(PLACEHOLDER)) expect(['CHILD', 'GROWNUP']).toContain(m[1]);
    }
    for (const list of Object.values(t.phrases)) for (const p of list ?? []) for (const re of STOP) expect(re.test(p), p).toBe(false);
  });

  it('phrases cover the topics of its buttons and techniques', () => {
    for (const q of t.questionButtons) {
      if (q.topic === 'other') continue;
      expect(t.phrases[q.topic]?.length, `${q.id} -> ${q.topic}`).toBeGreaterThan(0);
      expect(t.topicWords[q.topic]?.length, `${q.id} -> ${q.topic}`).toBeGreaterThan(0);
    }
  });

  it('every fear topic of onboarding has words and phrases', () => {
    for (const topic of ['pain', 'separation', 'unknown', 'strangers', 'sensory', 'safety', 'social', 'body'] as const) {
      expect(t.topicWords[topic]?.length, topic).toBeGreaterThan(0);
      expect(t.phrases[topic]?.length, topic).toBeGreaterThan(0);
      expect(t.techniques.some((x) => x.topics.includes(topic)), `technique for ${topic}`).toBe(true);
    }
  });
});
