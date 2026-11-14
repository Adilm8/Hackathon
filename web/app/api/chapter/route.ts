import type { NextRequest } from 'next/server';
import { ChapterBody } from '@/lib/engine/schemas';
import { generateChapter } from '@/lib/llm/chapter';
import { getTemplate, hasEventAccess } from '@/lib/llm/deps';
import { ndjson } from '@/lib/llm/ndjson';
import { guard } from '@/lib/llm/route-guard';
import { apiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Streams the pages of one chapter (docs/SPEC.md 9). Chapter 1 is open; chapters 2+ need access (10.4). */
export async function POST(req: NextRequest) {
  const g = await guard(req, ChapterBody);
  if ('error' in g) return g.error;
  const { eventId, context } = g.data;
  if (context.chapter.index > 1 && !(await hasEventAccess(g.familyId, eventId))) {
    return apiError('payment_required', 'This chapter needs the Event Pack or the Family Year');
  }
  const template = getTemplate(context.event.type);
  return ndjson(generateChapter({ ctx: context, template, familyId: g.familyId, signal: req.signal }));
}
