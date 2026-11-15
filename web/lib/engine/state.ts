/**
 * Story state and questions (docs/SPEC.md 5.4, 5.7, 4.13). The state is rebuilt by code
 * from what is stored; the LLM never owns it. Every function returns a new event (or
 * child) and leaves its arguments untouched, so the Zustand stores can use them directly.
 */
import { compareDates } from './clock';
import { CUSTOM_PREFIX, isCustomTechnique, techniqueMemory } from './memory';
import { TopicEnum } from './schemas';
import { getTemplate } from './templates';
import { containsAnyWord, slugify } from './text';
import type {
  Badge,
  BigEvent,
  Chapter,
  Checkin,
  ChildProfile,
  EventTemplate,
  ISODate,
  Mood,
  Page,
  Question,
  QuestionCategory,
  QuestionSource,
  Sentence,
  StoryContext,
  TechniqueMemory,
  TextSource,
  Topic,
} from './types';

export const MAX_QUESTIONS_PER_CHAPTER = 3;
export const MAX_QUESTIONS_PER_EVENT = 15;
export const ASKED_QUESTIONS_IN_CONTEXT = 5;

// ---------- topics on pages (A9) ----------

/**
 * Topics a page really covers: the ones it claims in `addresses` whose template word list
 * matches its text. The browser and the server use this same rule.
 */
export function confirmAddresses(
  page: { sentences: Pick<Sentence, 'text'>[]; addresses: readonly string[] },
  template: EventTemplate,
): Topic[] {
  const text = page.sentences.map((s) => s.text).join(' ');
  const out: Topic[] = [];
  for (const raw of page.addresses) {
    const parsed = TopicEnum.safeParse(raw);
    if (!parsed.success || out.includes(parsed.data) || parsed.data === 'other') continue;
    const words = template.topicWords[parsed.data];
    if (words && containsAnyWord(text, words)) out.push(parsed.data);
  }
  return out;
}

/** Questions whose topic the story must still cover: real topic, not off topic, not kept by the parent. */
export function questionCountsForStory(q: Question): boolean {
  if (q.category === 'off_topic' || q.topic === 'other') return false;
  if (q.category === 'sensitive' && q.parentAction === 'self') return false;
  return true;
}

/** Topics confirmed on story pages (answer pages do not count). */
export function coveredTopics(event: Pick<BigEvent, 'chapters'>): Set<Topic> {
  const covered = new Set<Topic>();
  for (const c of event.chapters) for (const p of c.pages) if (p.kind === 'story') p.addresses.forEach((t) => covered.add(t));
  return covered;
}

/**
 * mustAddress (5.4): fears not yet covered by any story page, plus topics of questions not
 * yet answered in the story. Order: fears first, then questions in the order asked.
 */
export function deriveMustAddress(event: Pick<BigEvent, 'fears' | 'chapters' | 'questions'>): Topic[] {
  const covered = coveredTopics(event);
  const out: Topic[] = [];
  for (const f of event.fears) if (f !== 'other' && !covered.has(f) && !out.includes(f)) out.push(f);
  for (const q of event.questions)
    if (questionCountsForStory(q) && !q.answeredInStory && !out.includes(q.topic)) out.push(q.topic);
  return out;
}

function withDerived(event: BigEvent): BigEvent {
  return { ...event, mustAddress: deriveMustAddress(event) };
}

/** Marks every open question whose topic a story page now covers. */
function markAnswered(event: BigEvent, topics: readonly Topic[]): BigEvent {
  if (!topics.length) return event;
  return {
    ...event,
    questions: event.questions.map((q) =>
      !q.answeredInStory && questionCountsForStory(q) && topics.includes(q.topic) ? { ...q, answeredInStory: true } : q,
    ),
  };
}

function chapterOf(event: BigEvent, index: number): Chapter {
  const c = event.chapters.find((x) => x.index === index);
  if (!c) throw new Error(`Event ${event.id} has no chapter ${index}`);
  return c;
}

function replaceChapter(event: BigEvent, chapter: Chapter): BigEvent {
  return { ...event, chapters: event.chapters.map((c) => (c.index === chapter.index ? chapter : c)) };
}

// ---------- story context (5.4, 6.1) ----------

export interface ContextInput {
  event: BigEvent;
  child: ChildProfile;
  template?: EventTemplate;
  chapterIndex: number;
}

/** The story context sent with every LLM call. Built by code; never contains the name. */
export function buildStoryContext({ event, child, template = getTemplate(event.type), chapterIndex }: ContextInput): StoryContext {
  const chapter = chapterOf(event, chapterIndex);
  const memory = techniqueMemory(child, { excludeEventId: event.id });
  const known = new Set(template.techniques.map((t) => t.id));
  const ctx: StoryContext = {
    event: {
      type: event.type,
      fears: event.fears.slice(0, 3),
      templateVersion: event.templateVersion || template.version,
    },
    child: { age: child.age, character: { ...child.character } },
    values: { tone: child.values.tone, bodyWords: child.values.bodyWords, family: [...child.values.family] },
    styleMode: child.styleMode,
    chapter: { index: chapter.index, total: event.chapters.length, beats: [...chapter.beats] },
    mustAddress: deriveMustAddress(event),
    askedQuestions: event.questions
      .filter((q) => q.category === 'on_topic')
      .slice(-ASKED_QUESTIONS_IN_CONTEXT)
      .map((q) => ({ text: q.text.slice(0, 300), topic: q.topic, chapter: q.chapter })),
    usedTechniques: event.usedTechniques.filter((id) => known.has(id)).slice(0, 50),
    helpedBefore: memory.helpedBefore.map((s) => s.slice(0, 80)),
    avoid: memory.avoid.map((s) => s.slice(0, 80)),
    previousSummaries: event.chapters
      .filter((c) => c.index < chapterIndex && c.summary)
      .sort((a, b) => a.index - b.index)
      .map((c) => (c.summary as string).slice(0, 200))
      .slice(0, 5),
    placeCaptions: event.photos.map((p) => p.caption.trim()).filter(Boolean).slice(0, 3),
  };
  if (event.type === 'other' && event.customLabel) ctx.event.customLabel = event.customLabel.slice(0, 40);
  if (event.customFear) ctx.event.customFear = event.customFear.slice(0, 40);
  if (child.pronoun) ctx.child.pronoun = child.pronoun;
  if (event.place) ctx.place = event.place.slice(0, 40);
  if (event.story) {
    const story = { ...event.story };
    delete story.chapters;
    if (Object.keys(story).length) ctx.story = story;
  }
  return ctx;
}

// ---------- generated chapters and pages ----------

export interface PageInput {
  sentences: Sentence[];
  mood: Mood;
  background: string;
  addresses: readonly string[];
}

export interface ChapterResult {
  pages: PageInput[];
  summary?: string;
  usedTechniques?: readonly string[];
  place?: string;
  source: TextSource;
}

function checkedBackground(bg: string, template: EventTemplate): string {
  return template.backgrounds.includes(bg) ? bg : template.backgrounds[0];
}

export function storyPageId(chapterIndex: number, n: number): string {
  return `c${chapterIndex}-p${n}`;
}

/** Stores a generated (or fallback) chapter: page ids, confirmed topics, techniques, summary, place. */
export function applyGeneratedChapter(
  event: BigEvent,
  chapterIndex: number,
  result: ChapterResult,
  template: EventTemplate,
  today: ISODate,
): BigEvent {
  const chapter = chapterOf(event, chapterIndex);
  const pages: Page[] = result.pages.map((p, i) => ({
    id: storyPageId(chapterIndex, i + 1),
    kind: 'story',
    sentences: p.sentences.map((s) => ({ text: s.text, kind: s.kind })),
    mood: p.mood,
    background: checkedBackground(p.background, template),
    addresses: confirmAddresses(p, template),
    source: result.source,
  }));
  const next: Chapter = { ...chapter, pages, generatedOn: today };
  const summary = result.summary?.trim();
  if (summary) next.summary = summary.slice(0, 200);
  else delete next.summary;
  let out = replaceChapter(event, next);
  const known = new Set(template.techniques.map((t) => t.id));
  const used = [...out.usedTechniques];
  for (const id of result.usedTechniques ?? []) if (known.has(id) && !used.includes(id)) used.push(id);
  out = { ...out, usedTechniques: used.slice(0, 50) };
  const place = result.place?.trim();
  if (place) out.place = place.slice(0, 40);
  out = markAnswered(out, [...new Set(pages.flatMap((p) => p.addresses))]);
  return withDerived(out);
}

/** True once a chapter has pages; a generated chapter is never generated again (4.7). */
export function isChapterGenerated(chapter: Chapter): boolean {
  return chapter.pages.length > 0;
}

/** Inserts (or replaces) the answer page of a question right after the page it was asked on. */
export function insertAnswerPage(
  event: BigEvent,
  chapterIndex: number,
  input: { questionId: string; afterPageId: string; sentences: Sentence[]; background?: string; mood?: Mood; source: TextSource },
  template: EventTemplate,
): BigEvent {
  const chapter = chapterOf(event, chapterIndex);
  const after = chapter.pages.find((p) => p.id === input.afterPageId);
  const page: Page = {
    id: `c${chapterIndex}-a-${input.questionId}`.slice(0, 80),
    kind: 'answer',
    sentences: input.sentences.slice(0, 5).map((s) => ({ text: s.text, kind: s.kind })),
    mood: input.mood ?? 'calm',
    background: checkedBackground(input.background ?? after?.background ?? template.backgrounds[0], template),
    addresses: [],
    questionId: input.questionId,
    source: input.source,
  };
  const pages = chapter.pages.filter((p) => p.id !== page.id);
  const at = pages.findIndex((p) => p.id === input.afterPageId);
  pages.splice(at < 0 ? pages.length : at + 1, 0, page);
  return replaceChapter(event, { ...chapter, pages });
}

/** Replaces the next story page after an on_topic question (story mode only) and marks the chip. */
export function applyRewrittenPage(
  event: BigEvent,
  chapterIndex: number,
  pageId: string,
  page: PageInput,
  questionId: string,
  template: EventTemplate,
  source: TextSource = 'llm',
): BigEvent {
  const chapter = chapterOf(event, chapterIndex);
  const old = chapter.pages.find((p) => p.id === pageId && p.kind === 'story');
  if (!old) return event;
  const addresses = confirmAddresses(page, template);
  const updated: Page = {
    ...old,
    sentences: page.sentences.map((s) => ({ text: s.text, kind: s.kind })),
    mood: page.mood,
    background: checkedBackground(page.background, template),
    addresses,
    updatedBecause: questionId,
    source,
  };
  let out = replaceChapter(event, { ...chapter, pages: chapter.pages.map((p) => (p.id === pageId ? updated : p)) });
  out = markAnswered(out, addresses);
  return withDerived(out);
}

/** The next story page after `pageId`, the one a question may rewrite. */
export function nextStoryPage(chapter: Chapter, pageId: string): Page | undefined {
  const i = chapter.pages.findIndex((p) => p.id === pageId);
  return chapter.pages.slice(i + 1).find((p) => p.kind === 'story');
}

// ---------- questions ----------

export function questionsInChapter(event: Pick<BigEvent, 'questions'>, chapterIndex: number): number {
  return event.questions.filter((q) => q.chapter === chapterIndex).length;
}

export function canAskQuestion(event: Pick<BigEvent, 'questions'>, chapterIndex: number): boolean {
  return (
    questionsInChapter(event, chapterIndex) < MAX_QUESTIONS_PER_CHAPTER &&
    event.questions.length < MAX_QUESTIONS_PER_EVENT
  );
}

export interface QuestionInput {
  id: string;
  chapter: number;
  afterPageId: string;
  /** Cleaned text with the name already replaced by [[CHILD]]. */
  text: string;
  source: QuestionSource;
  buttonId?: string;
  category: QuestionCategory;
  /** From the model for own questions; ignored for buttons (the template decides). */
  topic?: string;
  answer?: Sentence[];
  parentPhrase?: string;
}

export type RecordResult =
  | { ok: true; event: BigEvent; question: Question }
  | { ok: false; error: 'unsafe' | 'limit' };

/**
 * Stores a question (5.4). Unsafe questions are never stored or counted. The topic of a
 * button comes from the template; an invalid model topic becomes 'other'; off-topic
 * questions are recorded as 'other'.
 */
export function recordQuestion(event: BigEvent, input: QuestionInput, today: ISODate, template: EventTemplate = getTemplate(event.type)): RecordResult {
  if (input.category === 'unsafe') return { ok: false, error: 'unsafe' };
  if (!canAskQuestion(event, input.chapter)) return { ok: false, error: 'limit' };
  const button = input.buttonId ? template.questionButtons.find((b) => b.id === input.buttonId) : undefined;
  let topic: Topic = button ? button.topic : (TopicEnum.safeParse(input.topic).data ?? 'other');
  if (input.category === 'off_topic') topic = 'other';
  const question: Question = {
    id: input.id,
    chapter: input.chapter,
    afterPageId: input.afterPageId,
    text: input.text.trim().slice(0, 300),
    source: input.source,
    category: input.category,
    topic,
    answeredInStory: false,
    askedOn: today,
  };
  if (button) question.buttonId = button.id;
  else if (input.buttonId) question.buttonId = input.buttonId.slice(0, 80);
  if (input.answer?.length) question.answer = input.answer.slice(0, 5).map((s) => ({ text: s.text, kind: s.kind }));
  if (input.parentPhrase?.trim()) question.parentPhrase = input.parentPhrase.trim().slice(0, 400);
  const out = withDerived({ ...event, questions: [...event.questions, question] });
  return { ok: true, event: out, question };
}

/** Sets the answer and phrase of a question once the stream finished. */
export function setQuestionAnswer(event: BigEvent, questionId: string, answer: Sentence[], parentPhrase?: string): BigEvent {
  return {
    ...event,
    questions: event.questions.map((q) => {
      if (q.id !== questionId) return q;
      const next: Question = { ...q, answer: answer.slice(0, 5).map((s) => ({ text: s.text, kind: s.kind })) };
      if (parentPhrase?.trim()) next.parentPhrase = parentPhrase.trim().slice(0, 400);
      return next;
    }),
  };
}

/** Parent check result for a sensitive question (4.9). "I'll answer myself" removes the topic from the story. */
export function setParentAction(
  event: BigEvent,
  questionId: string,
  action: NonNullable<Question['parentAction']>,
  shownAnswer?: Sentence[],
): BigEvent {
  const out: BigEvent = {
    ...event,
    questions: event.questions.map((q) => {
      if (q.id !== questionId) return q;
      const next: Question = { ...q, parentAction: action };
      if (shownAnswer?.length) next.answer = shownAnswer.slice(0, 5).map((s) => ({ text: s.text, kind: s.kind }));
      return next;
    }),
  };
  return withDerived(out);
}

export function markChapterRead(event: BigEvent, chapterIndex: number, today: ISODate): BigEvent {
  const c = chapterOf(event, chapterIndex);
  if (c.readOn) return event;
  return replaceChapter(event, { ...c, readOn: today });
}

/** Parent skills of the chapters read, for "Skills you practised" (A15). */
export function skillsPractised(event: Pick<BigEvent, 'chapters'>): string[] {
  return [...new Set(event.chapters.filter((c) => c.readOn).map((c) => c.parentSkill).filter(Boolean))];
}

// ---------- ritual and check-in (4.12, 4.13, 5.7) ----------

export function setRitual(event: BigEvent, ritual: NonNullable<BigEvent['ritual']>): BigEvent {
  return { ...event, ritual };
}

export interface TechniqueOption {
  id: string;
  label: string;
}

/**
 * Chips for "What helped?": techniques used in this plan (stories and ritual card). When
 * none were recorded (template fallback chapters do not report any), the template's
 * techniques that match the event's fears come first, then the rest, at most 6.
 */
export function checkinTechniqueOptions(event: BigEvent, template: EventTemplate = getTemplate(event.type)): TechniqueOption[] {
  const ids = [...event.usedTechniques];
  if (event.ritual && !ids.includes(event.ritual.technique.id)) ids.push(event.ritual.technique.id);
  const out: TechniqueOption[] = [];
  for (const id of ids) {
    const t = template.techniques.find((x) => x.id === id);
    if (t) out.push({ id: t.id, label: t.label });
    else if (event.ritual?.technique.id === id) out.push({ id, label: event.ritual.technique.label });
  }
  if (out.length >= 3) return out.slice(0, 6);
  const rest = [...template.techniques].sort(
    (a, b) => Number(b.topics.some((t) => event.fears.includes(t))) - Number(a.topics.some((t) => event.fears.includes(t))),
  );
  for (const t of rest) if (!out.some((o) => o.id === t.id)) out.push({ id: t.id, label: t.label });
  return out.slice(0, 6);
}

export interface CheckinInput {
  rating: Checkin['rating'];
  helped: string[];
  didntHelp: string[];
  custom?: string;
}

/**
 * Saves the check-in to the event and the child (4.13, 5.7): ticked techniques as helped,
 * the second row as didn't help, the parent's own entry as helped. Untouched techniques
 * are recorded as neither. Saving again replaces this event's earlier records. The badge
 * of the event type is earned once per event.
 */
export function saveCheckin(args: {
  event: BigEvent;
  child: ChildProfile;
  input: CheckinInput;
  today: ISODate;
  template?: EventTemplate;
}): { event: BigEvent; child: ChildProfile; badge: Badge } {
  const { event, child, input, today } = args;
  const template = args.template ?? getTemplate(event.type);
  const helped = [...new Set(input.helped.filter(Boolean))].slice(0, 20);
  const didnt = [...new Set(input.didntHelp.filter((id) => id && !helped.includes(id)))].slice(0, 20);
  const custom = input.custom?.trim().slice(0, 60) || undefined;
  const checkin: Checkin = { rating: input.rating, helped, didntHelp: didnt, savedOn: today };
  if (custom) checkin.custom = custom;

  const label = (id: string) =>
    template.techniques.find((t) => t.id === id)?.label ??
    (event.ritual?.technique.id === id ? event.ritual.technique.label : undefined) ??
    id;
  const record = (techniqueId: string, lbl: string, outcome: TechniqueMemory['outcome']): TechniqueMemory => ({
    techniqueId: techniqueId.slice(0, 80),
    label: lbl.slice(0, 80),
    outcome,
    eventType: event.type,
    eventId: event.id,
    date: today,
  });
  const records: TechniqueMemory[] = [
    ...helped.map((id) => record(id, label(id), 'helped')),
    ...didnt.map((id) => record(id, label(id), 'didnt_help')),
  ];
  if (custom) records.push(record(`${CUSTOM_PREFIX}${slugify(custom)}`, custom, 'helped'));

  const badge: Badge = {
    id: template.badge.id,
    label: template.badge.label,
    eventType: event.type,
    eventId: event.id,
    earnedOn: today,
  };
  const hasBadge = child.badges.some((b) => b.eventId === event.id);
  const techniques = [...child.techniques.filter((r) => r.eventId !== event.id), ...records].slice(-200);
  return {
    event: { ...event, checkin },
    child: {
      ...child,
      techniques,
      badges: hasBadge ? child.badges : [...child.badges, badge].slice(-200),
    },
    badge: hasBadge ? (child.badges.find((b) => b.eventId === event.id) as Badge) : badge,
  };
}

/** Badges sorted newest first, for the collection. */
export function badgeCollection(child: Pick<ChildProfile, 'badges'>): Badge[] {
  return [...child.badges].sort((a, b) => compareDates(b.earnedOn, a.earnedOn));
}

export { isCustomTechnique };
