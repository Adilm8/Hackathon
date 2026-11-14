/**
 * answerQuestion (docs/SPEC.md 8.2, 8.4, 8.6, 9 `POST /api/answer`). Server-only.
 *
 * Order of events: category → answer | draft → nextPage (on_topic, story style) → done.
 * Unsafe: category → done; nothing is sent to a model, stored or counted.
 * Level 1 in code decides unsafe, fixes sensitive (the model can only draft the parent's answer and
 * cannot lower the category) and answers rule-breaking, rude and non-English questions itself.
 * Two calls: the answer (route 'answer', deadline 3.5 s), then the rewritten next page (route 'rewrite',
 * main model, within the 12 s total), so the answer never waits for the page.
 * Deadlines: answer 3.5 s, rewritten next page 12 s. On failure: a button gets its template answer,
 * an own question gets the "great question" line, the next page stays as it was.
 */
import 'server-only';
import { z } from 'zod';
import { AnswerOut, PageOut, type AnswerOutT } from '../engine/schemas';
import type { EventTemplate, QuestionCategory, QuestionSource, Sentence, StoryContext, Topic } from '../engine/types';
import { env } from '../env';
import { cleanText, isBlank, LIMITS, precheck } from '../safety/filters';
import { REDIRECT_LINES, REDIRECT_PARENT_PHRASE, SENSITIVE_PARENT_PHRASE } from '../safety/messages';
import { checkText } from '../safety/postcheck';
import { DEADLINES } from './config';
import { fallbackAnswer, fallbackParentPhrase, type OutPage } from './fallback';
import { mockAnswer } from './mock';
import { buildAnswerPrompt, buildRewritePrompt } from './prompts/answer.v1';
import { buildSystemPrompt } from './prompts/system.v1';
import { callStructured } from './run';
import { checkPage, postcheckOptions, wordCount } from './validate';

export type AnswerEvent =
  | { type: 'category'; category: QuestionCategory; topic: Topic }
  | { type: 'answer'; sentences: Sentence[]; source: 'llm' | 'fallback' }
  | { type: 'draft'; text: string; source: 'llm' | 'fallback' }
  | { type: 'nextPage'; page: OutPage }
  | { type: 'done'; parentPhrase: string };

export interface AnswerInput {
  ctx: StoryContext;
  template: EventTemplate;
  familyId: string | null;
  question: { text: string; source: QuestionSource; buttonId?: string };
  currentPage: { id: string; text: string };
  nextPage?: { id: string; text: string; background: string };
  /** The child's name from the server copy, replaced again on the server (8.6 level 1). */
  childName?: string;
  pronunciation?: string;
  signal?: AbortSignal;
}

export class BlankQuestion extends Error {}

const RewriteOut = z.object({ nextPage: PageOut });

const RANK: Record<QuestionCategory, number> = { on_topic: 0, off_topic: 0, sensitive: 1, unsafe: 2 };

const NON_ENGLISH_LINES = ['I understand English best.', 'Can you ask me in English? Then we will keep reading.'];

function asSentences(lines: string[]): Sentence[] {
  return lines.map((text, i) => ({ text, kind: i === 0 ? 'describe' : 'coach' }));
}

/** Text of a page for the prompt, with the name replaced (pages come from the browser). */
function pageText(text: string, input: AnswerInput): string {
  return cleanText(text, { max: 1500, childName: input.childName, pronunciation: input.pronunciation, keepPlaceholders: true }).text;
}

export async function* answerQuestion(input: AnswerInput): AsyncGenerator<AnswerEvent> {
  const { ctx, template } = input;
  const post = postcheckOptions(ctx);
  const isMock = env().llm.provider === 'mock';
  const src = (): 'llm' | 'fallback' => (isMock ? 'fallback' : 'llm');

  // ---- level 1: what the question is, in code ----
  const button = input.question.buttonId ? template.questionButtons.find((b) => b.id === input.question.buttonId) : undefined;
  const cleaned = button
    ? { text: button.text, redacted: [], truncated: false }
    : cleanText(input.question.text, { max: LIMITS.question, childName: input.childName, pronunciation: input.pronunciation });
  if (isBlank(cleaned.text)) throw new BlankQuestion('blank');
  const pre = button ? { category: null } : precheck(cleaned.text);

  if (pre.category === 'unsafe') {
    yield { type: 'category', category: 'unsafe', topic: 'safety' };
    yield { type: 'done', parentPhrase: '' };
    return;
  }
  if (pre.category === 'off_topic') {
    yield { type: 'category', category: 'off_topic', topic: 'other' };
    const lines = 'reason' in pre && pre.reason === 'non_english' ? NON_ENGLISH_LINES : REDIRECT_LINES;
    yield { type: 'answer', sentences: asSentences(lines), source: 'fallback' };
    yield { type: 'done', parentPhrase: REDIRECT_PARENT_PHRASE };
    return;
  }

  const sensitive = pre.category === 'sensitive';
  const fixedTopic: Topic | undefined = button?.topic ?? ('topic' in pre ? pre.topic : undefined);

  // ---- the model call ----
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  input.signal?.addEventListener('abort', onAbort, { once: true });
  let answerTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => ac.abort(), DEADLINES.answer);
  const totalTimer = setTimeout(() => ac.abort(), DEADLINES.answerNextPage);

  let categorySent: { category: QuestionCategory; topic: Topic } | null = null;
  let answerSent = false;
  let unsafeSeen = false;

  const sendCategory = (category: QuestionCategory, topic: Topic): AnswerEvent => {
    categorySent = { category, topic };
    return { type: 'category', category, topic };
  };
  const decideCategory = (modelCat: QuestionCategory, modelTopic: Topic): { category: QuestionCategory; topic: Topic } => {
    let category = modelCat;
    if (sensitive && RANK[category] < RANK.sensitive) category = 'sensitive';
    // A button question is on topic by design; the model may only raise it.
    if (button && RANK[category] === 0) category = 'on_topic';
    return { category, topic: fixedTopic ?? modelTopic };
  };
  const childAnswer = (sentences: { text: string; kind: 'describe' | 'coach' }[] | undefined, category: QuestionCategory): Sentence[] | null => {
    const limit = category === 'off_topic' ? 2 : 3;
    const list = (sentences ?? []).slice(0, limit).map((s) => ({ text: s.text.trim(), kind: s.kind }));
    if (!list.length) return null;
    return list.every((s) => checkText(s.text, post).length === 0) ? list : null;
  };
  const fallbackFor = (category: QuestionCategory): Sentence[] =>
    category === 'off_topic' ? asSentences(REDIRECT_LINES) : fallbackAnswer(template, button?.id);

  try {
    if (sensitive) yield sendCategory('sensitive', fixedTopic ?? 'other');

    const call = callStructured({
      route: 'answer',
      familyId: input.familyId,
      schema: AnswerOut,
      system: buildSystemPrompt(ctx, template),
      prompt: buildAnswerPrompt(ctx, {
        question: cleaned.text,
        currentPage: pageText(input.currentPage.text, input),
        // The next page is rewritten by a second call (route 'rewrite') after the answer is out.
        nextPage: undefined,
        sensitive,
        buttonTopic: button?.topic,
      }),
      mock: () =>
        mockAnswer(ctx, template, {
          question: cleaned.text,
          buttonId: button?.id,
          sensitive,
          nextPage: input.nextPage ? { text: pageText(input.nextPage.text, input), background: input.nextPage.background } : undefined,
        }),
      signal: ac.signal,
      maxOutputTokens: 400,
    });

    for await (const raw of call.partials) {
      const p = raw as Partial<AnswerOutT>;
      if (unsafeSeen) continue;
      if (!categorySent && 'answer' in p && p.category && p.topic) {
        const ok = AnswerOut.shape.category.safeParse(p.category).success && AnswerOut.shape.topic.safeParse(p.topic).success;
        if (ok) {
          const d = decideCategory(p.category, p.topic);
          if (d.category === 'unsafe') {
            unsafeSeen = true;
            continue;
          }
          yield sendCategory(d.category, d.topic);
        }
      }
      const cat = categorySent as { category: QuestionCategory } | null;
      if (cat && !answerSent && cat.category !== 'sensitive' && 'parentDraft' in p) {
        const s = childAnswer(p.answer as never, cat.category);
        yield { type: 'answer', sentences: s ?? fallbackFor(cat.category), source: s ? src() : 'fallback' };
        answerSent = true;
        if (answerTimer) clearTimeout(answerTimer);
        answerTimer = null;
      }
      if (cat && !answerSent && cat.category === 'sensitive' && 'parentPhrase' in p) {
        const draft = (p.parentDraft ?? '').trim();
        const okDraft = draft && checkText(draft, post).length === 0;
        yield { type: 'draft', text: okDraft ? draft : '', source: okDraft ? src() : 'fallback' };
        answerSent = true;
        if (answerTimer) clearTimeout(answerTimer);
        answerTimer = null;
      }
    }

    const res = await call.final;

    if (res.ok) {
      const out = res.object;
      const d = decideCategory(out.category, out.topic);
      if (d.category === 'unsafe' || unsafeSeen) {
        if (!categorySent) yield sendCategory('unsafe', 'safety');
        yield { type: 'done', parentPhrase: '' };
        return;
      }
      if (!categorySent) yield sendCategory(d.category, d.topic);
      const category = (categorySent as unknown as { category: QuestionCategory }).category;
      if (!answerSent) {
        if (category === 'sensitive') {
          const draft = (out.parentDraft || out.answer.map((s) => s.text).join(' ')).trim();
          const okDraft = draft && checkText(draft, post).length === 0;
          yield { type: 'draft', text: okDraft ? draft : '', source: okDraft ? src() : 'fallback' };
        } else {
          const s = childAnswer(out.answer, category);
          yield { type: 'answer', sentences: s ?? fallbackFor(category), source: s ? src() : 'fallback' };
        }
        answerSent = true;
      }
      if (category === 'on_topic' && ctx.styleMode === 'story' && input.nextPage) {
        if (answerTimer) clearTimeout(answerTimer);
        answerTimer = null;
        const nextText = pageText(input.nextPage.text, input);
        const background = input.nextPage.background;
        const rewrite = await callStructured({
          route: 'rewrite',
          familyId: input.familyId,
          schema: RewriteOut,
          system: buildSystemPrompt(ctx, template),
          prompt: buildRewritePrompt({
            question: cleaned.text,
            currentPage: pageText(input.currentPage.text, input),
            answer: out.answer.map((s) => s.text).join(' '),
            nextPage: nextText,
          }),
          mock: () => ({
            nextPage:
              mockAnswer(ctx, template, { question: cleaned.text, buttonId: button?.id, sensitive: false, nextPage: { text: nextText, background } }).nextPage ??
              { sentences: [{ text: nextText, kind: 'describe' }, { text: nextText, kind: 'describe' }], mood: 'calm', background, addresses: [] },
          }),
          signal: ac.signal,
          maxOutputTokens: 700,
        }).final;
        const parsed = rewrite.ok ? PageOut.safeParse(rewrite.object.nextPage) : null;
        if (parsed?.success) {
          const original: OutPage = { sentences: [], mood: 'calm', background: input.nextPage.background, addresses: [], source: 'fallback' };
          const checked = checkPage(parsed.data, { template, age: ctx.child.age, post, fallback: original, minWords: wordCount(nextText) });
          if (!checked.replaced) {
            yield { type: 'nextPage', page: { ...checked.page, source: src() } };
          }
        }
      }
      const phrase = out.parentPhrase.trim();
      const okPhrase = phrase && checkText(phrase, post).length === 0;
      yield {
        type: 'done',
        parentPhrase: okPhrase ? phrase : category === 'sensitive' ? SENSITIVE_PARENT_PHRASE : fallbackParentPhrase(template, d.topic),
      };
      return;
    }

    // ---- failure: template answer, the next page stays as it was ----
    if (unsafeSeen) {
      yield sendCategory('unsafe', 'safety');
      yield { type: 'done', parentPhrase: '' };
      return;
    }
    const cat = categorySent as { category: QuestionCategory; topic: Topic } | null;
    const category: QuestionCategory = cat?.category ?? (sensitive ? 'sensitive' : 'on_topic');
    const topic: Topic = cat?.topic ?? fixedTopic ?? 'other';
    if (!cat) yield sendCategory(category, topic);
    if (!answerSent) {
      if (category === 'sensitive') yield { type: 'draft', text: '', source: 'fallback' };
      else yield { type: 'answer', sentences: fallbackFor(category), source: 'fallback' };
    }
    yield { type: 'done', parentPhrase: category === 'sensitive' ? SENSITIVE_PARENT_PHRASE : fallbackParentPhrase(template, topic) };
  } finally {
    if (answerTimer) clearTimeout(answerTimer);
    clearTimeout(totalTimer);
    input.signal?.removeEventListener('abort', onAbort);
  }
}
