/** Edge cases of docs/reliability.md that need no server: names, dates, avoided words, empty chapters, health report. */
import { describe, expect, it } from 'vitest';
import { childNameError } from '@/lib/childName';
import { ChildNameSchema, ISODateSchema } from '@/lib/engine/schemas';
import { fallbackPages } from '@/lib/engine/fallback';
import { hasAvoidedWord, withoutAvoided } from '@/lib/engine/storyPrefs';
import { getTemplate } from '@/lib/engine/templates';
import { fallbackChapterPages } from '@/lib/llm/fallback';
import { buildHealth, type HealthInputs } from '@/lib/server/health';

describe('child name: the form and the server agree', () => {
  const both = (n: string) => ({ form: childNameError(n) === '', server: ChildNameSchema.safeParse(n).success });
  it.each([
    ["D’Andre", true], // curly apostrophe from the iPhone keyboard
    ["O'Neil", true],
    ['Anne-Marie', true],
    ['Zoë', true],
    ['José'.normalize('NFD'), true], // accent typed as a combining mark
    ['आरव', true], // Hindi: vowel signs are combining marks
    ['Мила', true],
    ['小明', true],
    ['Mary Jane', false],
    ['Max😀', false],
    ['😀', false],
    ['Al3x', false],
    ['-Max', false],
    ['A'.repeat(21), false],
  ])('%s -> %s', (name, ok) => {
    expect(both(name)).toEqual({ form: ok, server: ok });
  });
  it('stores one Unicode form, trimmed', () => {
    expect(ChildNameSchema.parse('  José'.normalize('NFD'))).toBe('José'.normalize('NFC'));
  });
});

describe('dates', () => {
  it('refuses days that do not exist', () => {
    expect(ISODateSchema.safeParse('2026-02-31').success).toBe(false);
    expect(ISODateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(ISODateSchema.safeParse('2026-00-10').success).toBe(false);
    expect(ISODateSchema.safeParse('0000-01-01').success).toBe(false);
    expect(ISODateSchema.safeParse('2026-11-15T00:00').success).toBe(false);
  });
  it('accepts real days, leap days included', () => {
    expect(ISODateSchema.safeParse('2028-02-29').success).toBe(true);
    expect(ISODateSchema.safeParse('2026-12-31').success).toBe(true);
    expect(ISODateSchema.safeParse('2027-02-29').success).toBe(false);
  });
});

describe('words to avoid', () => {
  it('do not match the [[CHILD]] and [[GROWNUP]] placeholders', () => {
    expect(hasAvoidedWord('[[CHILD]] sat with [[GROWNUP]].', ['child', 'grownup'])).toBe(false);
    expect(hasAvoidedWord('The child sat down.', ['child'])).toBe(true);
    expect(withoutAvoided([{ text: '[[CHILD]] smiled.' }], ['child'])).toHaveLength(1);
  });
  it('never leave a chapter without pages', () => {
    const t = getTemplate('dentist');
    const pages = fallbackPages(t, [], 'story', 5, 1);
    expect(pages).toHaveLength(1);
    expect(pages[0].sentences.length).toBeGreaterThan(0);
    expect(pages[0].source).toBe('fallback');
    expect(fallbackChapterPages(t, [], 'story', 5)).toHaveLength(1);
  });
  it('the last-resort page holds no event words', () => {
    const [p] = fallbackPages(getTemplate('shot'), [], 'social', 3, 2, { avoidWords: ['shot', 'needle', 'doctor'] });
    expect(p.sentences.some((s) => hasAvoidedWord(s.text, ['shot', 'needle', 'doctor']))).toBe(false);
  });
});

describe('health report', () => {
  const base: HealthInputs = {
    db: true, dbKind: 'postgres', isProd: true, llmWanted: 'openrouter', llmProvider: 'openrouter', paused: [],
    budgetLeft: true, spentToday: 0.01, budgetPerDay: 1, ttsEnabled: true, payments: 'stripe', webhookSecret: true,
    vapid: true, secretSet: true, demoMode: true,
  };
  it('is ok when everything is configured and answering', () => {
    expect(buildHealth(base).status).toBe('ok');
  });
  it('"off" features are not a degradation: templates, device voice, no push', () => {
    const r = buildHealth({ ...base, llmWanted: '', llmProvider: 'mock', ttsEnabled: false, vapid: false, payments: 'mock' });
    expect(r.status).toBe('ok');
    expect(r.checks.llm.state).toBe('off');
    expect(r.checks.voice.state).toBe('off');
    expect(r.checks.push.state).toBe('off');
  });
  it('a model asked for but missing its key is degraded', () => {
    const r = buildHealth({ ...base, llmProvider: 'mock' });
    expect(r.status).toBe('degraded');
    expect(r.checks.llm.note).toMatch(/templates/);
  });
  it('spend cap reached and circuit breaker open are degraded', () => {
    expect(buildHealth({ ...base, budgetLeft: false }).checks.llm.state).toBe('degraded');
    expect(buildHealth({ ...base, budgetLeft: false }).checks.voice.state).toBe('degraded');
    expect(buildHealth({ ...base, paused: ['openrouter:x'] }).checks.llm.state).toBe('degraded');
  });
  it('database down is the only "down"', () => {
    expect(buildHealth({ ...base, db: false }).status).toBe('down');
    expect(buildHealth({ ...base, dbKind: 'pglite' }).status).toBe('degraded');
    expect(buildHealth({ ...base, dbKind: 'pglite', isProd: false }).status).toBe('ok');
  });
  it('flags a missing session secret and webhook secret in production', () => {
    expect(buildHealth({ ...base, secretSet: false }).checks.sessions.state).toBe('degraded');
    expect(buildHealth({ ...base, webhookSecret: false }).checks.payments.state).toBe('degraded');
    expect(buildHealth({ ...base, payments: 'live_key_refused' }).checks.payments.state).toBe('degraded');
  });
});
