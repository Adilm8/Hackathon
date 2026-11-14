/** Small helpers shared by route handlers (docs/SPEC.md 9, 12.5). Server-only. */
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';

export type ErrorCode =
  | 'bad_request' | 'no_session' | 'payment_required' | 'forbidden' | 'not_found' | 'conflict' | 'rate_limited' | 'upstream_failed';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400, no_session: 401, payment_required: 402, forbidden: 403,
  not_found: 404, conflict: 409, rate_limited: 429, upstream_failed: 502,
};

export function apiError(code: ErrorCode, message: string, status?: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: status ?? STATUS[code] });
}

/** State-changing routes accept only JSON from the app's own origin (12.5). */
export function checkOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    let ok = false;
    try {
      ok = !!host && new URL(origin).host === host;
    } catch {
      ok = false;
    }
    if (!ok) return apiError('forbidden', 'Cross-origin request refused');
  }
  return null;
}

export const MAX_BODY_BYTES = 512 * 1024;

/** Parses and validates a JSON body. Returns the data or an error response. */
export async function readJson<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
  maxBytes = MAX_BODY_BYTES,
): Promise<{ data: z.infer<S> } | { error: NextResponse }> {
  const bad = checkOrigin(req);
  if (bad) return { error: bad };
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
    return { error: apiError('bad_request', 'Content-Type must be application/json') };
  }
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) {
    return { error: apiError('bad_request', 'Body too large', 413) };
  }
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    return { error: apiError('bad_request', 'Invalid JSON') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: apiError('bad_request', parsed.error.issues[0]?.message ?? 'Invalid body') };
  }
  return { data: parsed.data };
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
}
