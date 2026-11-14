import { afterAll, expect, it } from 'vitest';
import { closeDb } from '@/lib/db/client';
import { ALL_CASES, TZ_CASES } from '@/evals/questions';
import { runSafety } from '@/evals/safety-run';

afterAll(closeDb);

// The same check as `npm run safety` with the mock provider: levels 1 and 4 (docs/SPEC.md 14.2).
it('passes the ТЗ safety set and the team question set on the mock provider', async () => {
  const results = await runSafety(ALL_CASES, 1, true);
  const failed = results.filter((r) => !r.pass).map((r) => `${r.c.id}: ${r.runs[0].problems.join('; ')}`);
  expect(failed).toEqual([]);
  expect(results.filter((r) => r.c.group === 'tz')).toHaveLength(TZ_CASES.length);
}, 30_000);
