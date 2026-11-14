import { NextResponse, type NextRequest } from 'next/server';
import { findFamilyByRestoreCode, touchFamily } from '@/lib/db/families';
import { listEntitlements } from '@/lib/db/entitlements';
import { getState } from '@/lib/db/state';
import { RestoreBody } from '@/lib/engine/schemas';
import { apiError, clientIp, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';
import { setSessionCookie } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** "Use on another device": the code sets the session cookie of that family. 5 attempts per minute per IP. */
export async function POST(req: NextRequest) {
  if (!allow(`restore:${clientIp(req)}`, 5, 60_000)) return apiError('rate_limited', 'Too many attempts, wait a minute');
  const body = await readJson(req, RestoreBody);
  if ('error' in body) return body.error;
  const fam = await findFamilyByRestoreCode(body.data.code);
  if (!fam) return apiError('not_found', 'Unknown code');
  await touchFamily(fam.id);
  const [state, entitlements] = await Promise.all([getState(fam.id), listEntitlements(fam.id)]);
  const res = NextResponse.json({ ...state, entitlements });
  setSessionCookie(res, { familyId: fam.id, kind: 'real' });
  return res;
}
