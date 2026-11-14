/**
 * The only place where the AI layer touches other streams' modules (engine, persistence, payments).
 * Keeping these in one file makes a renamed export a one-line change.
 * pageTargets (5.2) and confirmAddresses (5.4, A9) are the engine's, so browser and server use one rule.
 */
import { grantsEventAccess } from '../db/entitlements';
import { getState } from '../db/state';
import { accessFor } from '../payments/access';

export { getTemplate } from '../engine/templates';
export { pageTargets } from '../engine/plan';
export { confirmAddresses } from '../engine/state';
export { findTechniqueAnywhere, isCustomTechnique } from '../engine/memory';
export { getSession } from '../server/session';

/** The child's name and pronunciation from the server copy, for the second name replacement (8.6). */
export async function childNameOf(familyId: string, timeoutMs = 400): Promise<{ name?: string; pronunciation?: string }> {
  try {
    const state = await Promise.race([
      getState(familyId),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    const child = state?.doc.child;
    return child ? { name: child.name, pronunciation: child.pronunciation } : {};
  } catch {
    return {};
  }
}

/** Paid access to one event, after the subscription refresh of the payments stream (10.4). */
export async function hasEventAccess(familyId: string, eventId: string, now = Date.now()): Promise<boolean> {
  return grantsEventAccess(await accessFor(familyId, now), eventId, now);
}
