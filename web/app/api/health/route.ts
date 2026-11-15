import { NextResponse } from 'next/server';
import { buildHealth, collectHealth } from '@/lib/server/health';
import pkg from '@/package.json';

export const dynamic = 'force-dynamic';

/**
 * Health check for Railway and for the jury Q&A (docs/SPEC.md 9, docs/reliability.md).
 * 200 while the app can serve families (status ok or degraded: a fallback is in use),
 * 503 only when the database is down. The older top-level fields stay for existing callers.
 */
export async function GET() {
  const i = await collectHealth();
  const { status, checks } = buildHealth(i);
  return NextResponse.json(
    {
      ok: status !== 'down',
      status,
      checks,
      db: i.db,
      provider: i.llmProvider,
      budgetLeft: i.budgetLeft,
      paused: i.paused,
      version: pkg.version,
    },
    { status: status === 'down' ? 503 : 200, headers: { 'cache-control': 'no-store' } },
  );
}
