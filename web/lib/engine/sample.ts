/**
 * The jury's sample family (docs/SPEC.md 4.3, K2): Max, 4, a bunny in a blue cap; Mom and
 * Dad; secular. One past haircut three weeks ago with a saved check-in ("a bit hard";
 * counting to ten helped, the cape did not; one badge) and an upcoming dentist visit in
 * five days with the fears pain and strangers, so chapter 1 is tonight. Every date is
 * computed from `today`, and the seed goes through the same engine functions as a real
 * family.
 */
import { addDays } from './clock';
import { fallbackAnswer, fallbackChapter, fallbackRitual } from './fallback';
import { createEvent } from './plan';
import { FAMILY_DOC_SCHEMA_VERSION } from './schemas';
import { applyGeneratedChapter, markChapterRead, recordQuestion, saveCheckin, setQuestionAnswer, setRitual } from './state';
import { getTemplate } from './templates';
import type { BigEvent, ChildProfile, FamilyDoc, ISODate } from './types';

export const SAMPLE_IDS = {
  child: 'sample-max',
  pastEvent: 'sample-haircut',
  upcomingEvent: 'sample-dentist',
} as const;

export const SAMPLE_CHILD_NAME = 'Max';

export function buildSampleChild(today: ISODate): ChildProfile {
  return {
    id: SAMPLE_IDS.child,
    name: SAMPLE_CHILD_NAME,
    age: 4,
    pronoun: 'he',
    character: { animal: 'bunny', color: 'blue', accessory: 'cap' },
    values: { tone: 'secular', bodyWords: 'anatomical', family: ['Mom', 'Dad'] },
    styleMode: 'story',
    techniques: [],
    badges: [],
    createdOn: addDays(today, -26),
  };
}

function buildPastHaircut(child: ChildProfile, today: ISODate): { event: BigEvent; child: ChildProfile } {
  const template = getTemplate('haircut');
  const createdOn = addDays(today, -26);
  let event = createEvent(
    { id: SAMPLE_IDS.pastEvent, childId: child.id, type: 'haircut', date: addDays(today, -21), today: createdOn, fears: ['pain', 'sensory'] },
    template,
  );
  for (const c of event.chapters) {
    const fb = fallbackChapter(template, c, child.styleMode, child.age);
    event = applyGeneratedChapter(event, c.index, { ...fb, source: 'fallback' }, template, c.date);
    if (c.index === 1) {
      const res = recordQuestion(
        event,
        { id: 'sample-q-haircut-1', chapter: 1, afterPageId: 'c1-p1', text: 'Does it hurt?', source: 'button', buttonId: 'hurt', category: 'on_topic' },
        c.date,
        template,
      );
      if (res.ok) event = setQuestionAnswer(res.event, res.question.id, fallbackAnswer(template, 'hurt'), template.phrases.pain?.[0]);
    }
    event = markChapterRead(event, c.index, c.date);
  }
  event = { ...event, usedTechniques: ['count_to_ten', 'cape_at_home'] };
  event = setRitual(event, fallbackRitual(template, event, child));
  const saved = saveCheckin({
    event,
    child,
    template,
    today: addDays(today, -21),
    input: { rating: 2, helped: ['count_to_ten'], didntHelp: ['cape_at_home'] },
  });
  return { event: saved.event, child: saved.child };
}

/** The whole sample document. `nowMs` sets updatedAt. */
export function buildSampleFamily(today: ISODate, opts: { nowMs?: number } = {}): FamilyDoc {
  const past = buildPastHaircut(buildSampleChild(today), today);
  const dentist = createEvent(
    {
      id: SAMPLE_IDS.upcomingEvent,
      childId: past.child.id,
      type: 'dentist',
      date: addDays(today, 5),
      today,
      fears: ['pain', 'strangers'],
    },
    getTemplate('dentist'),
  );
  return {
    schemaVersion: FAMILY_DOC_SCHEMA_VERSION,
    child: past.child,
    events: [past.event, dentist],
    updatedAt: opts.nowMs ?? Date.now(),
  };
}
