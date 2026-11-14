/**
 * Story scenarios of the model evaluation (docs/SPEC.md 8.8 step 1): 6 events × ages 4 and 7,
 * plus four special cases (two dads, religious tone, family words for the body, social story style).
 */
import type { EventType, StoryContext } from '../lib/engine/types';

const EVENTS: { type: EventType; fears: StoryContext['event']['fears'] }[] = [
  { type: 'dentist', fears: ['pain', 'strangers'] },
  { type: 'school', fears: ['separation', 'social'] },
  { type: 'flight', fears: ['sensory', 'safety'] },
  { type: 'sibling', fears: ['love', 'unknown'] },
  { type: 'haircut', fears: ['sensory', 'body'] },
  { type: 'shot', fears: ['pain', 'unknown'] },
];

export interface Scenario {
  id: string;
  ctx: StoryContext;
}

function ctx(type: EventType, fears: StoryContext['event']['fears'], age: number, over: Partial<StoryContext> = {}): StoryContext {
  return {
    event: { type, fears, templateVersion: 1 },
    child: { age, pronoun: age === 4 ? 'he' : 'she', character: { animal: age === 4 ? 'bunny' : 'fox', color: age === 4 ? 'blue' : 'green', accessory: age === 4 ? 'cap' : 'scarf' } },
    values: { tone: 'secular', bodyWords: 'anatomical', family: ['Mom', 'Dad'] },
    styleMode: 'story',
    chapter: { index: 1, total: 3, beats: ['what_happens', 'who_is_there'] },
    mustAddress: [...fears],
    askedQuestions: [],
    usedTechniques: [],
    helpedBefore: [],
    avoid: [],
    previousSummaries: [],
    placeCaptions: [],
    ...over,
  };
}

export const SCENARIOS: Scenario[] = [
  ...EVENTS.flatMap((e) => [
    { id: `${e.type}-4`, ctx: ctx(e.type, e.fears, 4) },
    { id: `${e.type}-7`, ctx: ctx(e.type, e.fears, 7) },
  ]),
  { id: 'two-dads', ctx: ctx('school', ['separation'], 5, { values: { tone: 'secular', bodyWords: 'anatomical', family: ['Daddy', 'Papa'] } }) },
  { id: 'religious', ctx: ctx('sibling', ['love'], 6, { values: { tone: 'religious', bodyWords: 'family', family: ['Mom'] } }) },
  { id: 'family-body-words', ctx: ctx('shot', ['body', 'pain'], 5, { values: { tone: 'secular', bodyWords: 'family', family: ['Mom', 'Grandma'] } }) },
  { id: 'social-story', ctx: ctx('dentist', ['sensory', 'unknown'], 6, { styleMode: 'social' }) },
];
