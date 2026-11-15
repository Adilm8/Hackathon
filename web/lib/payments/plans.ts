/**
 * Plans and prices (docs/SPEC.md 10.1, 17.2). Shared by the server and the paywall.
 * Prices are sent to Stripe as inline `price_data`, so nothing has to be created
 * in the Stripe dashboard.
 *
 * Three levels (SPEC 10.1, 17.2): Free, Big Day Pass (one event, once) and Gold (every event plus
 * the premium extras, yearly or monthly);
 * the stored plan ids stay the contract ids `event | year | month` (SPEC 6.1).
 * Screens ask for a capability, never for a level name, so levels can be renamed later.
 */
import type { Entitlement, PlanId } from '../engine/types';

/** What the browser may ask for at checkout. `upgrade` buys a `year` plan with a discount. */
export type CheckoutPlan = PlanId | 'upgrade';
export const CHECKOUT_PLANS = ['event', 'year', 'month', 'upgrade'] as const satisfies readonly CheckoutPlan[];

/**
 * What a level unlocks. `chapters.all` and `daycard` are per event for a Big Day Pass;
 * the Gold extras below are family-wide and come only with a subscription.
 */
export type Capability = 'chapters.all' | 'daycard' | 'scenes.pictures' | 'scenes.cartoon' | 'voice.premium' | 'voice.clone';

/** Gold-only extras: they cost us per use (premium voice, cloning) or are the richest look. */
export const GOLD_EXTRAS = ['scenes.pictures', 'scenes.cartoon', 'voice.premium', 'voice.clone'] as const satisfies readonly Capability[];
const GOLD: Capability[] = ['chapters.all', 'daycard', ...GOLD_EXTRAS];

export interface PlanInfo {
  id: CheckoutPlan;
  /** The entitlement this purchase writes. */
  grants: PlanId;
  name: string;
  /** Price in cents charged today. */
  amountCents: number;
  /** Price in cents of every later renewal (subscriptions only). */
  renewalCents?: number;
  mode: 'payment' | 'subscription';
  interval?: 'year' | 'month';
  /** Event Pack access length in days. */
  accessDays?: number;
  /**
   * Days before a renewal the reminder goes out (SPEC 10.5). California's
   * auto-renewal law asks for a notice 15 to 45 days before a yearly renewal.
   */
  reminderDays?: number;
  headline: string;
  perks: string[];
  capabilities: Capability[];
}

export const EVENT_PACK_DAYS = 90;
export const UPGRADE_DISCOUNT_CENTS = 1000;

export const PLANS: Record<CheckoutPlan, PlanInfo> = {
  event: {
    id: 'event',
    grants: 'event',
    name: 'Big Day Pass',
    amountCents: 999,
    mode: 'payment',
    accessDays: EVENT_PACK_DAYS,
    headline: 'The whole story for one big day',
    perks: [
      'Every chapter of this story',
      'The event-day card with a printable PDF',
      'One payment. No subscription, nothing renews',
    ],
    capabilities: ['chapters.all', 'daycard'],
  },
  year: {
    id: 'year',
    grants: 'year',
    name: 'Gold',
    amountCents: 4900,
    renewalCents: 4900,
    mode: 'subscription',
    interval: 'year',
    reminderDays: 30,
    headline: 'Ready for every big day',
    perks: [
      'Every chapter of every big day for 12 months',
      'Event-day cards with printable PDFs',
      'Painted pictures and Cartoon mode',
      'Moon Storyteller voice and stories in your own voice',
      'Cancel anytime in Settings',
    ],
    capabilities: GOLD,
  },
  month: {
    id: 'month',
    grants: 'month',
    name: 'Gold monthly',
    amountCents: 799,
    renewalCents: 799,
    mode: 'subscription',
    interval: 'month',
    headline: 'Ready for every big day',
    perks: ['Everything in Gold, paid month by month'],
    capabilities: GOLD,
  },
  upgrade: {
    id: 'upgrade',
    grants: 'year',
    name: 'Gold',
    amountCents: 4900 - UPGRADE_DISCOUNT_CENTS,
    renewalCents: 4900,
    mode: 'subscription',
    interval: 'year',
    reminderDays: 30,
    headline: 'Add $39 and get the full year',
    perks: ['Every big day for 12 months', 'Painted pictures, Cartoon mode and premium voices', 'Your Big Day Pass counts toward it'],
    capabilities: GOLD,
  },
};

export function isSubscription(plan: CheckoutPlan): boolean {
  return PLANS[plan].mode === 'subscription';
}

/** "$9.99", "$49". */
export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** Auto-renewal terms shown next to every plan (SPEC 10.5). */
export function renewalTerms(plan: CheckoutPlan): string {
  const p = PLANS[plan];
  if (p.mode !== 'subscription') return 'One payment. Nothing renews and you will never be charged again.';
  const price = formatUsd(p.renewalCents ?? p.amountCents);
  const per = p.interval === 'year' ? 'per year' : 'per month';
  const first = plan === 'upgrade' ? `${formatUsd(p.amountCents)} today for the first year, then it renews` : 'Renews';
  const reminder = p.reminderDays ? ` We'll remind you ${p.reminderDays} days before renewal.` : '';
  return `${first} automatically at ${price} ${per} until you cancel.${reminder} Cancel anytime in Settings.`;
}

/** Does a family's access include a capability for this event (SPEC 5.6). */
export function hasCapability(list: Entitlement[], cap: Capability, eventId: string, now = Date.now()): boolean {
  return list.some((e) => {
    if (e.expiresAt <= now) return false;
    if (!PLANS[e.plan].capabilities.includes(cap)) return false;
    return e.plan === 'year' || e.plan === 'month' || e.eventId === eventId;
  });
}

/** A family-wide Gold extra (pictures, Cartoon mode, premium voice, voice clone). */
export function hasGoldExtra(list: Entitlement[], cap: (typeof GOLD_EXTRAS)[number], now = Date.now()): boolean {
  return hasCapability(list, cap, '', now);
}

/** The three levels side by side, for the paywall comparison and the pitch (SPEC 10.1). */
export const LEVELS: { feature: string; free: string; pass: string; gold: string }[] = [
  { feature: 'Chapter 1 of every big day, questions, parent panel, Parent check', free: 'yes', pass: 'yes', gold: 'yes' },
  { feature: 'Story options, genres, place photos, social story style', free: 'yes', pass: 'yes', gold: 'yes' },
  { feature: 'Calendar, check-in, badges, achievements', free: 'yes', pass: 'yes', gold: 'yes' },
  { feature: 'Read aloud: device voice, Storyteller voices, family recordings', free: 'yes', pass: 'yes', gold: 'yes' },
  { feature: 'Chapters 2 and on', free: '-', pass: 'this big day', gold: 'every big day' },
  { feature: 'Event-day card and printable PDF', free: '-', pass: 'this big day', gold: 'every big day' },
  { feature: 'Painted scene pictures and Cartoon mode', free: '-', pass: '-', gold: 'yes' },
  { feature: 'Moon Storyteller premium voice', free: '-', pass: '-', gold: 'yes' },
  { feature: "Story read in a parent's own voice (voice clone)", free: '-', pass: '-', gold: 'yes' },
];

/** The longest-running subscription of a family, if any (for Settings). */
export function activeSubscription(list: Entitlement[], now = Date.now()): Entitlement | undefined {
  return list
    .filter((e) => (e.plan === 'year' || e.plan === 'month') && e.expiresAt > now)
    .sort((a, b) => b.expiresAt - a.expiresAt)[0];
}

export function ownsEventPack(list: Entitlement[], now = Date.now()): boolean {
  return list.some((e) => e.plan === 'event' && e.expiresAt > now);
}
