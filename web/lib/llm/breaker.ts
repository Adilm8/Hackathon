/**
 * Circuit breaker per provider and model (docs/SPEC.md 8.1). In memory: one instance in the MVP (12.1).
 * After BREAKER.failures failures within BREAKER.windowMs the key is open for BREAKER.openMs,
 * or for as long as the provider asked in a rate-limit answer (HTTP 429 with Retry-After).
 */
import 'server-only';
import { BREAKER } from './config';

const failures = new Map<string, number[]>();
const openUntil = new Map<string, number>();

export function isOpen(key: string, now = Date.now()): boolean {
  const until = openUntil.get(key);
  if (until === undefined) return false;
  if (until <= now) {
    openUntil.delete(key);
    return false;
  }
  return true;
}

export function recordFailure(key: string, opts: { retryAfterMs?: number } = {}, now = Date.now()): void {
  if (opts.retryAfterMs && opts.retryAfterMs > 0) {
    openUntil.set(key, now + Math.min(opts.retryAfterMs, 10 * 60_000));
    return;
  }
  const list = (failures.get(key) ?? []).filter((t) => now - t < BREAKER.windowMs);
  list.push(now);
  failures.set(key, list);
  if (list.length >= BREAKER.failures) {
    openUntil.set(key, now + BREAKER.openMs);
    failures.delete(key);
  }
}

export function recordSuccess(key: string): void {
  failures.delete(key);
}

/** For the health endpoint: keys that are open now. */
export function openKeys(now = Date.now()): string[] {
  return [...openUntil.entries()].filter(([, t]) => t > now).map(([k]) => k);
}

/** Tests only. */
export function resetBreaker(): void {
  failures.clear();
  openUntil.clear();
}
