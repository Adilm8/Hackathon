/**
 * Shared checks of the three AI routes (docs/SPEC.md 9, 12.4, 12.5). Server-only.
 * JSON body by zod (unknown fields rejected), same-origin, per-IP limit, session from the cookie.
 */
import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { apiError, clientIp, readJson } from '../server/http';
import { allow } from '../server/ratelimit';
import { LIMITS } from './config';
import { getSession } from './deps';

export async function guard<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<{ data: z.infer<S>; familyId: string } | { error: NextResponse }> {
  if (!allow(`ip:${clientIp(req)}`, LIMITS.ipRequestsPerMinute, 60_000)) {
    return { error: apiError('rate_limited', 'Too many requests, wait a minute') };
  }
  const body = await readJson(req, schema);
  if ('error' in body) return body;
  const session = await getSession(req);
  if (!session) return { error: apiError('no_session', 'No session') };
  return { data: body.data, familyId: session.familyId };
}
