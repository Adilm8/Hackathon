import { NextResponse, type NextRequest } from 'next/server';
import { RitualBody } from '@/lib/engine/schemas';
import { getTemplate, hasEventAccess } from '@/lib/llm/deps';
import { ritualCard } from '@/lib/llm/ritual';
import { guard } from '@/lib/llm/route-guard';
import { apiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The event-day card (docs/SPEC.md 9). Needs access (10.4). */
export async function POST(req: NextRequest) {
  const g = await guard(req, RitualBody);
  if ('error' in g) return g.error;
  const { eventId, context, topTopics } = g.data;
  if (!(await hasEventAccess(g.familyId, eventId))) {
    return apiError('payment_required', 'The day card needs the Event Pack or the Family Year');
  }
  const template = getTemplate(context.event.type);
  const card = await ritualCard({ ctx: context, template, topTopics, familyId: g.familyId, signal: req.signal });
  return NextResponse.json(card);
}
