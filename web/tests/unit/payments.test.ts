import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { checkoutInfo, subscriptionInfo } from '@/lib/payments/gateway';
import { rowStatus } from '@/lib/payments/access';
import { activeSubscription, formatUsd, GOLD_EXTRAS, hasCapability, hasGoldExtra, LEVELS, ownsEventPack, PLANS, renewalTerms } from '@/lib/payments/plans';
import { allowedVoice } from '@/lib/speech/cloud';
import { isGoldVoice } from '@/lib/tts/server';
import { timelineSteps } from '@/components/paywall/PlanTimeline';
import type { Entitlement } from '@/lib/engine/types';

const NOW = Date.UTC(2026, 10, 14, 12);
const DAY = 86_400_000;

describe('plans', () => {
  it('formats prices', () => {
    expect(formatUsd(999)).toBe('$9.99');
    expect(formatUsd(4900)).toBe('$49');
    expect(formatUsd(3900)).toBe('$39');
  });

  it('states the auto-renewal terms of SPEC 10.5 word for word', () => {
    expect(renewalTerms('year')).toBe(
      "Renews automatically at $49 per year until you cancel. We'll remind you 30 days before renewal. Cancel anytime in Settings.",
    );
    expect(renewalTerms('month')).toContain('$7.99 per month');
    expect(renewalTerms('upgrade')).toMatch(/^\$39 today for the first year, then it renews automatically at \$49 per year/);
    expect(renewalTerms('event')).toMatch(/Nothing renews/);
  });

  it('applies the access rule of SPEC 5.6', () => {
    const pass: Entitlement = { plan: 'event', eventId: 'e1', expiresAt: NOW + DAY, renews: false };
    const gold: Entitlement = { plan: 'year', expiresAt: NOW + 300 * DAY, renews: true };
    const old: Entitlement = { plan: 'month', expiresAt: NOW - 1, renews: false };
    expect(hasCapability([pass], 'chapters.all', 'e1', NOW)).toBe(true);
    expect(hasCapability([pass], 'daycard', 'e2', NOW)).toBe(false);
    expect(hasCapability([gold], 'daycard', 'any', NOW)).toBe(true);
    expect(hasCapability([old], 'chapters.all', 'e1', NOW)).toBe(false);
    expect(activeSubscription([pass, old, gold], NOW)).toBe(gold);
    expect(ownsEventPack([pass], NOW)).toBe(true);
    expect(ownsEventPack([gold], NOW)).toBe(false);
  });

  it('keeps three levels: Gold extras only with a subscription (SPEC 10.1)', () => {
    const pass: Entitlement = { plan: 'event', eventId: 'e1', expiresAt: NOW + DAY, renews: false };
    const gold: Entitlement = { plan: 'month', expiresAt: NOW + 20 * DAY, renews: true };
    for (const cap of GOLD_EXTRAS) {
      expect(hasGoldExtra([pass], cap, NOW)).toBe(false);
      expect(hasGoldExtra([gold], cap, NOW)).toBe(true);
      expect(hasGoldExtra([], cap, NOW)).toBe(false);
    }
    expect(PLANS.upgrade.capabilities).toEqual(PLANS.year.capabilities);
    expect(PLANS.month.capabilities).toEqual(PLANS.year.capabilities);
    expect(Object.keys(LEVELS[0])).toEqual(['feature', 'free', 'pass', 'gold']);
  });

  it('marks ElevenLabs voices as Gold and falls back without Gold', () => {
    expect(isGoldVoice('elevenlabs/eleven-v3@pFZP5JQG7iQjIQuC4Bku', 'hexgrad/kokoro-82m')).toBe(true);
    expect(isGoldVoice('af_bella', 'hexgrad/kokoro-82m')).toBe(false);
    expect(isGoldVoice('fish-audio/s2.1-pro-free:free@', 'hexgrad/kokoro-82m')).toBe(false);
    const voices = [{ id: 'af_bella', label: 'Owl' }, { id: 'eleven', label: 'Moon', gold: true }];
    const none = { premium: false, clone: false };
    expect(allowedVoice('eleven', voices, none)).toBeNull();
    expect(allowedVoice('af_bella', voices, none)).toBe('af_bella');
    expect(allowedVoice('parent:abc', voices, none)).toBeNull();
    expect(allowedVoice('parent:abc', voices, { premium: true, clone: true })).toBe('parent:abc');
    expect(allowedVoice('eleven', voices, { premium: true, clone: true })).toBe('eleven');
  });
});

describe('timeline with real dates', () => {
  it('yearly: today, reminder 30 days before, renewal', () => {
    const s = timelineSteps('year', '2026-11-14');
    expect(s.map((x) => x.when)).toEqual(['Today, Nov 14', 'Fri, Oct 15, 2027', 'Sun, Nov 14, 2027']);
    expect(s[2].title).toBe('Renews at $49');
  });
  it('Big Day Pass: 90 days, never renews', () => {
    const s = timelineSteps('event', '2026-11-14');
    expect(s[0].title).toBe('$9.99, one time');
    expect(s[1].when).toBe('Fri, Feb 12, 2027');
    expect(s[2].title).toBe('No renewal');
  });
});

describe('Stripe object mapping', () => {
  const sub = {
    id: 'sub_1',
    status: 'active',
    cancel_at_period_end: false,
    cancel_at: null,
    items: { data: [{ current_period_end: 1_800_000_000 }] },
  } as unknown as Stripe.Subscription;

  it('reads the period from the subscription items (API 2025-03-31 and later)', () => {
    expect(subscriptionInfo(sub)).toEqual({ id: 'sub_1', status: 'active', periodEnd: 1_800_000_000_000, cancelAtPeriodEnd: false });
    const legacy = { ...sub, items: { data: [] }, current_period_end: 1_700_000_000 } as unknown as Stripe.Subscription;
    expect(subscriptionInfo(legacy).periodEnd).toBe(1_700_000_000_000);
  });

  it('maps a paid Checkout Session with an expanded subscription', () => {
    const s = {
      id: 'cs_test_1',
      status: 'complete',
      payment_status: 'paid',
      metadata: { plan: 'year', eventId: 'e1', familyId: 'fam' },
      client_reference_id: 'fam',
      customer: 'cus_1',
      subscription: sub,
    } as unknown as Stripe.Checkout.Session;
    expect(checkoutInfo(s)).toEqual({
      id: 'cs_test_1',
      paid: true,
      familyId: 'fam',
      plan: 'year',
      eventId: 'e1',
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      periodEnd: 1_800_000_000_000,
    });
  });

  it('treats an open or unpaid session as not paid and ignores unknown plans', () => {
    const s = { id: 'cs_test_2', status: 'open', payment_status: 'unpaid', metadata: { plan: 'gold' } } as unknown as Stripe.Checkout.Session;
    const info = checkoutInfo(s);
    expect(info.paid).toBe(false);
    expect(info.plan).toBeUndefined();
  });

  it('maps subscription states to row states', () => {
    const base = { id: 's', periodEnd: 1, cancelAtPeriodEnd: false };
    expect(rowStatus({ ...base, status: 'active' })).toBe('active');
    expect(rowStatus({ ...base, status: 'active', cancelAtPeriodEnd: true })).toBe('canceled');
    expect(rowStatus({ ...base, status: 'past_due' })).toBe('active');
    expect(rowStatus({ ...base, status: 'canceled' })).toBe('expired');
  });
});
