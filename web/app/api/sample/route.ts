import { NextResponse, type NextRequest } from 'next/server';
import { createFamily, deleteFamily } from '@/lib/db/families';
import { replaceState } from '@/lib/db/state';
import { buildSampleFamily as buildSampleDoc } from '@/lib/engine/sample';
import { SampleBody } from '@/lib/engine/schemas';
import { apiError, clientIp, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';
import { readSession, setSessionCookie } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Creates a fresh seeded sample family for this browser (SPEC 4.3); an earlier sample of the browser is dropped. */
export async function POST(req: NextRequest) {
  const body = await readJson(req, SampleBody);
  if ('error' in body) return body.error;
  if (!allow(`sample:${clientIp(req)}`, 10, 60_000)) return apiError('rate_limited', 'Too many samples, wait a minute');
  const previous = readSession(req, 'sample');
  if (previous) await deleteFamily(previous.familyId);
  const fam = await createFamily('sample');
  const doc = buildSampleDoc(body.data.today);
  const version = await replaceState(fam.id, doc);
  const res = NextResponse.json({ doc, version, entitlements: [] });
  setSessionCookie(res, { familyId: fam.id, kind: 'sample' });
  return res;
}
