/**
 * Warm-up of the sample family's chapters (docs/SPEC.md 12.3). Server-only.
 * Generates every chapter of the sample dentist event through the normal pipeline in the background,
 * so the jury path is answered from the cache and never waits for a model. Repeats every hour.
 *
 * It spends money on a paid provider (5 chapters per hour), so it is opt-in: LLM_WARM_SAMPLE=on.
 * With the mock provider it does nothing (mock output is never cached).
 */
import 'server-only';
import { buildSampleFamily } from '../engine/sample';
import { buildStoryContext } from '../engine/state';
import { getTemplate } from '../engine/templates';
import { env } from '../env';
import { generateChapter } from './chapter';

const HOUR = 60 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | null = null;

/** The story context has no dates, so any "today" gives the jury's contexts. */
export async function warmSampleOnce(today = new Date().toISOString().slice(0, 10)): Promise<number> {
  const doc = buildSampleFamily(today);
  const event = doc.events.find((e) => e.date >= today && e.chapters.length);
  if (!doc.child || !event) return 0;
  const template = getTemplate(event.type);
  let warmed = 0;
  for (const chapter of event.chapters) {
    const ctx = buildStoryContext({ event, child: doc.child, template, chapterIndex: chapter.index });
    let ok = false;
    for await (const e of generateChapter({ ctx, template, familyId: null, warmup: true })) {
      if (e.type === 'done') ok = e.source === 'llm' && !e.partial;
    }
    if (ok) warmed++;
  }
  return warmed;
}

export function startSampleWarmup(): void {
  if (timer || process.env.LLM_WARM_SAMPLE !== 'on' || env().llm.provider === 'mock') return;
  const run = () =>
    warmSampleOnce()
      .then((n) => console.log(`[llm] sample warm-up: ${n} chapters cached`))
      .catch((e) => console.warn('[llm] sample warm-up failed:', e instanceof Error ? e.message : e));
  setTimeout(run, 5_000);
  timer = setInterval(run, HOUR - 60_000);
  timer.unref?.();
}
