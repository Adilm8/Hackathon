import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { customerOf } from '@/lib/payments/access';
import { gateway } from '@/lib/payments/gateway';
import { baseUrl, familySession, paymentError } from '@/lib/payments/server';
import { apiError, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';

export const dynamic = 'force-dynamic';

/** Stripe customer portal for the family's subscription: cancel, card, invoices (docs/SPEC.md 10.5). */
export async function POST(req: NextRequest) {
  const body = await readJson(req, z.strictObject({}));
  if ('error' in body) return body.error;
  const session = await familySession(req);
  if (!session) return apiError('no_session', 'No session');
  if (!allow(`portal:${session.familyId}`, 10, 60_000)) return apiError('rate_limited', 'Too many attempts, wait a minute');
  const customer = await customerOf(session.familyId);
  if (!customer) return apiError('not_found', 'There is no subscription to manage.');
  try {
    const ws = session.kind === 'sample' ? '?ws=sample' : '';
    const url = await gateway().createPortal(customer, `${baseUrl(req)}/settings${ws}`);
    return NextResponse.json({ url });
  } catch (e) {
    return paymentError(e);
  }
}
