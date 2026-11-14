import { NextResponse, type NextRequest } from 'next/server';
import { createRestoreCode, getFamily } from '@/lib/db/families';
import { apiError, checkOrigin } from '@/lib/server/http';
import { readSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** A new restore code, shown once; replaces any earlier one. Only its hash is stored. */
export async function POST(req: NextRequest) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const session = readSession(req, 'real');
  if (!session || !(await getFamily(session.familyId))) return apiError('no_session', 'No session');
  return NextResponse.json({ code: await createRestoreCode(session.familyId) });
}
