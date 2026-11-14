import type { NextRequest } from 'next/server';
import { buildIcs, decodeIcsPayload } from '@/lib/engine/ics';
import { baseUrl } from '@/lib/payments/server';
import { apiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Calendar file of a plan (docs/SPEC.md 9 GET /api/ics, 11.8). No session, no name inside. */
export async function GET(req: NextRequest) {
  const data = decodeIcsPayload(req.nextUrl.searchParams.get('d'));
  if (!data) return apiError('bad_request', 'Invalid calendar link');
  let text: string;
  try {
    text = buildIcs(data, { baseUrl: baseUrl(req) });
  } catch {
    return apiError('bad_request', 'Nothing left to add to the calendar');
  }
  return new Response(text, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="big-day-stories.ics"',
      'cache-control': 'no-store',
    },
  });
}
