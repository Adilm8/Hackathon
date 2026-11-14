/**
 * Shared contracts of Big Day Stories (docs/SPEC.md 6.1 and 7).
 * Copied as is from the specification. Do not change without the architect.
 * Zod schemas that must stay in step with these types: ./schemas.ts
 */

/** Local calendar date 'YYYY-MM-DD'. Never a Date object or a UTC timestamp. */
export type ISODate = string;

export type EventType =
  | 'dentist' | 'school' | 'flight' | 'sibling' | 'haircut' | 'shot'
  | 'doctor' | 'blood_test' | 'hospital' | 'moving' | 'sleepover' | 'babysitter' | 'swimming' | 'party'
  | 'other';
export type Beat = 'what_happens' | 'who_is_there' | 'what_i_do' | 'if_scared' | 'rehearsal';
export type Topic =
  | 'pain' | 'separation' | 'unknown' | 'strangers' | 'sensory'
  | 'safety' | 'social' | 'body' | 'love' | 'other';
export type Mood = 'calm' | 'worried' | 'brave' | 'happy';
export type StyleMode = 'story' | 'social';
export type Animal = 'bunny' | 'bear' | 'fox' | 'kitten';
export type CharacterColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
export type Accessory = 'cap' | 'scarf' | 'backpack';
export type Pronoun = 'he' | 'she' | 'they';
export type QuestionCategory = 'on_topic' | 'off_topic' | 'sensitive' | 'unsafe';
export type QuestionSource = 'button' | 'custom' | 'voice';
export type PlanId = 'event' | 'year' | 'month';
export type Workspace = 'real' | 'sample';
export type TextSource = 'llm' | 'fallback';
/** Scene id; must exist in components/character/backgrounds registry. */
export type BackgroundId = string;

export interface Character { animal: Animal; color: CharacterColor; accessory: Accessory }

export interface ValuesProfile {
  tone: 'secular' | 'religious';
  bodyWords: 'anatomical' | 'family';
  /** Chips chosen in onboarding, e.g. ['Dad', 'Papa']. Empty = say "your grown-up". */
  family: string[];
}

export interface TechniqueMemory {
  techniqueId: string;            // template technique id or 'custom:<slug>'
  label: string;
  outcome: 'helped' | 'didnt_help';
  eventType: EventType;
  eventId: string;
  date: ISODate;
}

export interface Badge { id: string; label: string; eventType: EventType; eventId: string; earnedOn: ISODate }

export interface ChildProfile {
  id: string;
  name: string;                   // first name or nickname, one word, never a surname; never sent to an LLM
  pronunciation?: string;         // how the name is spoken, used only by speech
  age: 3 | 4 | 5 | 6 | 7 | 8;
  pronoun?: Pronoun;
  character: Character;
  values: ValuesProfile;
  styleMode: StyleMode;
  techniques: TechniqueMemory[];
  badges: Badge[];
  createdOn: ISODate;
}

export interface Sentence { text: string; kind: 'describe' | 'coach' }

export interface Page {
  id: string;
  kind: 'story' | 'answer';
  sentences: Sentence[];          // text contains the placeholder [[CHILD]]
  mood: Mood;
  background: BackgroundId;
  addresses: Topic[];             // confirmed by code, see 5.4
  questionId?: string;            // for kind 'answer'
  updatedBecause?: string;        // question id that caused the rewrite
  source: TextSource;
}

export interface Chapter {
  index: number;                  // 1-based
  date: ISODate;                  // the evening it is planned for
  beats: Beat[];
  title: string;
  parentSkill: string;
  pages: Page[];                  // empty until generated
  summary?: string;               // <= 200 chars, written by the LLM, fed to later chapters
  generatedOn?: ISODate;
  readOn?: ISODate;
}

export interface Question {
  id: string;
  chapter: number;
  afterPageId: string;
  text: string;                   // cleaned text, name replaced by [[CHILD]]
  source: QuestionSource;
  buttonId?: string;
  category: Exclude<QuestionCategory, 'unsafe'>;   // unsafe questions are never stored
  topic: Topic;
  answer?: Sentence[];
  parentPhrase?: string;
  parentAction?: 'shown' | 'edited' | 'self';      // sensitive questions only
  answeredInStory: boolean;
  askedOn: ISODate;
}

export interface PlacePhoto { key: string; caption: string }   // key into IndexedDB, caption <= 60 chars

export interface RitualCard {
  steps: [string, string, string];
  technique: { id: string; label: string; how: string };
  source: TextSource;
}

export interface Checkin {
  rating: 1 | 2 | 3;              // 1 calm, 2 a bit hard, 3 hard
  helped: string[];               // technique ids
  didntHelp: string[];
  custom?: string;                // <= 60 chars
  savedOn: ISODate;
}

export interface BigEvent {
  id: string;
  childId: string;
  type: EventType;
  customLabel?: string;           // for 'other', <= 40 chars
  date: ISODate;
  createdOn: ISODate;
  templateVersion: number;
  fears: Topic[];                 // up to 3
  customFear?: string;            // <= 40 chars
  photos: PlacePhoto[];           // up to 3
  chapters: Chapter[];
  questions: Question[];
  mustAddress: Topic[];
  usedTechniques: string[];
  place?: string;                 // last place the story was at, <= 40 chars
  ritual?: RitualCard;
  checkin?: Checkin;
}

/** What the browser sends as story context. Built by code, never by the LLM. No name inside. */
export interface StoryContext {
  event: { type: EventType; customLabel?: string; fears: Topic[]; customFear?: string; templateVersion: number };
  child: { age: number; pronoun?: Pronoun; character: Character };
  values: ValuesProfile;
  styleMode: StyleMode;
  chapter: { index: number; total: number; beats: Beat[] };
  mustAddress: Topic[];
  askedQuestions: { text: string; topic: Topic; chapter: number }[];   // last 5
  usedTechniques: string[];
  helpedBefore: string[];
  avoid: string[];
  previousSummaries: string[];    // one per earlier chapter
  placeCaptions: string[];        // captions of place photos
  place?: string;
}

/** Read-only in the browser: the server is the source of truth (10.4). */
export interface Entitlement {
  plan: PlanId;
  eventId?: string;               // for plan 'event'
  expiresAt: number;              // ms since epoch
  renews: boolean;                // true for an active subscription
}

/** The document synced between the browser and the server (6.2). */
export interface FamilyDoc {
  schemaVersion: number;
  child: ChildProfile | null;
  events: BigEvent[];
  updatedAt: number;              // ms since epoch, set by the browser on every change
}

export interface Settings {
  parentGateAcceptedOn?: ISODate;
  clockOverride?: ISODate;
  textSize: 'm' | 'l' | 'xl';
  nightMode: 'auto' | 'on' | 'off';
  /** Colour palette of the whole app (Settings > Colours). Missing = 'warm'. */
  palette?: 'warm' | 'ocean' | 'forest' | 'lavender';
  voiceQuestionConsentOn?: ISODate;
  schemaVersion: number;
}

/** Event template, content/events/*.json (docs/SPEC.md 7). */
export interface EventTemplate {
  type: EventType;
  version: number;
  label: string;                      // "Dentist visit"
  countdownLabel: string;             // "the dentist" → "3 sleeps until the dentist"
  beats: Record<Beat, {
    title: string;                    // chapter title, e.g. "What happens at the dentist"
    goals: string[];                  // 2–3 things the chapter must convey
    parentSkill: string;              // "Tonight's parent skill", one sentence
  }>;
  steps: string[];                    // 5–7 real actions in order (what actually happens)
  sensory: string[];                  // what the child will see, hear, smell, feel
  honestyNotes: string;               // e.g. "May feel a little pinch or tickle. Never promise 'no pain'."
  questionButtons: {                  // exactly 3 are shown per page
    id: string; text: string; topic: Topic;
    fallbackAnswer: string[];         // 2–3 sentences written by the team
  }[];
  techniques: { id: string; label: string; how: string; topics: Topic[] }[];
  ritual: [string, string, string];   // "first → then" steps for the day card
  phrases: Partial<Record<Topic, string[]>>;        // ready phrases for the parent, 1–3 per topic
  topicWords: Partial<Record<Topic, string[]>>;     // words that prove a page covered a topic (5.4)
  backgrounds: BackgroundId[];        // scenes the LLM may choose from
  fallbackPages: Record<StyleMode, Record<Beat, {   // 4 pages per beat and style, 36–125 words each, 260+ words per beat
    sentences: Sentence[]; mood: Mood; background: BackgroundId; addresses: Topic[];
  }[]>>;
  badge: { id: string; label: string };             // "Brave Smile"
}
