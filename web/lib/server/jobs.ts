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

const gp = globalThis as unknown as { __bdsPush?: boolean };

/** Every minute: sends the reminders that are due (only when VAPID keys are set). */
export function startPushJob(): void {
  if (gp.__bdsPush) return;
  gp.__bdsPush = true;
  const run = async () => {
    const { env } = await import('../env');
    const { publicKey, privateKey, subject } = env().vapid;
    if (!publicKey || !privateKey) return;
    const { duePushes, deletePushSubscription } = await import('../db/push');
    const { sendEmptyPush } = await import('../push/vapid');
    const due = await duePushes(Date.now());
    for (const d of due) {
      const r = await sendEmptyPush(d.endpoint, { publicKey, privateKey }, subject);
      if (r === 'gone') await deletePushSubscription(d.endpoint);
    }
    if (due.length) console.log(`[push] sent ${due.length} reminders`);
  };
  setInterval(() => void run().catch((e) => console.error('[push] failed:', e instanceof Error ? e.message : e)), 60_000).unref();
}
