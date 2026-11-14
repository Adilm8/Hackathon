/** Daily retention job (docs/SPEC.md 6.3): runs once at start and then every 24 hours. Server-only. */
import 'server-only';
import { purgeStaleFamilies } from '../db/families';

const g = globalThis as unknown as { __bdsJobs?: boolean };

export function startJobs(): void {
  if (g.__bdsJobs) return;
  g.__bdsJobs = true;
  const run = () =>
    purgeStaleFamilies()
      .then((r) => console.log(`[jobs] purged ${r.samples} sample and ${r.guests} idle families`))
      .catch((e) => console.error('[jobs] purge failed:', e instanceof Error ? e.message : e));
  void run();
  setInterval(run, 24 * 3_600_000).unref();
}
