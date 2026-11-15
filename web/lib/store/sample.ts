'use client';
/** "Try a sample" and "Exit sample" (docs/SPEC.md 4.3). */
import { clock } from '@/lib/engine/clock';
import { api } from '@/lib/sync/api';
import { buildSampleFamily } from './engine';
import { buildSampleSibling } from '@/lib/engine/sample';
import { clearWorkspaceKeys, seedWorkspace } from './seed';
import { getWorkspace, switchWorkspace, workspaceHasData } from './workspace';
import type { Workspace } from '@/lib/engine/types';

/** Where each workspace was left, so switching back opens the same screen (bds:return:real / bds:return:sample). */
const RETURN_KEY = (ws: Workspace) => `bds:return:${ws}`;

/** Remembers the current screen of the workspace being left. Onboarding is not a place to come back to. */
function rememberHere(): void {
  try {
    const here = window.location.pathname + window.location.search;
    if (here.startsWith('/start') || here === '/' || here.startsWith('/?')) return;
    window.localStorage.setItem(RETURN_KEY(getWorkspace()), here);
  } catch {
    /* private mode: switching still works, just from /home */
  }
}

function returnPath(ws: Workspace): string | null {
  try {
    const p = window.localStorage.getItem(RETURN_KEY(ws));
    return p && p.startsWith('/') && !p.startsWith('//') ? p : null;
  } catch {
    return null;
  }
}

function forgetReturn(ws: Workspace): void {
  try {
    window.localStorage.removeItem(RETURN_KEY(ws));
  } catch {
    /* ignore */
  }
}
import { planHref } from '@/lib/home/path';

/**
 * Creates a fresh sample family on the server (local seed when offline). `plan` opens its
 * upcoming plan (the 3-minute tour), `home` opens the home page to look around the whole app.
 * The sample lives in its own workspace (bds:sample:*), so a real family's data is untouched.
 */
export async function startSample(open: 'plan' | 'home' = 'plan'): Promise<void> {
  const today = clock.realToday();
  if (getWorkspace() === 'real') rememberHere();
  forgetReturn('sample');
  clearWorkspaceKeys('sample');
  const server = await api.createSample(today);
  const base = server?.doc ?? buildSampleFamily(today);
  // Max's sister Mia waits on the device, so the tour can show switching between children.
  const mia = buildSampleSibling(today);
  const doc = { ...base, events: [...base.events.filter((e) => e.id !== mia.event.id), mia.event] };
  seedWorkspace('sample', doc, server?.entitlements ?? [], server?.version, [mia.child]);
  const upcoming = doc.events.filter((e) => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  switchWorkspace('sample', open === 'plan' && upcoming ? planHref(upcoming.id) : '/home');
}

/**
 * One-tap switch into the demo: the sample family is kept between visits, so the parent comes
 * back to the same screen and tour progress. A first visit (or a wiped sample) builds a fresh one.
 */
export async function enterSample(): Promise<void> {
  if (getWorkspace() === 'sample') return;
  if (!workspaceHasData('sample')) return startSample('home');
  rememberHere();
  switchWorkspace('sample', returnPath('sample') ?? '/home');
}

/** Back to the parent's own app, on the screen they left; their data was never touched. */
export function exitSample(): void {
  if (getWorkspace() === 'sample') rememberHere();
  if (!workspaceHasData('real')) return switchWorkspace('real', '/?landing=1');
  switchWorkspace('real', returnPath('real') ?? '/home');
}

/**
 * "Create your own story": always in the parent's own space. From the sample it leaves the
 * sample first, so the sample family stays as it is for the tour.
 */
export function ownStoryHref(): string {
  return workspaceHasData('real') ? '/start?again=1' : '/start';
}

export function startOwnStory(): void {
  if (getWorkspace() === 'sample') rememberHere();
  switchWorkspace('real', ownStoryHref());
}
