/** Runs once when the server starts: applies database migrations (docs/SPEC.md 12.2). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { migrateDb } = await import('./lib/db/client');
  try {
    await migrateDb();
    console.log('[db] migrations applied');
  } catch (e) {
    // The app keeps working on the local copy and saves later (N8).
    const cause = e instanceof Error && e.cause instanceof Error ? ` (${e.cause.message})` : '';
    console.error('[db] migration failed:', e instanceof Error ? e.message : e, cause);
  }
}
