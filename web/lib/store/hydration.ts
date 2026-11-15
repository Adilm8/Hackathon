'use client';
/** Client-only hydration of every store; screens render a skeleton until `useHydrated()` is true (6.2). */
import { useSyncExternalStore } from 'react';
import { useChild } from './child';
import { useRoster } from './children';
import { useEntitlements } from './entitlement';
import { useEvents } from './events';
import { useSettings } from './settings';

let started: Promise<void> | null = null;
let done = false;

export function hydrateStores(): Promise<void> {
  if (!started) {
    started = Promise.all([
      useSettings.persist.rehydrate(),
      useChild.persist.rehydrate(),
      useEvents.persist.rehydrate(),
      useEntitlements.persist.rehydrate(),
      useRoster.persist.rehydrate(),
    ]).then(() => {
      done = true;
      waiters.forEach((w) => w());
    });
  }
  return started;
}

const waiters = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  waiters.add(cb);
  void hydrateStores();
  return () => waiters.delete(cb);
}

/** True once every store has read its browser copy; false on the server and during the first client render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => done, () => false);
}
