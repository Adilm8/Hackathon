'use client';
/** "Try a sample" and "Exit sample" (docs/SPEC.md 4.3). */
import { clock } from '@/lib/engine/clock';
import { api } from '@/lib/sync/api';
import { buildSampleFamily } from './engine';
import { buildSampleSibling } from '@/lib/engine/sample';
import { clearWorkspaceKeys, seedWorkspace } from './seed';
import { switchWorkspace, workspaceHasData } from './workspace';
import { planHref } from '@/lib/home/path';

/**
 * Creates a fresh sample family on the server (local seed when offline). `plan` opens its
 * upcoming plan (the 3-minute tour), `home` opens the home page to look around the whole app.
 * The sample lives in its own workspace (bds:sample:*), so a real family's data is untouched.
 */
export async function startSample(open: 'plan' | 'home' = 'plan'): Promise<void> {
  const today = clock.realToday();
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

export function exitSample(): void {
  switchWorkspace('real', workspaceHasData('real') ? '/home' : '/?landing=1');
}

/**
 * "Create your own story": always in the parent's own space. From the sample it leaves the
 * sample first, so the sample family stays as it is for the tour.
 */
export function ownStoryHref(): string {
  return workspaceHasData('real') ? '/start?again=1' : '/start';
}

export function startOwnStory(): void {
  switchWorkspace('real', ownStoryHref());
}
