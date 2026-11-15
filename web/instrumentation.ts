/** Runs once when the server starts: applies database migrations (docs/SPEC.md 12.2). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { migrateDb } = await import('./lib/db/client');
  const start = async (attempt: number): Promise<void> => {
    try {
      await migrateDb();
      console.log('[db] migrations applied');
      (await import('./lib/server/jobs')).startJobs();
      (await import('./lib/server/jobs')).startPushJob();
      (await import('./lib/llm/warm')).startSampleWarmup();
    } catch (e) {
      // The app keeps working on the local copy and saves later (N8). The background jobs start
      // once the database answers: try again with a growing pause, at most every 5 minutes.
      const cause = e instanceof Error && e.cause instanceof Error ? ` (${e.cause.message})` : '';
      console.error('[db] migration failed:', e instanceof Error ? e.message : e, cause);
      const wait = Math.min(15_000 * 2 ** attempt, 5 * 60_000);
      setTimeout(() => void start(attempt + 1), wait).unref?.();
    }
  };
  await start(0);
}
