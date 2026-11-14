import { NextResponse, type NextRequest } from 'next/server';
import { grantDemoAccess, listEntitlements, resetSampleAccess } from '@/lib/db/entitlements';
import { getFamily } from '@/lib/db/families';
import { SampleAccessBody } from '@/lib/engine/schemas';
import { env } from '@/lib/env';
import { apiError, readJson } from '@/lib/server/http';
import { readSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Jury demo access (docs/SPEC.md 4.3, 9, 10.4a). `grant` writes a 24-hour `demo` row of plan
 * `year`; `reset` removes every access row. Sample families only, only while DEMO_MODE is on.
 */
export async function POST(req: NextRequest) {
  const body = await readJson(req, SampleAccessBody);
  if ('error' in body) return body.error;
  const s = readSession(req, 'sample');
  if (!s || s.kind !== 'sample') return apiError('forbidden', 'Demo access is only for the sample');
  if (!env().demoMode) return apiError('forbidden', 'Demo mode is off');
  const r = body.data.action === 'grant' ? await grantDemoAccess(s.familyId) : await resetSampleAccess(s.familyId);
  if (r !== 'ok') return apiError('forbidden', 'Demo access is only for the sample');
  return NextResponse.json({ entitlements: await listEntitlements(s.familyId) });
}

/** Tells the Demo bar whether the access group exists (an addition to SPEC 9: `{ demoMode }`). */
export async function GET(req: NextRequest) {
  const s = readSession(req, 'sample');
  const isSample = !!s && !!(await getFamily(s.familyId));
  return NextResponse.json({ demoMode: env().demoMode && isSample });
}
