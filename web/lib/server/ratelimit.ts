/** In-memory sliding-window limiter (one instance in the MVP, docs/SPEC.md 12.1, 12.4). Server-only. */
import 'server-only';

const buckets = new Map<string, number[]>();

/** True when the call is allowed; records it. */
export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}
