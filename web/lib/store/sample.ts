'use client';
/** "Try a sample" and "Exit sample" (docs/SPEC.md 4.3). */
import { clock } from '@/lib/engine/clock';
import { api } from '@/lib/sync/api';
import { buildSampleFamily } from './engine';
import { clearWorkspaceKeys, seedWorkspace } from './seed';
import { switchWorkspace, workspaceHasData } from './workspace';

/** Creates a fresh sample family on the server (local seed when offline) and opens its upcoming plan. */
export async function startSample(): Promise<void> {
  const today = clock.realToday();
  clearWorkspaceKeys('sample');
  const server = await api.createSample(today);
  const doc = server?.doc ?? buildSampleFamily(today);
  seedWorkspace('sample', doc, server?.entitlements ?? [], server?.version);
  const upcoming = doc.events.filter((e) => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  switchWorkspace('sample', upcoming ? `/event/${upcoming.id}` : '/home');
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
