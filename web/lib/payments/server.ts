/** Helpers shared by the payment routes. Server-only. */
import 'server-only';
import type { NextRequest } from 'next/server';
import { getFamily } from '../db/families';
import { env } from '../env';
import { apiError } from '../server/http';
import { readSession, type Session } from '../server/session';
import { PaymentsUnavailable } from './gateway';

/** `NEXT_PUBLIC_BASE_URL` when set, otherwise the request origin (SPEC 10.2). */
export function baseUrl(req: NextRequest): string {
  const configured = env().baseUrl.replace(/\/+$/, '');
  if (configured) return configured;
  const host = req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto');
  if (host) return `${proto ?? 'https'}://${host}`;
  return req.nextUrl.origin;
}

/** The session of an existing family, or null. */
export async function familySession(req: NextRequest): Promise<Session | null> {
  const s = readSession(req);
  if (!s) return null;
  return (await getFamily(s.familyId)) ? s : null;
}

/** Maps provider failures to the API's error shape; never leaks keys or stack traces. */
export function paymentError(e: unknown) {
  if (e instanceof PaymentsUnavailable) return apiError('upstream_failed', e.message, 503);
  const msg = e instanceof Error && 'type' in e && typeof (e as { type: unknown }).type === 'string' ? e.message : '';
  console.warn('[payments] provider error:', msg || (e as Error)?.name || 'unknown');
  return apiError('upstream_failed', msg ? `Stripe: ${msg}` : 'The payment service did not answer. Please try again.');
}
