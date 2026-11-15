/**
 * Parent panel "What's on Max's mind" (docs/SPEC.md 4.10, 5.5). Computed by code from the
 * stored questions and the template; no LLM call.
 */
import { memoryLines, pickDayTechnique, type DayTechnique } from './memory';
import { tonightChapter } from './plan';
import type { BigEvent, ChildProfile, EventTemplate, ISODate, Question, Topic } from './types';

/** Panel labels of the topics. */
export const TOPIC_LABELS: Record<Topic, string> = {
  pain: 'Pain',
  separation: 'Being apart',
  unknown: 'What will happen',
  strangers: 'New people',
  sensory: 'Noise, light and smells',
  safety: 'Something going wrong',
  social: 'Other kids',
  body: 'Body and touch',
  love: 'Love and feelings',
  other: 'Other questions',
};

export function topicLabel(topic: Topic): string {
  return TOPIC_LABELS[topic];
}

/** Onboarding fear list, label → topic (4.5). */
export const FEAR_OPTIONS: readonly { label: string; topic: Topic }[] = [
  { label: 'It might hurt', topic: 'pain' },
  { label: 'Being away from me', topic: 'separation' },
  { label: 'Not knowing what will happen', topic: 'unknown' },
  { label: 'Unfamiliar adults', topic: 'strangers' },
  { label: 'Loud noises, bright lights, smells', topic: 'sensory' },
  { label: 'Something going wrong', topic: 'safety' },
  { label: 'Other kids', topic: 'social' },
  { label: 'Being touched or undressed', topic: 'body' },
];

export interface PanelQuestion {
  id: string;
  text: string;
  chapter: number;
  category: Question['category'];
  answeredInStory: boolean;
  parentAction?: Question['parentAction'];
}

export interface TopicRow {
  topic: Topic;
  label: string;
  count: number;
  questions: PanelQuestion[];
  /** True when every question of the row was covered by a later story page. */
  answeredInStory: boolean;
  /** 1–2 ready phrases: the phrase returned with the newest answer, then template phrases. */
  phrases: string[];
}

export interface PanelSummary {
  rows: TopicRow[];
  /** Sensitive questions the parent chose to answer personally. */
  selfAnswered: PanelQuestion[];
  /** Sensitive questions still waiting for a grown-up (the child chose "Keep reading"). */
  waiting: PanelQuestion[];
  dayTechnique: DayTechnique;
  memoryLines: string[];
  parentSkill: string | null;
  totalQuestions: number;
  empty: boolean;
}

/** Questions that count in the panel: everything stored except off-topic ones. */
export function countsInPanel(q: Question): boolean {
  return q.category !== 'off_topic';
}

/** Topics ordered by how often the child asked, ties broken by the latest question. */
export function topTopics(event: Pick<BigEvent, 'questions' | 'fears'>, n = 3): Topic[] {
  const stats = new Map<Topic, { count: number; last: number }>();
  event.questions.forEach((q, i) => {
    if (!countsInPanel(q) || q.topic === 'other') return;
    const s = stats.get(q.topic) ?? { count: 0, last: -1 };
    stats.set(q.topic, { count: s.count + 1, last: i });
  });
  const asked = [...stats.entries()].sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last).map(([t]) => t);
  const fears = event.fears.filter((f) => f !== 'other' && !asked.includes(f));
  return [...asked, ...fears].slice(0, n);
}

function toPanelQuestion(q: Question): PanelQuestion {
  const p: PanelQuestion = { id: q.id, text: q.text, chapter: q.chapter, category: q.category, answeredInStory: q.answeredInStory };
  if (q.parentAction) p.parentAction = q.parentAction;
  return p;
}

export function summarise(
  event: BigEvent,
  child: Pick<ChildProfile, 'techniques'> | null | undefined,
  template: EventTemplate,
  today?: ISODate,
): PanelSummary {
  const counted = event.questions.filter(countsInPanel);
  const groups = new Map<Topic, Question[]>();
  counted.forEach((q) => groups.set(q.topic, [...(groups.get(q.topic) ?? []), q]));

  const order = new Map<Topic, number>();
  counted.forEach((q, i) => order.set(q.topic, i));
  const rows: TopicRow[] = [...groups.entries()]
    .map(([topic, qs]) => {
      const fromAnswers = qs
        .slice()
        .reverse()
        .map((q) => q.parentPhrase?.trim())
        .filter((p): p is string => !!p);
      const phrases = [...new Set([...fromAnswers.slice(0, 1), ...(template.phrases[topic] ?? [])])].slice(0, 2);
      return {
        topic,
        label: topicLabel(topic),
        count: qs.length,
        questions: qs.map(toPanelQuestion),
        answeredInStory: qs.every((q) => q.answeredInStory),
        phrases,
      };
    })
    .sort(
      (a, b) =>
        Number(a.topic === 'other') - Number(b.topic === 'other') ||
        b.count - a.count ||
        (order.get(b.topic) ?? 0) - (order.get(a.topic) ?? 0),
    );

  const parentChapter = today ? tonightChapter(event, today) : event.chapters.find((c) => !c.readOn);
  const lastChapter = [...event.chapters].sort((a, b) => b.index - a.index)[0];

  return {
    rows,
    selfAnswered: counted.filter((q) => q.category === 'sensitive' && q.parentAction === 'self').map(toPanelQuestion),
    waiting: counted.filter((q) => q.category === 'sensitive' && !q.parentAction).map(toPanelQuestion),
    dayTechnique: pickDayTechnique(template, child, topTopics(event), { excludeEventId: event.id }),
    memoryLines: memoryLines(child, { excludeEventId: event.id }),
    parentSkill: (parentChapter ?? lastChapter)?.parentSkill ?? null,
    totalQuestions: counted.length,
    empty: counted.length === 0,
  };
}
