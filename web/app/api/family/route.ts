import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createFamily, deleteFamily, getFamily, touchFamily } from '@/lib/db/families';
import { apiError, checkOrigin, clientIp, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';
import { clearSessionCookie, readSession, setSessionCookie, workspaceOf } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Creates the guest family, or returns the existing one when the cookie is valid (idempotent). */
export async function POST(req: NextRequest) {
  const body = await readJson(req, z.strictObject({}));
  if ('error' in body) return body.error;
  const existing = readSession(req, 'real');
  if (existing && (await getFamily(existing.familyId))) {
    await touchFamily(existing.familyId);
    const res = NextResponse.json({ familyId: existing.familyId });
    setSessionCookie(res, existing);
    return res;
  }
  if (!allow(`family:${clientIp(req)}`, 20, 60_000)) return apiError('rate_limited', 'Too many requests');
  const fam = await createFamily('real');
  const res = NextResponse.json({ familyId: fam.id });
  setSessionCookie(res, { familyId: fam.id, kind: 'real' });
  return res;
}

/** Deletes the family of the active workspace and everything linked to it. */
export async function DELETE(req: NextRequest) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const ws = workspaceOf(req);
  const session = readSession(req, ws);
  if (!session) return apiError('no_session', 'No session');
  await deleteFamily(session.familyId);
  const res = new NextResponse(null, { status: 204 });
  clearSessionCookie(res, ws);
  return res;
}
