'use client';
/** Read-side hooks the screens use: "today" that reacts to the Demo clock, access, one event with its template. */
import { useEffect } from 'react';
import { clock } from '@/lib/engine/clock';
import type { BigEvent, ChildProfile, EventTemplate } from '@/lib/engine/types';
import { useChild } from './child';
import { knownChildIds, switchChild } from './children';
import { useEntitlements } from './entitlement';
import { useEvents } from './events';
import { useSettings } from './settings';
import { nowMs } from './time';
import { getTemplate, hasEventAccess } from './engine';
import { GOLD_EXTRAS, hasGoldExtra } from '@/lib/payments/plans';

type GoldExtra = (typeof GOLD_EXTRAS)[number];

/** clock.today(), re-rendered when the Demo bar moves the clock. */
export function useToday(): string {
  useSettings((s) => s.clockOverride);
  return clock.today();
}

export function useHasAccess(eventId: string | undefined): boolean {
  const list = useEntitlements((s) => s.list);
  return !!eventId && hasEventAccess(list, eventId, nowMs());
}

export interface EventCtx { event: BigEvent; child: ChildProfile; template: EventTemplate; today: string; hasAccess: boolean }

export function useEventCtx(id: string): EventCtx | null {
  const event = useEvents((s) => s.events.find((e) => e.id === id));
  const child = useChild((s) => s.child);
  const today = useToday();
  const hasAccess = useHasAccess(id);
  // A big day of another child on this device: make that child active, so names and badges match.
  const otherChild = !!event && !!child && event.childId !== child.id && knownChildIds().has(event.childId);
  useEffect(() => {
    if (otherChild && event) switchChild(event.childId, clock.today());
  }, [otherChild, event]);
  if (!event || !child || otherChild) return null;
  return { event, child, template: getTemplate(event.type), today, hasAccess };
}

/** A Gold-only extra (docs/SPEC.md 10.1): painted pictures, Cartoon mode, premium voice, voice clone. */
export function useGoldExtra(cap: GoldExtra): boolean {
  const list = useEntitlements((s) => s.list);
  return hasGoldExtra(list, cap, nowMs());
}

/** Where "Get Gold" goes: the Gold paywall of the newest big day of this child, or none. */
export function useGoldHref(): string | null {
  const id = useEvents((s) => s.events[s.events.length - 1]?.id);
  return id ? `/event/${encodeURIComponent(id)}/paywall?gold=1` : null;
}
