'use client';
/**
 * Browser side of the story calls (docs/SPEC.md 8.2, 9): /api/chapter and /api/answer with
 * their deadlines and the template fallback, so a screen is never empty (A1).
 */
import type { BigEvent, ChildProfile, EventTemplate, Page, QuestionCategory, Sentence, Topic } from '@/lib/engine/types';
import { buildStoryContext, FALLBACK_COPY, fallbackAnswer, fallbackPages, fallbackParentPhrase } from './engine';
import { getWorkspace } from './workspace';

const TOPICS: Topic[] = ['pain', 'separation', 'unknown', 'strangers', 'sensory', 'safety', 'social', 'body', 'love', 'other'];

async function* ndjson(res: Response): AsyncGenerator<Record<string, unknown>> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        try {
          yield JSON.parse(line);
        } catch {
          /* skip a broken line */
        }
      }
    }
  }
  if (buf.trim()) {
    try {
      yield JSON.parse(buf);
    } catch {
      /* ignore */
    }
  }
}

function post(url: string, body: unknown, signal: AbortSignal) {
  return fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-bds-workspace': getWorkspace() },
    body: JSON.stringify(body),
    signal,
  });
}

function isPage(x: unknown): x is Omit<Page, 'id' | 'kind' | 'source'> {
  const p = x as Page;
  return !!p && Array.isArray(p.sentences) && p.sentences.length > 0 && typeof p.mood === 'string';
}

export interface ChapterResult { pages: Page[]; summary?: string; usedTechniques?: string[]; place?: string; addressed: Topic[]; source: 'llm' | 'fallback' }

/**
 * Generates chapter `index` once. `onPage` fires as soon as each page is ready, so the
 * reader can show page 1 while the rest streams in. First page within 6 s or the fallback.
 */
export async function generateChapter(
  input: { event: BigEvent; child: ChildProfile; template: EventTemplate; index: number },
  onPage: (pages: Page[]) => void,
): Promise<ChapterResult | { error: 'payment_required' }> {
  const { event, child, template, index } = input;
  const ch = event.chapters.find((c) => c.index === index)!;
  const fb = () => fallbackPages(template, ch.beats, child.styleMode, child.age, index);
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(), 6000);
  const pages: Page[] = [];
  try {
    const res = await post('/api/chapter', { eventId: event.id, context: buildStoryContext({ event, child, template, chapterIndex: index }) }, ctrl.signal);
    if (res.status === 402) return { error: 'payment_required' };
    if (!res.ok) throw new Error(String(res.status));
    let done: Record<string, unknown> | null = null;
    for await (const msg of ndjson(res)) {
      if (msg.type === 'page' && isPage(msg.page)) {
        if (pages.length === 0) {
          clearTimeout(timer);
          timer = setTimeout(() => ctrl.abort(), 25000);
        }
        const p = msg.page as Page;
        pages.push({ ...p, id: `c${index}-p${pages.length + 1}`, kind: 'story', source: p.source ?? 'llm' });
        onPage([...pages]);
      } else if (msg.type === 'done') done = msg;
    }
    clearTimeout(timer);
    if (pages.length === 0) throw new Error('empty');
    return {
      pages,
      summary: typeof done?.summary === 'string' ? done.summary : undefined,
      usedTechniques: Array.isArray(done?.usedTechniques) ? (done!.usedTechniques as string[]) : [],
      place: typeof done?.place === 'string' ? done.place : undefined,
      addressed: [...new Set(pages.flatMap((p) => p.addresses))],
      source: done?.source === 'fallback' ? 'fallback' : 'llm',
    };
  } catch {
    clearTimeout(timer);
    // Keep what streamed, complete it from the fallback.
    const rest = fb().slice(pages.length).map((p, k) => ({ ...p, id: `c${index}-p${pages.length + k + 1}` }));
    const all = [...pages, ...rest];
    onPage(all);
    return { pages: all, addressed: [...new Set(all.flatMap((p) => p.addresses))], source: pages.length ? 'llm' : 'fallback' };
  }
}

export interface AnswerResult {
  category: QuestionCategory;
  topic: Topic;
  answer: Sentence[];
  draft?: string;
  nextPage?: Omit<Page, 'id' | 'kind' | 'source'> | null;
  parentPhrase?: string;
  source: 'llm' | 'fallback';
}

/** One question: category streams first, the answer within 4 s or the fallback (4.8). */
export async function askQuestion(input: {
  event: BigEvent; child: ChildProfile; template: EventTemplate; chapter: number;
  text: string; source: 'button' | 'custom' | 'voice'; buttonId?: string;
  currentPage: Page; nextPage?: Page; questionsInChapter: number; forced?: 'sensitive';
}): Promise<AnswerResult> {
  const { template, child } = input;
  const btn = template.questionButtons.find((b) => b.id === input.buttonId);
  const fallback = (): AnswerResult => {
    if (input.forced === 'sensitive') return { category: 'sensitive', topic: btn?.topic ?? 'other', answer: [], source: 'fallback' };
    const fa = btn ? fallbackAnswer(template, input.buttonId) : [];
    if (fa.length && btn) {
      const next = input.nextPage && child.styleMode === 'story' ? rewriteLocally(input.nextPage, input.text, fa) : null;
      return { category: 'on_topic', topic: btn.topic, answer: fa, nextPage: next, parentPhrase: fallbackParentPhrase(template, btn.topic), source: 'fallback' };
    }
    return { category: 'on_topic', topic: 'other', answer: [{ text: FALLBACK_COPY.ownQuestion, kind: 'coach' }], source: 'fallback' };
  };
  const text = (p: Page) => p.sentences.map((s) => s.text).join(' ');
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await post(
      '/api/answer',
      {
        context: buildStoryContext({ event: input.event, child, template, chapterIndex: input.chapter }),
        question: { text: input.text, source: input.source, ...(input.buttonId ? { buttonId: input.buttonId } : {}) },
        currentPage: { id: input.currentPage.id, text: text(input.currentPage) },
        ...(input.nextPage ? { nextPage: { id: input.nextPage.id, text: text(input.nextPage), background: input.nextPage.background } } : {}),
        questionsInChapter: input.questionsInChapter,
      },
      ctrl.signal,
    );
    if (!res.ok) throw new Error(String(res.status));
    const out: Partial<AnswerResult> = { answer: [], source: 'llm' };
    for await (const m of ndjson(res)) {
      if (m.type === 'category') {
        // A later category line only ever raises it (sensitive -> unsafe): the last one wins.
        out.category = m.category as QuestionCategory;
        out.topic = TOPICS.includes(m.topic as Topic) ? (m.topic as Topic) : 'other';
        if (out.category === 'unsafe') break;
      } else if (m.type === 'answer' && Array.isArray(m.sentences)) {
        out.answer = m.sentences as Sentence[];
        if (m.source === 'fallback') out.source = 'fallback';
        clearTimeout(timer);
        timer = setTimeout(() => ctrl.abort(), 12000);
      } else if (m.type === 'draft') {
        out.draft = String(m.text ?? '');
        clearTimeout(timer);
      } else if (m.type === 'nextPage' && isPage(m.page)) out.nextPage = m.page as AnswerResult['nextPage'];
      else if (m.type === 'done') out.parentPhrase = typeof m.parentPhrase === 'string' ? m.parentPhrase : undefined;
    }
    clearTimeout(timer);
    if (!out.category) throw new Error('no category');
    if (input.forced === 'sensitive' && out.category !== 'unsafe') out.category = 'sensitive';
    if (btn) out.topic = btn.topic; // button topics come from the template (5.4)
    if ((out.category === 'on_topic' || out.category === 'off_topic') && !out.answer?.length) {
      const f = fallback();
      out.answer = f.answer;
    }
    return out as AnswerResult;
  } catch {
    clearTimeout(timer);
    return fallback();
  }
}

/** Fallback rewrite of the next page for a button question: the story refers to the question (4.8). */
function rewriteLocally(next: Page, question: string, answer: Sentence[]): Omit<Page, 'id' | 'kind' | 'source'> {
  const q = question.replace(/[?!.]+$/, '');
  return {
    sentences: [
      { text: `[[CHILD]] remembered the question: "${q}?"`, kind: 'describe' },
      { text: answer[0].text, kind: 'describe' },
      ...next.sentences.slice(0, Math.max(2, next.sentences.length - 1)),
    ],
    mood: next.mood,
    background: next.background,
    addresses: next.addresses,
  };
}

