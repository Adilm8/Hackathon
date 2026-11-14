import { NextResponse, type NextRequest } from 'next/server';
import { CheckoutBody } from '@/lib/engine/schemas';
import { accessFor } from '@/lib/payments/access';
import { gateway } from '@/lib/payments/gateway';
import { activeSubscription, hasCapability, isSubscription, ownsEventPack } from '@/lib/payments/plans';
import { baseUrl, familySession, paymentError } from '@/lib/payments/server';
import { apiError, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';

export const dynamic = 'force-dynamic';

/** Starts a Stripe Checkout for this family (docs/SPEC.md 9, 10.2). Returns `{ url }`. */
export async function POST(req: NextRequest) {
  const body = await readJson(req, CheckoutBody);
  if ('error' in body) return body.error;
  const session = await familySession(req);
  if (!session) return apiError('no_session', 'No session');
  if (!allow(`checkout:${session.familyId}`, 10, 60_000)) return apiError('rate_limited', 'Too many attempts, wait a minute');

  const { plan, eventId, renewalConsent } = body.data;
  if (isSubscription(plan) && renewalConsent !== true) {
    return apiError('bad_request', 'Please confirm the auto-renewal terms first');
  }
  const access = await accessFor(session.familyId);
  if (plan === 'event' && hasCapability(access, 'chapters.all', eventId)) {
    return apiError('conflict', 'This big day is already unlocked');
  }
  if (plan !== 'event' && activeSubscription(access)) {
    return apiError('conflict', 'You already have Gold');
  }
  if (plan === 'upgrade' && !ownsEventPack(access)) {
    return apiError('bad_request', 'The upgrade is for Big Day Pass owners');
  }

  const base = baseUrl(req);
  const ws = session.kind === 'sample' ? '&ws=sample' : '';
  try {
    const { url } = await gateway().createCheckout({
      plan,
      eventId,
      familyId: session.familyId,
      successUrl: `${base}/paid?session_id={CHECKOUT_SESSION_ID}${ws}`,
      cancelUrl: `${base}/event/${encodeURIComponent(eventId)}/paywall?canceled=1${ws}`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return paymentError(e);
  }
}
