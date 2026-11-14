'use client';
/**
 * updatedAt of the family document (FamilyDoc.updatedAt, docs/SPEC.md 6.1) and the
 * change listeners the sync module subscribes to. Kept inside the events key so the
 * key list of 6.2 stays as specified.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let updatedAt = 0;

export function getUpdatedAt(): number {
  return updatedAt;
}

export function setUpdatedAt(ms: number): void {
  updatedAt = ms;
}

/** Called by every store action that changes family data. */
export function touch(): void {
  updatedAt = Date.now();
  persistUpdatedAt?.(updatedAt);
  listeners.forEach((l) => l());
}

let persistUpdatedAt: ((ms: number) => void) | null = null;
export function onTouchPersist(fn: (ms: number) => void): void {
  persistUpdatedAt = fn;
}

export function subscribeTouch(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
