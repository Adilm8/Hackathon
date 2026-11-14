/**
 * Active workspace (docs/SPEC.md 6.2): 'real' or 'sample'. Stored in `bds:workspace`.
 * Every store reads its key prefix from here once at start; switching the workspace
 * reloads the app so all stores read the right prefix.
 */
import type { Workspace } from '@/lib/engine/types';

export const WORKSPACE_KEY = 'bds:workspace';

function safeGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getWorkspace(): Workspace {
  const raw = safeGet(WORKSPACE_KEY);
  return raw === 'sample' || raw === '"sample"' ? 'sample' : 'real';
}

export function prefixFor(ws: Workspace): string {
  return ws === 'sample' ? 'bds:sample:' : 'bds:';
}

export function storeKey(name: 'settings' | 'child' | 'events' | 'entitlement'): string {
  return `${prefixFor(getWorkspace())}${name}`;
}

/** Writes the workspace and, unless told otherwise, navigates (full reload) to `href`. */
export function switchWorkspace(ws: Workspace, href = '/home'): void {
  try {
    window.localStorage.setItem(WORKSPACE_KEY, ws);
  } catch {
    /* private mode: stays on the current workspace */
  }
  window.location.assign(href);
}

/** True when the given workspace already holds a child profile (landing redirect, exit sample). */
export function workspaceHasData(ws: Workspace): boolean {
  const raw = safeGet(`${prefixFor(ws)}child`);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { state?: { child?: unknown } };
    return Boolean(parsed?.state?.child);
  } catch {
    return false;
  }
}
