import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { env } from '@/lib/env';
import { applySubscription, recordCheckout } from '@/lib/payments/access';
import { gateway, subscriptionInfo, webhookVerifier } from '@/lib/payments/gateway';
import { apiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/**
 * Stripe webhook (docs/SPEC.md 9, 10.4). Active only when STRIPE_WEBHOOK_SECRET is set.
 * Events: checkout.session.completed (access even if the parent closed the tab),
 * customer.subscription.updated / deleted (renewal, cancellation, end).
 */
export async function POST(req: NextRequest) {
  const secret = env().stripe.webhookSecret;
  if (!secret) return apiError('not_found', 'Webhook is not configured');
  const signature = req.headers.get('stripe-signature');
  if (!signature) return apiError('bad_request', 'Missing signature');
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = webhookVerifier()(payload, signature, secret);
  } catch {
    return apiError('bad_request', 'Invalid signature');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        // Re-read through the gateway so the subscription period comes expanded.
        const info = await gateway().getCheckout(event.data.object.id);
        if (info) await recordCheckout(info, null);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(subscriptionInfo(event.data.object));
        break;
      default:
        break;
    }
  } catch (e) {
    console.warn('[payments] webhook handling failed:', event.type, (e as Error).message);
    return apiError('upstream_failed', 'Try again later');
  }
  return NextResponse.json({ received: true });
}
