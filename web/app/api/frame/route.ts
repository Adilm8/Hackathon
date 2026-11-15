import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/llm/route-guard';
import { env } from '@/lib/env';
import { EVENT_TYPES } from '@/lib/engine/templates';
import { framePrompt, FRAME_MAX_CHARS } from '@/lib/frames/prompt';
import { drawFrame } from '@/lib/frames/server';
import { precheck } from '@/lib/safety/filters';
import { apiError } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.strictObject({
  sentences: z.array(z.string().trim().min(1).max(FRAME_MAX_CHARS)).min(1).max(8),
  eventType: z.enum(EVENT_TYPES as unknown as [string, ...string[]]),
});

/** Whether story frames are switched on (cartoon mode asks once). */
export function GET() {
  return NextResponse.json({ enabled: env().frames.enabled });
}

/** A picture for one page's words (webp). Never logs the text. */
export async function POST(req: NextRequest) {
  if (!env().frames.enabled) return apiError('not_found', 'Story frames are off');
  const g = await guard(req, Body);
  if ('error' in g) return g.error;
  // A chapter is up to about 12 pages; 30 a minute leaves room for a second chapter.
  if (!allow(`frame:${g.familyId}`, 30, 60_000)) return apiError('rate_limited', 'Too many requests, wait a minute');
  // Story text comes from our templates or the checked model; anything the filters flag gets no picture.
  if (precheck(g.data.sentences.join(' ')).category === 'unsafe') return apiError('upstream_failed', 'No picture for this page', 422);
  const r = await drawFrame(framePrompt(g.data.sentences, g.data.eventType as never), g.familyId);
  if ('error' in r) return apiError('upstream_failed', r.error === 'budget' ? 'Daily picture budget reached' : 'Picture unavailable', 503);
  return new NextResponse(new Uint8Array(r.image), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=86400', 'X-Cache': r.cached ? 'hit' : 'miss' },
  });
}
