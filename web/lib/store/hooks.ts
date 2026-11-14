'use client';
/** Read-side hooks the screens use: "today" that reacts to the Demo clock, access, one event with its template. */
import { clock } from '@/lib/engine/clock';
import type { BigEvent, ChildProfile, EventTemplate } from '@/lib/engine/types';
import { useChild } from './child';
import { useEntitlements } from './entitlement';
import { useEvents } from './events';
import { useSettings } from './settings';
import { nowMs } from './time';
import { getTemplate, hasEventAccess } from './engine';

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
  if (!event || !child) return null;
  return { event, child, template: getTemplate(event.type), today, hasAccess };
}
