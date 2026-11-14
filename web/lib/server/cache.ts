/**
 * In-memory cache of generated content (docs/SPEC.md 12.3). Server-only; one instance in the MVP (12.1).
 *
 * Chapters and day cards are cached for one hour by a hash of everything that went into the prompt
 * (route, template version, prompt version, the whole StoryContext). The sample family's context is the
 * same for every juror, so after the first reader (or the warm-up) the jury path never waits for a model
 * and survives provider rate limits. A question changes the context, so generation after it is live.
 * Only complete model results are cached; fallbacks never are.
 */
import 'server-only';
import { createHash } from 'node:crypto';

const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 500;

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheKey(parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('base64url');
}

export function cacheGet<T>(key: string, now = Date.now()): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (e.expires <= now) {
    store.delete(key);
    return undefined;
  }
  // Refresh the position for LRU eviction.
  store.delete(key);
  store.set(key, e);
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = TTL_MS, now = Date.now()): void {
  store.delete(key);
  store.set(key, { value, expires: now + ttlMs });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function cacheSize(): number {
  return store.size;
}

/** Tests only. */
export function resetCache(): void {
  store.clear();
}
