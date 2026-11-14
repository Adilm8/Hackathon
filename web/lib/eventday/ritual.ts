'use client';
/**
 * The event-day card, browser side (docs/SPEC.md 4.12, 9 POST /api/ritual). One call with a
 * deadline; on any failure the template ritual (adjusted by memory) is shown instead, so the
 * card is never empty (A1). Only a card the AI wrote is stored, so a fallback is retried later.
 */
import type { BigEvent, ChildProfile, EventTemplate, RitualCard } from '@/lib/engine/types';
import { buildStoryContext, fallbackRitual, topTopics } from '@/lib/store/engine';
import { getWorkspace } from '@/lib/store/workspace';

export type RitualResult = { card: RitualCard; store: boolean } | { error: 'payment_required' };

function isCard(x: unknown): x is RitualCard {
  const c = x as RitualCard;
  return (
    !!c && Array.isArray(c.steps) && c.steps.length === 3 && c.steps.every((s) => typeof s === 'string' && s.trim()) &&
    !!c.technique && typeof c.technique.id === 'string' && typeof c.technique.label === 'string' && typeof c.technique.how === 'string'
  );
}

export async function loadRitual(
  input: { event: BigEvent; child: ChildProfile; template: EventTemplate },
  timeoutMs = 8000,
): Promise<RitualResult> {
  const { event, child, template } = input;
  if (event.ritual) return { card: event.ritual, store: false };
  const fallback = () => ({ card: fallbackRitual(template, event, child), store: false });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const last = event.chapters[event.chapters.length - 1]?.index ?? 1;
    const res = await fetch('/api/ritual', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-bds-workspace': getWorkspace() },
      body: JSON.stringify({
        eventId: event.id,
        context: buildStoryContext({ event, child, template, chapterIndex: last }),
        topTopics: topTopics(event, 3),
      }),
      signal: ctrl.signal,
    });
    if (res.status === 402) return { error: 'payment_required' };
    if (!res.ok) return fallback();
    const body = (await res.json()) as unknown;
    if (!isCard(body)) return fallback();
    const card: RitualCard = { steps: [body.steps[0], body.steps[1], body.steps[2]], technique: body.technique, source: body.source === 'llm' ? 'llm' : 'fallback' };
    return { card, store: card.source === 'llm' };
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}
