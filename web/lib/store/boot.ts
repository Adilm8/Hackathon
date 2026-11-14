'use client';
/** Starts the stores and the sync module once per page load (docs/SPEC.md 6.2). */
import type { Entitlement } from '@/lib/engine/types';
import { ENTITLEMENTS_EVENT } from '@/lib/payments/client';
import { startSync } from '@/lib/sync';
import { getFamilyDoc, replaceFamilyDoc, subscribeFamily } from './family';
import { setEntitlements } from './entitlement';
import { hydrateStores } from './hydration';
import { getWorkspace } from './workspace';

let booted = false;

export function bootApp(): void {
  if (booted || typeof window === 'undefined') return;
  booted = true;
  // The payments screens announce fresh entitlements after a verified checkout.
  window.addEventListener(ENTITLEMENTS_EVENT, (e) => setEntitlements((e as CustomEvent<Entitlement[]>).detail ?? []));
  void hydrateStores().then(() => {
    startSync({
      workspace: getWorkspace(),
      getDoc: getFamilyDoc,
      replaceDoc: replaceFamilyDoc,
      subscribe: subscribeFamily,
      setEntitlements,
    });
  });
}
