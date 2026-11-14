import { NextResponse, type NextRequest } from 'next/server';
import { VerifyBody } from '@/lib/engine/schemas';
import { accessFor, recordCheckout } from '@/lib/payments/access';
import { gateway } from '@/lib/payments/gateway';
import { familySession, paymentError } from '@/lib/payments/server';
import { apiError, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';

export const dynamic = 'force-dynamic';

/**
 * Return from Stripe (docs/SPEC.md 9, 10.2): checks the Checkout Session with Stripe,
 * requires it to be paid and to belong to this family, writes the access row once.
 * Response: `{ entitlements, purchase: { plan, eventId? } }`.
 */
export async function POST(req: NextRequest) {
  const body = await readJson(req, VerifyBody);
  if ('error' in body) return body.error;
  const session = await familySession(req);
  if (!session) return apiError('no_session', 'No session');
  if (!allow(`verify:${session.familyId}`, 20, 60_000)) return apiError('rate_limited', 'Too many attempts, wait a minute');

  try {
    const info = await gateway().getCheckout(body.data.sessionId);
    if (!info) return apiError('not_found', 'We could not find this payment.');
    const result = await recordCheckout(info, session.familyId);
    if (!result.ok) {
      if (result.reason === 'wrong_family') return apiError('forbidden', 'This payment belongs to another family.');
      if (result.reason === 'not_paid') return apiError('payment_required', 'The payment is not complete yet. Nothing was charged.');
      return apiError('bad_request', 'This payment is missing its details.');
    }
    const entitlements = await accessFor(session.familyId);
    return NextResponse.json({
      entitlements,
      purchase: { plan: result.plan, ...(result.eventId ? { eventId: result.eventId } : {}) },
    });
  } catch (e) {
    return paymentError(e);
  }
}
