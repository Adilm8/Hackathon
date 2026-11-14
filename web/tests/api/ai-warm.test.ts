import { afterAll, expect, it } from 'vitest';
import { closeDb } from '@/lib/db/client';
import { warmSampleOnce } from '@/lib/llm/warm';

afterAll(closeDb);

// With the mock provider nothing is cached (mock text is template text), but every chapter of the
// sample must go through the pipeline without an error.
it('runs every sample chapter through the pipeline', async () => {
  expect(await warmSampleOnce('2026-11-15')).toBe(0);
});
