import { describe, expect, it } from 'vitest';
import { createEvent } from '@/lib/engine/plan';
import {
  applyGeneratedChapter, applyRewrittenPage, buildStoryContext, canAskQuestion, checkinTechniqueOptions, confirmAddresses,
  deriveMustAddress, insertAnswerPage, markChapterRead, nextStoryPage, recordQuestion, saveCheckin, setParentAction,
  skillsPractised,
} from '@/lib/engine/state';
import { fallbackChapter } from '@/lib/engine/fallback';
import { techniqueMemory } from '@/lib/engine/memory';
import { BigEventSchema, ChildProfileSchema, StoryContextSchema } from '@/lib/engine/schemas';
import { getTemplate } from '@/lib/engine/templates';
import type { BigEvent, ChildProfile } from '@/lib/engine/types';

const T = '2026-11-15';
const tpl = getTemplate('dentist');
const child: ChildProfile = {
  id: 'c1', name: 'Max', age: 4, pronoun: 'he',
  character: { animal: 'bunny', color: 'blue', accessory: 'cap' },
  values: { tone: 'secular', bodyWords: 'anatomical', family: ['Mom', 'Dad'] },
  styleMode: 'story', techniques: [], badges: [], createdOn: T,
};
const newEvent = () => createEvent({ id: 'e1', childId: 'c1', type: 'dentist', date: '2026-11-20', today: T, fears: ['pain', 'strangers'] });
const withChapter1 = () => {
  const e = newEvent();
  return applyGeneratedChapter(e, 1, { ...fallbackChapter(tpl, e.chapters[0], 'story', 4), source: 'fallback' }, tpl, T);
};
const ask = (e: BigEvent, id: string, extra: Partial<Parameters<typeof recordQuestion>[1]> = {}) => {
  const r = recordQuestion(e, { id, chapter: 1, afterPageId: 'c1-p1', text: 'Will it hurt?', source: 'button', buttonId: 'pain', category: 'on_topic', ...extra }, T, tpl);
  if (!r.ok) throw new Error(r.error);
  return r.event;
};

describe('confirmAddresses (A9)', () => {
  it('keeps only topics whose words appear', () => {
    const page = { sentences: [{ text: 'It may pinch a little.' }], addresses: ['pain', 'strangers', 'bogus', 'other'] };
    expect(confirmAddresses(page, tpl)).toEqual(['pain']);
  });
  it('matches word prefixes, case-insensitively, not inside words', () => {
    expect(confirmAddresses({ sentences: [{ text: 'HURTS a bit' }], addresses: ['pain'] }, tpl)).toEqual(['pain']);
    expect(confirmAddresses({ sentences: [{ text: 'shurt' }], addresses: ['pain'] }, tpl)).toEqual([]);
  });
});

describe('generated chapters', () => {
  it('stores pages with ids, checked backgrounds and confirmed topics', () => {
    const e = newEvent();
    const out = applyGeneratedChapter(
      e, 1,
      {
        pages: [
          { sentences: [{ text: 'The dentist says hello.', kind: 'describe' }], mood: 'calm', background: 'moon_base', addresses: ['strangers', 'pain'] },
          { sentences: [{ text: 'A tiny pinch, then done.', kind: 'describe' }], mood: 'brave', background: 'dentist', addresses: ['pain'] },
        ],
        summary: 'x'.repeat(300), usedTechniques: ['count_teeth', 'made_up'], place: 'waiting room', source: 'llm',
      },
      tpl, T,
    );
    const ch = out.chapters[0];
    expect(ch.pages.map((p) => p.id)).toEqual(['c1-p1', 'c1-p2']);
    expect(ch.pages[0].background).toBe(tpl.backgrounds[0]);
    expect(ch.pages[0].addresses).toEqual(['strangers']);
    expect(ch.summary).toHaveLength(200);
    expect(ch.generatedOn).toBe(T);
    expect(out.usedTechniques).toEqual(['count_teeth']);
    expect(out.place).toBe('waiting room');
    expect(out.mustAddress).toEqual([]);
    expect(e.chapters[0].pages).toEqual([]); // input untouched
    expect(BigEventSchema.safeParse(out).success).toBe(true);
  });

  it('a later page that covers a question marks it answered in the story', () => {
    let e = ask(withChapter1(), 'q1');
    expect(e.mustAddress).toContain('pain');
    e = applyGeneratedChapter(e, 2, { pages: [{ sentences: [{ text: 'It might pinch.', kind: 'describe' }], mood: 'calm', background: 'dentist', addresses: ['pain'] }], source: 'llm' }, tpl, T);
    expect(e.questions[0].answeredInStory).toBe(true);
    expect(e.mustAddress).not.toContain('pain');
  });
});

describe('questions (5.4)', () => {
  it('button topics come from the template, never from the model', () => {
    const e = ask(withChapter1(), 'q1', { topic: 'love' });
    expect(e.questions[0].topic).toBe('pain');
    expect(e.questions[0].buttonId).toBe('pain');
  });
  it('invalid model topic becomes other; off topic is recorded as other and not added to mustAddress', () => {
    let e = ask(withChapter1(), 'q1', { buttonId: undefined, source: 'custom', text: 'Why?', topic: 'weather' });
    expect(e.questions[0].topic).toBe('other');
    e = ask(e, 'q2', { buttonId: undefined, source: 'custom', text: 'Why is the sky blue?', topic: 'sensory', category: 'off_topic' });
    expect(e.questions[1].topic).toBe('other');
    expect(e.mustAddress).toEqual(deriveMustAddress(e));
    expect(e.mustAddress).not.toContain('sensory');
  });
  it('unsafe questions are never stored', () => {
    const e = withChapter1();
    const r = recordQuestion(e, { id: 'q', chapter: 1, afterPageId: 'c1-p1', text: 'x', source: 'custom', category: 'unsafe', topic: 'safety' }, T, tpl);
    expect(r).toEqual({ ok: false, error: 'unsafe' });
  });
  it('three questions per chapter', () => {
    let e = withChapter1();
    for (const id of ['a', 'b', 'c']) e = ask(e, id);
    expect(canAskQuestion(e, 1)).toBe(false);
    expect(canAskQuestion(e, 2)).toBe(true);
    const r = recordQuestion(e, { id: 'd', chapter: 1, afterPageId: 'c1-p1', text: 'x', source: 'custom', category: 'on_topic' }, T, tpl);
    expect(r).toEqual({ ok: false, error: 'limit' });
  });
  it('a sensitive question the parent answers personally leaves the story alone', () => {
    let e = ask(withChapter1(), 's1', { buttonId: undefined, source: 'custom', text: 'Why look at my private parts?', category: 'sensitive', topic: 'body' });
    expect(e.mustAddress).toContain('body');
    e = setParentAction(e, 's1', 'self');
    expect(e.mustAddress).not.toContain('body');
    expect(e.questions[0].parentAction).toBe('self');
  });
  it('answer page goes right after the page; the rewritten page carries the chip', () => {
    let e = ask(withChapter1(), 'q1');
    e = insertAnswerPage(e, 1, { questionId: 'q1', afterPageId: 'c1-p1', sentences: [{ text: 'A little pinch.', kind: 'describe' }], source: 'llm' }, tpl);
    const pages = e.chapters[0].pages;
    expect(pages.map((p) => p.kind)).toEqual(['story', 'answer', 'story']);
    expect(pages[1].questionId).toBe('q1');
    const next = nextStoryPage(e.chapters[0], 'c1-p1');
    expect(next?.id).toBe('c1-p2');
    e = applyRewrittenPage(e, 1, 'c1-p2', { sentences: [{ text: 'Max remembered: it may pinch, then it stops.', kind: 'describe' }], mood: 'brave', background: 'dentist', addresses: ['pain'] }, 'q1', tpl);
    const p2 = e.chapters[0].pages.find((p) => p.id === 'c1-p2');
    expect(p2?.updatedBecause).toBe('q1');
    expect(p2?.addresses).toEqual(['pain']);
    expect(e.questions[0].answeredInStory).toBe(true);
    expect(BigEventSchema.safeParse(e).success).toBe(true);
  });
});

describe('story context', () => {
  it('is valid, has no name and carries memory and summaries', () => {
    let e = ask(withChapter1(), 'q1');
    e = markChapterRead(e, 1, T);
    const kid: ChildProfile = {
      ...child,
      techniques: [
        { techniqueId: 'count_to_ten', label: 'Counting to ten', outcome: 'helped', eventType: 'haircut', eventId: 'h', date: '2026-10-25' },
        { techniqueId: 'cape_at_home', label: 'Practising the cape at home', outcome: 'didnt_help', eventType: 'haircut', eventId: 'h', date: '2026-10-25' },
        { techniqueId: 'custom:song', label: 'Singing our song', outcome: 'helped', eventType: 'haircut', eventId: 'h', date: '2026-10-25' },
      ],
    };
    const ctx = buildStoryContext({ event: e, child: kid, template: tpl, chapterIndex: 2 });
    expect(StoryContextSchema.safeParse(ctx).success).toBe(true);
    expect(JSON.stringify(ctx)).not.toContain('Max');
    expect(ctx.chapter).toEqual({ index: 2, total: 5, beats: ['who_is_there'] });
    expect(ctx.previousSummaries).toHaveLength(1);
    expect(ctx.askedQuestions).toEqual([{ text: 'Will it hurt?', topic: 'pain', chapter: 1 }]);
    expect(ctx.helpedBefore).toEqual(expect.arrayContaining(['count_to_ten', 'Singing our song']));
    expect(ctx.avoid).toEqual(['cape_at_home']);
    expect(ctx.child.pronoun).toBe('he');
    expect(ctx.mustAddress).toEqual(['pain', 'strangers']);
  });
  it('newest outcome wins', () => {
    const m = techniqueMemory({
      techniques: [
        { techniqueId: 'x', label: 'X', outcome: 'helped', eventType: 'dentist', eventId: 'a', date: '2026-10-01' },
        { techniqueId: 'x', label: 'X', outcome: 'didnt_help', eventType: 'dentist', eventId: 'b', date: '2026-11-01' },
      ],
    });
    expect(m).toEqual({ helpedBefore: [], avoid: ['x'] });
  });
});

describe('check-in (4.13, 5.7)', () => {
  it('writes memory and the badge; untouched techniques stay neutral; re-saving replaces', () => {
    const e = { ...newEvent(), usedTechniques: ['count_teeth', 'sunglasses'] };
    const opts = checkinTechniqueOptions(e, tpl);
    expect(opts.slice(0, 2).map((o) => o.id)).toEqual(['count_teeth', 'sunglasses']);
    const r = saveCheckin({ event: e, child, template: tpl, today: '2026-11-20', input: { rating: 2, helped: ['count_teeth'], didntHelp: ['sunglasses', 'count_teeth'], custom: 'Singing our song' } });
    expect(r.event.checkin).toEqual({ rating: 2, helped: ['count_teeth'], didntHelp: ['sunglasses'], custom: 'Singing our song', savedOn: '2026-11-20' });
    expect(r.child.techniques.map((t) => [t.techniqueId, t.outcome])).toEqual([
      ['count_teeth', 'helped'], ['sunglasses', 'didnt_help'], ['custom:singing-our-song', 'helped'],
    ]);
    expect(r.child.badges).toEqual([{ id: 'brave_smile', label: 'Brave Smile', eventType: 'dentist', eventId: 'e1', earnedOn: '2026-11-20' }]);
    expect(ChildProfileSchema.safeParse(r.child).success).toBe(true);
    const again = saveCheckin({ event: r.event, child: r.child, template: tpl, today: '2026-11-21', input: { rating: 1, helped: [], didntHelp: [] } });
    expect(again.child.techniques).toEqual([]);
    expect(again.child.badges).toHaveLength(1);
  });
  it('offers fear-matching template techniques when none were recorded', () => {
    const opts = checkinTechniqueOptions(newEvent(), tpl);
    expect(opts.length).toBeGreaterThanOrEqual(3);
    expect(opts.length).toBeLessThanOrEqual(6);
  });
  it('skills practised are the parent skills of read chapters', () => {
    let e = withChapter1();
    expect(skillsPractised(e)).toEqual([]);
    e = markChapterRead(e, 1, T);
    expect(skillsPractised(e)).toEqual([tpl.beats.what_happens.parentSkill]);
    expect(markChapterRead(e, 1, '2026-11-16').chapters[0].readOn).toBe(T);
  });
});
