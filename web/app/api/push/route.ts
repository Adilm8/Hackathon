import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getFamily } from '@/lib/db/families';
import { deletePushSubscription, savePushSubscription } from '@/lib/db/push';
import { env } from '@/lib/env';
import { MAX_REMINDERS } from '@/lib/push/reminders';
import { apiError, checkOrigin, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';
import { readSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

const Endpoint = z.url().max(1000).refine((u) => u.startsWith('https://'), 'https only');

const ReminderSchema = z.strictObject({
  id: z.string().min(1).max(120),
  kind: z.enum(['chapter', 'day', 'checkin']),
  at: z.number().int().positive(),
  title: z.string().min(1).max(80),
  body: z.string().max(160),
  url: z.string().max(300).startsWith('/'),
});

const PutBody = z.object({ endpoint: Endpoint, reminders: z.array(ReminderSchema).max(MAX_REMINDERS) });
const DeleteBody = z.object({ endpoint: Endpoint });

/** The public key the browser subscribes with; null = push is not set up on this server. */
export async function GET() {
  const { publicKey, privateKey } = env().vapid;
  return NextResponse.json({ publicKey: publicKey && privateKey ? publicKey : null });
}

/** Saves this browser's subscription and the reminder times (computed in the browser). */
export async function PUT(req: NextRequest) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const session = readSession(req);
  if (!session || !(await getFamily(session.familyId))) return apiError('no_session', 'No session');
  if (!allow(`push:${session.familyId}`, 30, 60_000)) return apiError('rate_limited', 'Too many requests');
  const body = await readJson(req, PutBody, 64 * 1024);
  if ('error' in body) return body.error;
  await savePushSubscription(session.familyId, body.data.endpoint, body.data.reminders);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const body = await readJson(req, DeleteBody, 4 * 1024);
  if ('error' in body) return body.error;
  await deletePushSubscription(body.data.endpoint);
  return NextResponse.json({ ok: true });
}
