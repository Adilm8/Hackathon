import { describe, expect, it } from 'vitest';
import { accessSummary, canOpenChapterByAccess, featureNeedsAccess, hasEventAccess, isUpgradeEligible } from '@/lib/engine/access';
import { suggestNext } from '@/lib/engine/suggestions';
import { fallbackAnswer, fallbackChapter, fallbackPages, fallbackRitual, FALLBACK_COPY, questionButtonsForPage } from '@/lib/engine/fallback';
import { summarise, topTopics, FEAR_OPTIONS } from '@/lib/engine/topics';
import { memoryLines, pickDayTechnique } from '@/lib/engine/memory';
import { createEvent } from '@/lib/engine/plan';
import { recordQuestion, setParentAction } from '@/lib/engine/state';
import { renderText, grownupWord, updatedChipText, countWords, slugify } from '@/lib/engine/text';
import { ChapterOut, RitualCardSchema } from '@/lib/engine/schemas';
import { EVENT_TYPES, getTemplate, eventLabel, TEMPLATES } from '@/lib/engine/templates';
import type { Entitlement, TechniqueMemory } from '@/lib/engine/types';

const T = '2026-11-15';
const NOW = Date.UTC(2026, 10, 15);
const DAY = 86_400_000;

describe('access (5.6)', () => {
  const ev: Entitlement = { plan: 'event', eventId: 'e1', expiresAt: NOW + DAY, renews: false };
  const year: Entitlement = { plan: 'year', expiresAt: NOW + 300 * DAY, renews: true };
  it('event plan covers its event only; subscriptions cover every event; expiry ends it', () => {
    expect(hasEventAccess([ev], 'e1', NOW)).toBe(true);
    expect(hasEventAccess([ev], 'e2', NOW)).toBe(false);
    expect(hasEventAccess([year], 'e2', NOW)).toBe(true);
    expect(hasEventAccess([{ ...year, plan: 'month' }], 'e2', NOW)).toBe(true);
    expect(hasEventAccess([ev], 'e1', NOW + 2 * DAY)).toBe(false);
    expect(hasEventAccess([], 'e1', NOW)).toBe(false);
  });
  it('gates chapters 2+ and the ritual only', () => {
    expect(canOpenChapterByAccess(1, false)).toBe(true);
    expect(canOpenChapterByAccess(2, false)).toBe(false);
    expect(featureNeedsAccess('ritual')).toBe(true);
    expect(featureNeedsAccess('chapter', 1)).toBe(false);
  });
  it('summary and upgrade offer', () => {
    expect(accessSummary([ev, year], NOW).plan).toBe('year');
    expect(accessSummary([ev], NOW)).toEqual({ plan: 'event', renews: false, expiresAt: NOW + DAY, eventIds: ['e1'] });
    expect(accessSummary([], NOW).plan).toBeNull();
    expect(isUpgradeEligible([ev], NOW)).toBe(true);
    expect(isUpgradeEligible([ev, year], NOW)).toBe(false);
  });
});

describe('suggestions (5.9)', () => {
  it('by age, minus recent types, three shown', () => {
    expect(suggestNext({ age: 4 }, [], T)).toEqual(['haircut', 'shot', 'dentist']);
    expect(suggestNext({ age: 4 }, [{ type: 'haircut', date: '2026-10-25' }, { type: 'dentist', date: '2026-11-20' }], T)).toEqual(['shot', 'school', 'flight']);
    expect(suggestNext({ age: 4 }, [{ type: 'haircut', date: '2026-01-01' }], T)).toEqual(['haircut', 'shot', 'dentist']);
    expect(suggestNext({ age: 6 }, [], T)).toEqual(['school', 'dentist', 'flight']);
    expect(suggestNext({ age: 8 }, [], T)).toEqual(['dentist', 'flight', 'shot']);
  });
});

describe('fallbacks', () => {
  it('every template gives a complete chapter for every plan shape', () => {
    for (const type of EVENT_TYPES) {
      const t = getTemplate(type);
      for (const days of [1, 2, 3, 4, 5]) {
        const e = createEvent({ id: 'e', childId: 'c', type, date: `2026-11-${15 + days}`, today: T, fears: [] });
        for (const c of e.chapters)
          for (const style of ['story', 'social'] as const) {
            const fb = fallbackChapter(t, c, style, 4);
            expect(fb.pages.length, `${type} ${days} ${c.index}`).toBeGreaterThanOrEqual(2);
            expect(fb.pages.length).toBeLessThanOrEqual(5);
            expect(fb.pages.every((p) => p.source === 'fallback' && p.kind === 'story')).toBe(true);
            expect(fb.summary.length).toBeLessThanOrEqual(200);
            if (fb.pages.length >= 3) expect(ChapterOut.safeParse({ ...fb, place: 'home' }).success).toBe(true);
          }
      }
    }
  });
  it('quick prep takes the first page of each beat', () => {
    const t = getTemplate('dentist');
    const pages = fallbackPages(t, ['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal'], 'story', 4, 1);
    expect(pages).toHaveLength(5);
    expect(pages[1].sentences).toEqual(t.fallbackPages.story.who_is_there[0].sentences);
  });
  it('answers: template answer for a button, the shared line otherwise', () => {
    const t = getTemplate('dentist');
    expect(fallbackAnswer(t, 'pain').map((s) => s.text)).toEqual(t.questionButtons[0].fallbackAnswer);
    expect(fallbackAnswer(t)).toEqual([{ text: FALLBACK_COPY.ownQuestion, kind: 'coach' }]);
    expect(questionButtonsForPage(t, 1).map((b) => b.id)).toEqual(['pain', 'mom_near', 'tools']);
    expect(questionButtonsForPage(t, 2)).toHaveLength(3);
  });
  it('ritual prefers what helped last time and never what did not', () => {
    const t = getTemplate('dentist');
    const helped: TechniqueMemory = { techniqueId: 'count_to_ten', label: 'Counting to ten', outcome: 'helped', eventType: 'haircut', eventId: 'h', date: '2026-10-25' };
    const card = fallbackRitual(t, { id: 'e', questions: [], fears: ['pain'] }, { techniques: [helped] });
    expect(RitualCardSchema.safeParse(card).success).toBe(true);
    expect(card.steps).toEqual(t.ritual);
    expect(card.technique.id).toBe('count_to_ten');
    const avoid = pickDayTechnique(t, { techniques: [{ ...helped, techniqueId: 'sunglasses', outcome: 'didnt_help' }] }, ['sensory']);
    expect(avoid.id).not.toBe('sunglasses');
    expect(avoid.reason).toBe('top_topic');
  });
});

describe('parent panel (5.5)', () => {
  const t = getTemplate('dentist');
  const base = createEvent({ id: 'e1', childId: 'c1', type: 'dentist', date: '2026-11-20', today: T, fears: ['pain', 'strangers'] });
  const add = (e: typeof base, id: string, extra: object) => {
    const r = recordQuestion(e, { id, chapter: 1, afterPageId: 'c1-p1', text: 'q', source: 'custom', category: 'on_topic', ...extra }, T, t);
    if (!r.ok) throw new Error();
    return r.event;
  };
  it('counts topics, excludes off topic, lists self-answered, gives phrases and the day technique', () => {
    let e = add(base, 'a', { buttonId: 'pain', source: 'button', text: 'Will it hurt?', parentPhrase: 'It may pinch, then stop.' });
    e = add(e, 'b', { text: 'Does the drill hurt?', topic: 'pain' });
    e = add(e, 'c', { text: 'Why is the sky blue?', topic: 'sensory', category: 'off_topic' });
    const r2 = recordQuestion(e, { id: 'd', chapter: 2, afterPageId: 'c2-p1', text: 'Where do babies come from?', source: 'custom', category: 'sensitive', topic: 'body' }, T, t);
    if (!r2.ok) throw new Error();
    e = setParentAction(r2.event, 'd', 'self');
    const s = summarise(e, { techniques: [] }, t, T);
    expect(s.rows.map((r) => [r.topic, r.count])).toEqual([['pain', 2], ['body', 1]]);
    expect(s.rows[0].label).toBe('Pain');
    expect(s.rows[0].phrases[0]).toBe('It may pinch, then stop.');
    expect(s.rows[0].phrases).toHaveLength(2);
    expect(s.selfAnswered.map((q) => q.id)).toEqual(['d']);
    expect(s.totalQuestions).toBe(3);
    expect(s.empty).toBe(false);
    expect(s.dayTechnique.reason).toBe('top_topic');
    expect(t.techniques.find((x) => x.id === s.dayTechnique.id)?.topics).toContain('pain');
    expect(s.parentSkill).toBe(t.beats.what_happens.parentSkill);
    expect(topTopics(e)).toEqual(['pain', 'body', 'strangers']);
  });
  it('empty state and memory line', () => {
    const mem: TechniqueMemory = { techniqueId: 'count_to_ten', label: 'Counting to ten', outcome: 'helped', eventType: 'haircut', eventId: 'h', date: '2026-10-25' };
    const s = summarise(base, { techniques: [mem] }, t, T);
    expect(s.empty).toBe(true);
    expect(s.memoryLines).toEqual(['Last time: counting to ten helped (haircut, Oct 25)']);
    expect(s.dayTechnique).toMatchObject({ id: 'count_to_ten', reason: 'helped_before' });
    expect(memoryLines({ techniques: [{ ...mem, outcome: 'didnt_help' }] })).toEqual(["Last time: counting to ten didn't help (haircut, Oct 25)"]);
  });
  it('fear list maps to topics', () => {
    expect(FEAR_OPTIONS).toHaveLength(8);
    expect(FEAR_OPTIONS.find((f) => f.label === 'It might hurt')?.topic).toBe('pain');
  });
});

describe('text helpers', () => {
  const kid = { name: 'Max', values: { family: ['Mom', 'Dad'] } };
  it('fills placeholders and capitalises the grown-up word at sentence start', () => {
    expect(renderText('[[CHILD]] holds [[GROWNUP]]\'s hand.', kid)).toBe("Max holds Mom's hand.");
    const none = { name: 'Lily', values: { family: [] } };
    expect(renderText('[[GROWNUP]] stays. Then [[GROWNUP]] waves.', none)).toBe('Your grown-up stays. Then your grown-up waves.');
    expect(renderText('[[CHILD]] waves.', { ...kid }, { speak: true, pronunciation: 'Maks' })).toBe('Maks waves.');
    expect(grownupWord({ family: [] })).toBe('your grown-up');
  });
  it('chip, words, slug', () => {
    expect(updatedChipText({ text: 'Will it hurt?' }, 'Max')).toBe("Updated because Max asked: 'Will it hurt?'");
    expect(countWords(' a  b [[CHILD]] ')).toBe(3);
    expect(slugify('Singing our song!')).toBe('singing-our-song');
  });
  it('labels', () => {
    expect(eventLabel({ type: 'other', customLabel: 'Swim class' })).toBe('Swim class');
    expect(eventLabel({ type: 'dentist' })).toBe('Dentist visit');
    expect(Object.keys(TEMPLATES)).toHaveLength(7);
    expect(TEMPLATES.flight.type).toBe('flight');
  });
});
