/**
 * Access rules (docs/SPEC.md 5.6, 10.1). The browser uses these only to decide what to
 * show; the server enforces access from its own entitlement rows with the same function.
 */
import type { Entitlement, PlanId } from './types';

export type GatedFeature = 'chapter' | 'ritual';

/** Non-expired entitlements. */
export function activeEntitlements(entitlements: readonly Entitlement[], nowMs: number): Entitlement[] {
  return entitlements.filter((e) => e.expiresAt > nowMs);
}

/** True with an active year or month plan, or an active event plan for this event. */
export function hasEventAccess(entitlements: readonly Entitlement[], eventId: string, nowMs: number): boolean {
  return activeEntitlements(entitlements, nowMs).some(
    (e) => e.plan === 'year' || e.plan === 'month' || (e.plan === 'event' && e.eventId === eventId),
  );
}

/** Chapter 1 is free; chapters 2+ need access. */
export function chapterNeedsAccess(index: number): boolean {
  return index > 1;
}

export function canOpenChapterByAccess(index: number, hasAccess: boolean): boolean {
  return !chapterNeedsAccess(index) || hasAccess;
}

/** Whether a feature needs paid access in the MVP (D15: only chapters 2+ and the day card). */
export function featureNeedsAccess(feature: GatedFeature, chapterIndex = 1): boolean {
  return feature === 'ritual' ? true : chapterNeedsAccess(chapterIndex);
}

const PLAN_RANK: Record<PlanId, number> = { year: 3, month: 2, event: 1 };

export interface AccessSummary {
  plan: PlanId | null;
  /** True for an active subscription that renews. */
  renews: boolean;
  expiresAt: number | null;
  /** Event ids covered by event plans. */
  eventIds: string[];
}

/** The strongest active plan, for settings and the paywall. */
export function accessSummary(entitlements: readonly Entitlement[], nowMs: number): AccessSummary {
  const active = activeEntitlements(entitlements, nowMs);
  const best = [...active].sort((a, b) => PLAN_RANK[b.plan] - PLAN_RANK[a.plan] || b.expiresAt - a.expiresAt)[0];
  return {
    plan: best?.plan ?? null,
    renews: best?.renews ?? false,
    expiresAt: best?.expiresAt ?? null,
    eventIds: active.filter((e) => e.plan === 'event' && e.eventId).map((e) => e.eventId as string),
  };
}

/** "Add $39 and get the full year" (10.3): an Event Pack owner without a subscription. */
export function isUpgradeEligible(entitlements: readonly Entitlement[], nowMs: number): boolean {
  const active = activeEntitlements(entitlements, nowMs);
  return active.some((e) => e.plan === 'event') && !active.some((e) => e.plan === 'year' || e.plan === 'month');
}
