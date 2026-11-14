import type { NextRequest } from 'next/server';
import { AnswerBody } from '@/lib/engine/schemas';
import { answerQuestion, BlankQuestion } from '@/lib/llm/answer';
import { LIMITS } from '@/lib/llm/config';
import { childNameOf, getTemplate } from '@/lib/llm/deps';
import { ndjson } from '@/lib/llm/ndjson';
import { guard } from '@/lib/llm/route-guard';
import { BLANK_QUESTION_HINT } from '@/lib/safety/messages';
import { apiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Classifies and answers a child's question as a stream (docs/SPEC.md 9). Never logs the question. */
export async function POST(req: NextRequest) {
  const g = await guard(req, AnswerBody);
  if ('error' in g) return g.error;
  const body = g.data;
  if (body.questionsInChapter >= LIMITS.questionsPerChapter) {
    return apiError('bad_request', 'Three questions per chapter');
  }
  const template = getTemplate(body.context.event.type);
  const child = await childNameOf(g.familyId);
  const events = answerQuestion({
    ctx: body.context,
    template,
    familyId: g.familyId,
    question: body.question,
    currentPage: body.currentPage,
    nextPage: body.nextPage,
    childName: child.name,
    pronunciation: child.pronunciation,
    signal: req.signal,
  });
  try {
    const first = await events.next();
    return ndjson(events, first);
  } catch (e) {
    if (e instanceof BlankQuestion) return apiError('bad_request', BLANK_QUESTION_HINT);
    throw e;
  }
}
