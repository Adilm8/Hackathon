import { NextResponse, type NextRequest } from 'next/server';
import { lastPushReminder } from '@/lib/db/push';

export const dynamic = 'force-dynamic';

/** What the service worker shows for an empty push: the reminder just sent to this subscription. */
export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get('endpoint') ?? '';
  if (!endpoint.startsWith('https://') || endpoint.length > 1000) return NextResponse.json({ reminder: null });
  const last = await lastPushReminder(endpoint);
  return NextResponse.json({ reminder: last ? { title: last.title, body: last.body, url: last.url, id: last.id } : null });
}
