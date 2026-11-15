/**
 * Zod schemas for everything that crosses the network or comes from a file
 * (docs/SPEC.md 6.1, 7, 8.5, 9). They must stay in step with ./types.ts:
 * the `satisfies`-style checks at the bottom fail the type check when they drift.
 */
import { z } from 'zod';
import type * as T from './types';

// ---------- enums ----------
export const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export const EventTypeEnum = z.enum([
  'dentist', 'school', 'flight', 'sibling', 'haircut', 'shot',
  'doctor', 'blood_test', 'hospital', 'moving', 'sleepover', 'babysitter', 'swimming', 'party',
  'other',
]);
export const BeatEnum = z.enum(['what_happens', 'who_is_there', 'what_i_do', 'if_scared', 'rehearsal']);
export const TopicEnum = z.enum([
  'pain', 'separation', 'unknown', 'strangers', 'sensory',
  'safety', 'social', 'body', 'love', 'other',
]);
export const MoodEnum = z.enum(['calm', 'worried', 'brave', 'happy']);
export const StyleModeEnum = z.enum(['story', 'social']);
export const AnimalEnum = z.enum([
  'bunny', 'bear', 'fox', 'kitten', 'dragon', 'owl', 'hedgehog', 'fawn',
  'wolf', 'lion', 'tiger', 'dino', 'panda', 'monkey', 'rhino', 'yeti',
]);
export const CharacterColorEnum = z.enum(['blue', 'green', 'yellow', 'red', 'purple', 'orange', 'teal', 'pink']);
export const AccessoryEnum = z.enum([
  'none', 'cap', 'scarf', 'backpack', 'cape', 'satchel', 'star-necklace', 'star-wand', 'lantern', 'plush-star',
]);
export const OutfitEnum = z.enum([
  'tunic', 'raincoat', 'star-robe', 'knight-tabard', 'overalls', 'moon-pajamas', 'explorer-vest', 'knit-sweater',
]);
export const HeadwearEnum = z.enum([
  'none', 'cap', 'wizard-hat', 'flower-crown', 'star-crown', 'beret', 'acorn-cap', 'bow-headband', 'goggles',
]);
export const CompanionEnum = z.enum([
  'none', 'firefly', 'cloud-puff', 'star-sprite', 'crystal-snail', 'ladybug', 'tiny-turtle', 'mushroom-sprout', 'pebble-chick',
]);
export const FurVariantEnum = z.enum(['classic', 'dusk', 'dawn']);
export const PronounEnum = z.enum(['he', 'she', 'they']);
export const QuestionCategoryEnum = z.enum(['on_topic', 'off_topic', 'sensitive', 'unsafe']);
export const StoredQuestionCategoryEnum = z.enum(['on_topic', 'off_topic', 'sensitive']);
export const QuestionSourceEnum = z.enum(['button', 'custom', 'voice']);
export const PlanIdEnum = z.enum(['event', 'year', 'month']);
export const WorkspaceEnum = z.enum(['real', 'sample']);
export const TextSourceEnum = z.enum(['llm', 'fallback']);
export const StoryLengthEnum = z.enum(['short', 'standard', 'long']);
export const StoryGenreEnum = z.enum(['bedtime', 'funny', 'discover', 'values', 'fairy_tale', 'hero', 'mindful']);
export const ExperienceEnum = z.enum(['first', 'went_fine', 'was_hard']);
export const ComfortKindEnum = z.enum(['teddy', 'blanket', 'toy', 'book']);
export const InterestEnum = z.enum([
  'dinosaurs', 'space', 'trains', 'animals', 'castles', 'cars',
  'ocean', 'music', 'sports', 'drawing', 'bugs', 'building',
]);
export const BackgroundIdSchema = z.string().min(1).max(60);

// ---------- family document (6.1) ----------
const id = z.string().min(1).max(80);

export const CharacterSchema = z.strictObject({
  animal: AnimalEnum,
  color: CharacterColorEnum,
  accessory: AccessoryEnum,
  outfit: OutfitEnum.optional(),
  headwear: HeadwearEnum.optional(),
  companion: CompanionEnum.optional(),
  fur: FurVariantEnum.optional(),
});

export const ValuesProfileSchema = z.strictObject({
  tone: z.enum(['secular', 'religious']),
  bodyWords: z.enum(['anatomical', 'family']),
  family: z.array(z.string().min(1).max(20)).max(6),
});

export const TechniqueMemorySchema = z.strictObject({
  techniqueId: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  outcome: z.enum(['helped', 'didnt_help']),
  eventType: EventTypeEnum,
  eventId: id,
  date: ISODateSchema,
});

export const BadgeSchema = z.strictObject({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(60),
  eventType: EventTypeEnum,
  eventId: id,
  earnedOn: ISODateSchema,
});

/** First name or nickname: one word, letters only, no surname (D14). */
export const ChildNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[\p{L}][\p{L}'-]*$/u, 'one word, letters only');

export const ChildProfileSchema = z.strictObject({
  id,
  name: ChildNameSchema,
  pronunciation: z.string().max(40).optional(),
  age: z.union([
    z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7),
    z.literal(8), z.literal(9), z.literal(10), z.literal(11), z.literal(12),
  ]),
  pronoun: PronounEnum.optional(),
  character: CharacterSchema,
  values: ValuesProfileSchema,
  styleMode: StyleModeEnum,
  techniques: z.array(TechniqueMemorySchema).max(200),
  badges: z.array(BadgeSchema).max(200),
  createdOn: ISODateSchema,
});

export const SentenceSchema = z.strictObject({
  text: z.string().min(1).max(400),
  kind: z.enum(['describe', 'coach']),
});

export const PageSchema = z.strictObject({
  id,
  kind: z.enum(['story', 'answer']),
  sentences: z.array(SentenceSchema).max(20),
  mood: MoodEnum,
  background: BackgroundIdSchema,
  addresses: z.array(TopicEnum).max(10),
  questionId: id.optional(),
  updatedBecause: id.optional(),
  source: TextSourceEnum,
});

export const ChapterSchema = z.strictObject({
  index: z.number().int().min(1).max(5),
  date: ISODateSchema,
  beats: z.array(BeatEnum).min(1).max(5),
  title: z.string().max(120),
  parentSkill: z.string().max(300),
  pages: z.array(PageSchema).max(20),
  summary: z.string().max(200).optional(),
  generatedOn: ISODateSchema.optional(),
  readOn: ISODateSchema.optional(),
});

export const QuestionSchema = z.strictObject({
  id,
  chapter: z.number().int().min(1).max(5),
  afterPageId: id,
  text: z.string().min(1).max(300),
  source: QuestionSourceEnum,
  buttonId: z.string().max(80).optional(),
  category: StoredQuestionCategoryEnum,
  topic: TopicEnum,
  answer: z.array(SentenceSchema).max(5).optional(),
  parentPhrase: z.string().max(400).optional(),
  parentAction: z.enum(['shown', 'edited', 'self']).optional(),
  answeredInStory: z.boolean(),
  askedOn: ISODateSchema,
});

export const PlacePhotoSchema = z.strictObject({
  key: z.string().min(1).max(120),
  caption: z.string().max(60),
});

export const RitualCardSchema = z.strictObject({
  steps: z.tuple([z.string().max(120), z.string().max(120), z.string().max(120)]),
  technique: z.strictObject({
    id: z.string().min(1).max(80),
    label: z.string().max(80),
    how: z.string().max(300),
  }),
  source: TextSourceEnum,
});

export const CheckinSchema = z.strictObject({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  helped: z.array(z.string().max(80)).max(20),
  didntHelp: z.array(z.string().max(80)).max(20),
  custom: z.string().max(60).optional(),
  savedOn: ISODateSchema,
});

const storyPrefsShape = {
  length: StoryLengthEnum.optional(),
  skipSteps: z.array(z.string().max(160)).max(10).optional(),
  moments: z.array(z.string().max(60)).max(2).optional(),
  companions: z.array(z.string().max(30)).max(2).optional(),
  comfort: z.strictObject({ kind: ComfortKindEnum, nickname: z.string().max(24).optional() }).optional(),
  interests: z.array(InterestEnum).max(3).optional(),
  genre: StoryGenreEnum.optional(),
  experience: ExperienceEnum.optional(),
  after: z.string().max(60).optional(),
  avoidWords: z.array(z.string().max(24)).max(3).optional(),
};
export const StoryPrefsSchema = z.strictObject({ ...storyPrefsShape, chapters: z.number().int().min(1).max(5).optional() });
export const StoryContextPrefsSchema = z.strictObject(storyPrefsShape);

export const BigEventSchema = z.strictObject({
  id,
  childId: id,
  type: EventTypeEnum,
  customLabel: z.string().max(40).optional(),
  date: ISODateSchema,
  createdOn: ISODateSchema,
  templateVersion: z.number().int().min(1),
  fears: z.array(TopicEnum).max(3),
  customFear: z.string().max(40).optional(),
  photos: z.array(PlacePhotoSchema).max(3),
  chapters: z.array(ChapterSchema).max(5),
  questions: z.array(QuestionSchema).max(15),
  mustAddress: z.array(TopicEnum).max(10),
  usedTechniques: z.array(z.string().max(80)).max(50),
  place: z.string().max(40).optional(),
  ritual: RitualCardSchema.optional(),
  checkin: CheckinSchema.optional(),
  story: StoryPrefsSchema.optional(),
});

export const FAMILY_DOC_SCHEMA_VERSION = 1;

export const FamilyDocSchema = z.strictObject({
  schemaVersion: z.number().int().min(1),
  child: ChildProfileSchema.nullable(),
  events: z.array(BigEventSchema).max(100),
  updatedAt: z.number().int().nonnegative(),
});

export const EntitlementSchema = z.strictObject({
  plan: PlanIdEnum,
  eventId: id.optional(),
  expiresAt: z.number().int(),
  renews: z.boolean(),
});

export const SettingsSchema = z.strictObject({
  parentGateAcceptedOn: ISODateSchema.optional(),
  clockOverride: ISODateSchema.optional(),
  textSize: z.enum(['m', 'l', 'xl']),
  nightMode: z.enum(['auto', 'on', 'off']),
  palette: z.enum(['warm', 'ocean', 'forest', 'lavender']).optional(),
  voiceQuestionConsentOn: ISODateSchema.optional(),
  voiceQuestionMode: z.enum(['device', 'browser']).optional(),
  schemaVersion: z.number().int().min(1),
});

export const StoryContextSchema = z.strictObject({
  event: z.strictObject({
    type: EventTypeEnum,
    customLabel: z.string().max(40).optional(),
    fears: z.array(TopicEnum).max(3),
    customFear: z.string().max(40).optional(),
    templateVersion: z.number().int().min(1),
  }),
  child: z.strictObject({
    age: z.number().int().min(2).max(12),
    pronoun: PronounEnum.optional(),
    character: CharacterSchema,
  }),
  values: ValuesProfileSchema,
  styleMode: StyleModeEnum,
  chapter: z.strictObject({
    index: z.number().int().min(1).max(5),
    total: z.number().int().min(1).max(5),
    beats: z.array(BeatEnum).min(1).max(5),
  }),
  mustAddress: z.array(TopicEnum).max(10),
  askedQuestions: z
    .array(z.strictObject({ text: z.string().max(300), topic: TopicEnum, chapter: z.number().int().min(1).max(5) }))
    .max(5),
  usedTechniques: z.array(z.string().max(80)).max(50),
  helpedBefore: z.array(z.string().max(80)).max(50),
  avoid: z.array(z.string().max(80)).max(50),
  previousSummaries: z.array(z.string().max(200)).max(5),
  placeCaptions: z.array(z.string().max(60)).max(3),
  place: z.string().max(40).optional(),
  story: StoryContextPrefsSchema.optional(),
});

// ---------- LLM output (8.5) ----------
/** Most pages a chapter may have: 7 for the 'long' story length. */
export const MAX_PAGES_PER_CHAPTER = 7;
const SentenceOut = z.object({ text: z.string().min(2).max(220), kind: z.enum(['describe', 'coach']) });
export const PageOut = z.object({
  sentences: z.array(SentenceOut).min(2).max(16),
  mood: MoodEnum,
  background: z.string(), // checked against the template list, else replaced by the first one
  addresses: z.array(TopicEnum),
});
export const ChapterOut = z.object({
  pages: z.array(PageOut).min(3).max(MAX_PAGES_PER_CHAPTER),
  summary: z.string().max(200),
  usedTechniques: z.array(z.string()), // filtered to ids the template knows
  place: z.string().max(40),
});
export const AnswerOut = z.object({
  // field order matters: category streams first
  category: QuestionCategoryEnum,
  topic: TopicEnum,
  answer: z.array(SentenceOut).max(3), // empty for sensitive and unsafe
  parentDraft: z.string().max(400), // only for sensitive
  parentPhrase: z.string().max(160),
  nextPage: PageOut.nullable(), // only for on_topic in story mode
});
export const RitualOut = z.object({
  steps: z.array(z.string().max(60)).length(3),
  techniqueId: z.string(),
});
export type PageOutT = z.infer<typeof PageOut>;
export type ChapterOutT = z.infer<typeof ChapterOut>;
export type AnswerOutT = z.infer<typeof AnswerOut>;
export type RitualOutT = z.infer<typeof RitualOut>;

// ---------- event template (7) ----------
const TemplatePage = z.strictObject({
  sentences: z.array(SentenceSchema).min(1).max(16),
  mood: MoodEnum,
  background: BackgroundIdSchema,
  addresses: z.array(TopicEnum),
});
const beatRecord = <S extends z.ZodTypeAny>(s: S) =>
  z.strictObject({ what_happens: s, who_is_there: s, what_i_do: s, if_scared: s, rehearsal: s });
const topicRecord = <S extends z.ZodTypeAny>(s: S) => z.partialRecord(TopicEnum, s);

export const EventTemplateSchema = z.strictObject({
  type: EventTypeEnum,
  version: z.number().int().min(1),
  label: z.string().min(1),
  countdownLabel: z.string().min(1),
  beats: beatRecord(
    z.strictObject({ title: z.string().min(1), goals: z.array(z.string()).min(2).max(3), parentSkill: z.string().min(1) }),
  ),
  steps: z.array(z.string()).min(5).max(7),
  sensory: z.array(z.string()).min(1),
  honestyNotes: z.string(),
  questionButtons: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        text: z.string().min(1),
        topic: TopicEnum,
        fallbackAnswer: z.array(z.string()).min(2).max(3),
      }),
    )
    .min(3),
  techniques: z
    .array(z.strictObject({ id: z.string().min(1), label: z.string(), how: z.string(), topics: z.array(TopicEnum) }))
    .min(1),
  ritual: z.tuple([z.string(), z.string(), z.string()]),
  phrases: topicRecord(z.array(z.string()).min(1).max(3)),
  topicWords: topicRecord(z.array(z.string()).min(1)),
  backgrounds: z.array(BackgroundIdSchema).min(1),
  fallbackPages: z.strictObject({
    story: beatRecord(z.array(TemplatePage).min(1)),
    social: beatRecord(z.array(TemplatePage).min(1)),
  }),
  olderPages: beatRecord(TemplatePage).optional(),
  badge: z.strictObject({ id: z.string().min(1), label: z.string().min(1) }),
});

// ---------- API bodies (9) ----------
export const ApiErrorCodeEnum = z.enum([
  'bad_request', 'no_session', 'payment_required', 'forbidden', 'not_found', 'conflict', 'rate_limited', 'upstream_failed',
]);
export const StatePutBody = z.strictObject({ doc: FamilyDocSchema, baseVersion: z.number().int().min(0) });
export const SampleBody = z.strictObject({ today: ISODateSchema });
export const RestoreBody = z.strictObject({ code: z.string().min(16).max(200) });
export const ChapterBody = z.strictObject({ eventId: id, context: StoryContextSchema });
export const AnswerBody = z.strictObject({
  context: StoryContextSchema,
  question: z.strictObject({ text: z.string().min(1).max(300), source: QuestionSourceEnum, buttonId: z.string().max(80).optional() }),
  currentPage: z.strictObject({ id, text: z.string().max(3000) }),
  nextPage: z.strictObject({ id, text: z.string().max(3000), background: BackgroundIdSchema }).optional(),
  questionsInChapter: z.number().int().min(0).max(3),
});
export const RitualBody = z.strictObject({ eventId: id, context: StoryContextSchema, topTopics: z.array(TopicEnum).max(5) });
export const CheckoutBody = z.strictObject({
  plan: z.enum(['event', 'year', 'month', 'upgrade']),
  eventId: id,
  renewalConsent: z.boolean().optional(),
});
export const VerifyBody = z.strictObject({ sessionId: z.string().min(1).max(300) });
export const SampleAccessBody = z.strictObject({ action: z.enum(['grant', 'reset']) });
export const IcsPayload = z.strictObject({
  label: z.string().min(1).max(60),
  eventId: id,
  chapterDates: z.array(ISODateSchema).max(5),
  eventDate: ISODateSchema,
  /** Number of the first chapter in `chapterDates` when earlier evenings are already past (default 1). */
  firstChapter: z.number().int().min(1).max(6).optional(),
  /** The "How did it go?" time on the event day is already past. */
  skipCheckin: z.boolean().optional(),
});

// ---------- drift checks: types.ts <-> schemas.ts ----------
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<X extends true> = X;
export type _Drift = [
  Assert<Same<z.infer<typeof FamilyDocSchema>, T.FamilyDoc>>,
  Assert<Same<z.infer<typeof BigEventSchema>, T.BigEvent>>,
  Assert<Same<z.infer<typeof ChildProfileSchema>, T.ChildProfile>>,
  Assert<Same<z.infer<typeof StoryContextSchema>, T.StoryContext>>,
  Assert<Same<z.infer<typeof EntitlementSchema>, T.Entitlement>>,
  Assert<Same<z.infer<typeof SettingsSchema>, T.Settings>>,
  Assert<Same<z.infer<typeof EventTemplateSchema>, T.EventTemplate>>,
];
