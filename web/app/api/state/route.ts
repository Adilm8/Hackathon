import { NextResponse, type NextRequest } from 'next/server';
import { getFamily, touchFamily } from '@/lib/db/families';
import { listEntitlements } from '@/lib/db/entitlements';
import { getState, putState } from '@/lib/db/state';
import { StatePutBody } from '@/lib/engine/schemas';
import { apiError, readJson } from '@/lib/server/http';
import { readSession, setSessionCookie } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

async function sessionFamily(req: NextRequest) {
  const session = readSession(req);
  if (!session) return null;
  return (await getFamily(session.familyId)) ? session : null;
}

export async function GET(req: NextRequest) {
  const session = await sessionFamily(req);
  if (!session) return apiError('no_session', 'No session');
  const [state, entitlements] = await Promise.all([getState(session.familyId), listEntitlements(session.familyId)]);
  await touchFamily(session.familyId);
  const res = NextResponse.json({ ...state, entitlements });
  setSessionCookie(res, session);
  return res;
}

export async function PUT(req: NextRequest) {
  const session = await sessionFamily(req);
  if (!session) return apiError('no_session', 'No session');
  const body = await readJson(req, StatePutBody);
  if ('error' in body) return body.error;
  const result = await putState(session.familyId, body.data.doc, body.data.baseVersion);
  if (result.ok) {
    await touchFamily(session.familyId);
    return NextResponse.json({ version: result.version });
  }
  return NextResponse.json(
    { error: { code: 'conflict', message: 'The server copy is newer' }, doc: result.current.doc, version: result.current.version },
    { status: 409 },
  );
}
