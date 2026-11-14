import type { Workspace } from '@/lib/engine/types';

/** The active workspace in the browser: `?ws=sample` (return from Stripe) wins, then the stored choice. */
export function currentWorkspace(search?: URLSearchParams | null): Workspace {
  if (search?.get('ws') === 'sample') return 'sample';
  if (typeof window === 'undefined') return 'real';
  try {
    const v = window.localStorage.getItem('bds:workspace');
    return v === 'sample' || v === '"sample"' ? 'sample' : 'real';
  } catch {
    return 'real';
  }
}
