'use client';
/**
 * Story frames in the browser (lib/frames). Asks the server once whether they are on, then fetches
 * one picture per page, two at a time, and keeps them as object URLs for this visit.
 */
import type { EventType } from '../engine/types';
import { getWorkspace } from '../store/workspace';

let status: Promise<boolean> | null = null;
export function framesEnabled(): Promise<boolean> {
  status ??= fetch('/api/frame', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((j: { enabled?: boolean }) => !!j.enabled)
    .catch(() => false);
  return status;
}

const urls = new Map<string, Promise<string | null>>();

/** A drawn picture for these page words, or null (off, budget reached, error). */
export function frameFor(sentences: string[], eventType: EventType): Promise<string | null> {
  const key = `${eventType}\u0000${sentences.join('\u0001')}`;
  let p = urls.get(key);
  if (!p) {
    p = fetch('/api/frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bds-workspace': getWorkspace() },
      body: JSON.stringify({ sentences, eventType }),
    })
      .then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : null))
      .catch(() => null);
    urls.set(key, p);
    // A failure may be the daily cap or a blip: let a later visit try again.
    void p.then((u) => { if (!u) urls.delete(key); });
  }
  return p;
}

/** Fetches every page's frame, `limit` at a time, reporting each as it arrives. */
export async function prefetchFrames(
  pages: { id: string; sentences: string[] }[], eventType: EventType, onFrame: (pageId: string, url: string) => void,
  isLive: () => boolean, limit = 2,
): Promise<void> {
  const queue = [...pages];
  const worker = async () => {
    while (queue.length && isLive()) {
      const p = queue.shift()!;
      const url = await frameFor(p.sentences, eventType);
      if (url && isLive()) onFrame(p.id, url);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
}
