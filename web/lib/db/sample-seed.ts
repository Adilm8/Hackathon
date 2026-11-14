/**
 * The jury's sample family (docs/SPEC.md 4.3): Max, 4, bunny in a blue cap; one past haircut with a
 * saved check-in and a badge, one upcoming dentist visit five days ahead. Dates derive from `today`.
 * Chapters are created empty-paged; the engine and AI streams fill pages through the normal pipeline.
 */
import { addDays } from '../engine/clock';
import { FAMILY_DOC_SCHEMA_VERSION } from '../engine/schemas';
import type { BigEvent, Beat, FamilyDoc, ISODate } from '../engine/types';

const BEATS: Beat[] = ['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal'];
const TITLES = [
  'What happens at the dentist',
  'Who is there',
  'What I do',
  'If I feel scared',
  'Practice time',
];

export function buildSampleDoc(today: ISODate): FamilyDoc {
  const childId = 'sample-child';
  const pastDate = addDays(today, -21);
  const past: BigEvent = {
    id: 'sample-haircut',
    childId,
    type: 'haircut',
    date: pastDate,
    createdOn: addDays(pastDate, -5),
    templateVersion: 1,
    fears: ['sensory'],
    photos: [],
    chapters: [],
    questions: [],
    mustAddress: ['sensory'],
    usedTechniques: ['count-to-ten', 'cape'],
    checkin: {
      rating: 2,
      helped: ['count-to-ten'],
      didntHelp: ['cape'],
      savedOn: pastDate,
    },
  };
  const eventDate = addDays(today, 5);
  const upcoming: BigEvent = {
    id: 'sample-dentist',
    childId,
    type: 'dentist',
    date: eventDate,
    createdOn: today,
    templateVersion: 1,
    fears: ['pain', 'strangers'],
    photos: [],
    chapters: BEATS.map((beat, i) => ({
      index: i + 1,
      date: addDays(today, i),
      beats: [beat],
      title: TITLES[i],
      parentSkill: '',
      pages: [],
    })),
    questions: [],
    mustAddress: ['pain', 'strangers'],
    usedTechniques: [],
  };
  return {
    schemaVersion: FAMILY_DOC_SCHEMA_VERSION,
    child: {
      id: childId,
      name: 'Max',
      age: 4,
      pronoun: 'he',
      character: { animal: 'bunny', color: 'blue', accessory: 'cap' },
      values: { tone: 'secular', bodyWords: 'anatomical', family: ['Mom', 'Dad'] },
      styleMode: 'story',
      techniques: [
        { techniqueId: 'count-to-ten', label: 'Counting to ten', outcome: 'helped', eventType: 'haircut', eventId: past.id, date: pastDate },
        { techniqueId: 'cape', label: 'The cape', outcome: 'didnt_help', eventType: 'haircut', eventId: past.id, date: pastDate },
      ],
      badges: [{ id: 'brave-haircut', label: 'Brave Haircut', eventType: 'haircut', eventId: past.id, earnedOn: pastDate }],
      createdOn: addDays(pastDate, -5),
    },
    events: [past, upcoming],
    updatedAt: Date.now(),
  };
}
