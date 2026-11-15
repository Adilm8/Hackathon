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
/** Story friend species (SPEC 6, 11.4). The first four are the original ids and stay valid. */
export type Animal =
  | 'bunny' | 'bear' | 'fox' | 'kitten' | 'dragon' | 'owl' | 'hedgehog' | 'fawn'
  | 'wolf' | 'lion' | 'tiger' | 'dino' | 'panda' | 'monkey' | 'rhino' | 'yeti';
/** Outfit colour. teal and pink were added with Story friend 2.0. */
export type CharacterColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'teal' | 'pink';
/**
 * Accessory worn on the body or held in the paw. 'cap' is the legacy value from before
 * Story friend 2.0: it now means headwear 'cap' (see resolveCharacter in ./character.ts).
 */
export type Accessory =
  | 'none' | 'cap' | 'scarf' | 'backpack' | 'cape' | 'satchel' | 'star-necklace' | 'star-wand' | 'lantern' | 'plush-star';
export type Outfit =
  | 'tunic' | 'raincoat' | 'star-robe' | 'knight-tabard' | 'overalls' | 'moon-pajamas' | 'explorer-vest' | 'knit-sweater';
export type Headwear =
  | 'none' | 'cap' | 'wizard-hat' | 'flower-crown' | 'star-crown' | 'beret' | 'acorn-cap' | 'bow-headband' | 'goggles';
export type Companion =
  | 'none' | 'firefly' | 'cloud-puff' | 'star-sprite' | 'crystal-snail' | 'ladybug' | 'tiny-turtle' | 'mushroom-sprout' | 'pebble-chick';
export type FurVariant = 'classic' | 'dusk' | 'dawn';
/** How big the Story friend stands over the reader's scene. */
export type CharacterSize = 's' | 'm' | 'l';
export type Pronoun = 'he' | 'she' | 'they';
export type QuestionCategory = 'on_topic' | 'off_topic' | 'sensitive' | 'unsafe';
export type QuestionSource = 'button' | 'custom' | 'voice';
export type PlanId = 'event' | 'year' | 'month';
export type Workspace = 'real' | 'sample';
export type TextSource = 'llm' | 'fallback';
/** Story options a parent may set per event (docs/story-customization.md). */
export type StoryLength = 'short' | 'standard' | 'long';
/** Story genre the parent picks right after the event type. */
export type StoryGenre = 'bedtime' | 'funny' | 'discover' | 'values' | 'fairy_tale' | 'hero' | 'mindful';
export type Experience = 'first' | 'went_fine' | 'was_hard';
export type ComfortKind = 'teddy' | 'blanket' | 'toy' | 'book';
export type Interest =
  | 'dinosaurs' | 'space' | 'trains' | 'animals' | 'castles' | 'cars'
  | 'ocean' | 'music' | 'sports' | 'drawing' | 'bugs' | 'building';
/** Scene id; must exist in components/character/backgrounds registry. */
export type BackgroundId = string;

/**
 * The child's Story friend. animal, color and accessory are the original fields; the rest were
 * added with Story friend 2.0 and are optional, so profiles saved before keep working
 * (defaults: tunic, no headwear unless accessory is the legacy 'cap', no companion, classic fur).
 */
export interface Character {
  animal: Animal;
  color: CharacterColor;
  accessory: Accessory;
  outfit?: Outfit;
  headwear?: Headwear;
  companion?: Companion;
  fur?: FurVariant;
  /** Size over the reader's scene, default 'm'. */
  size?: CharacterSize;
}

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

/** Child's age in years. Widened from 3-8 to 2-12 on 15 Nov 2026. */
export type ChildAge = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface ChildProfile {
  id: string;
  name: string;                   // first name or nickname, one word, never a surname; never sent to an LLM
  pronunciation?: string;         // how the name is spoken, used only by speech
  age: ChildAge;
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

/**
 * Parent's story options for one event. All optional: a missing field keeps the default behaviour.
 * Free text (moments, nickname, after, avoid words) is cleaned in the browser and always goes into
 * <data> blocks in prompts.
 */
export interface StoryPrefs {
  length?: StoryLength;                 // missing = 'standard'
  /** Wanted number of evenings, 1-5; never more than the days left. Missing = by days left. */
  chapters?: number;
  /** Template steps (exact text) that will not happen for this child. */
  skipSteps?: string[];
  /** Up to 2 own moments, <= 60 chars each. */
  moments?: string[];
  /** Who comes along on the day: family words from the values profile, up to 2. */
  companions?: string[];
  comfort?: { kind: ComfortKind; nickname?: string };   // nickname <= 24 chars
  interests?: Interest[];               // up to 3
  genre?: StoryGenre;                   // missing = 'bedtime'
  experience?: Experience;
  /** Something nice after the big day, <= 60 chars. */
  after?: string;
  /** Up to 3 words the story must not use, <= 24 chars each. */
  avoidWords?: string[];
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
  story?: StoryPrefs;
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
  /** Parent's story options without the plan-only field `chapters`. */
  story?: Omit<StoryPrefs, 'chapters'>;
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
  /** How voice questions are recognised: on the device, or by the browser's speech service (lib/speech/listener.ts). */
  voiceQuestionMode?: 'device' | 'browser';
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
  /** One extra story-style page per beat for ages 9-12: the "how and why" behind each step. */
  olderPages?: Record<Beat, { sentences: Sentence[]; mood: Mood; background: BackgroundId; addresses: Topic[] }>;
  badge: { id: string; label: string };             // "Brave Smile"
}
