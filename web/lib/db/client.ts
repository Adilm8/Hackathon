/**
 * Database client (docs/SPEC.md 6.3, 12.2). Server-only.
 * DATABASE_URL set   -> PostgreSQL through `pg` (Railway in production).
 * DATABASE_URL empty -> embedded PostgreSQL (PGlite) stored in web/.data/,
 *                       so development, tests and usability runs need no database installed.
 * The same SQL migrations (web/drizzle/) run in both. Route handlers never import this
 * directly: they go through the repository modules in lib/db/.
 */
import 'server-only';
import path from 'node:path';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { env } from '../env';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

type Holder = { db: Db; ready: Promise<void>; kind: 'postgres' | 'pglite'; close: () => Promise<void> };

const g = globalThis as unknown as { __bdsDb?: Holder };

const MIGRATIONS = path.join(process.cwd(), 'drizzle');

async function createPostgres(url: string): Promise<Holder> {
  const { Pool } = await import('pg');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new Pool({
    connectionString: url,
    max: 5,
    // Without these a dead database makes every request hang instead of failing fast (docs/reliability.md).
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
  });
  // An idle connection dropped by the server emits 'error'; unhandled, it would crash the process.
  pool.on('error', (e) => console.error('[db] idle connection lost:', e.message));
  const db = drizzlePg(pool, { schema });
  const ready = migrate(db, { migrationsFolder: MIGRATIONS });
  ready.catch(() => {}); // reported by getDb(); without this a failed start is an unhandled rejection
  return { db, ready, kind: 'postgres', close: () => pool.end() };
}

async function createPglite(dataDir: string | undefined): Promise<Holder> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle: drizzleLite } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  if (dataDir) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dataDir, { recursive: true });
  }
  const client = new PGlite(dataDir);
  const lite = drizzleLite(client, { schema });
  const ready = migrate(lite, { migrationsFolder: MIGRATIONS });
  ready.catch(() => {});
  // Query API is the same; one type keeps repository modules simple.
  return { db: lite as unknown as Db, ready, kind: 'pglite', close: () => client.close() };
}

let creating: Promise<Holder> | null = null;
/** After a failed start (database down at boot) the next try waits this long, then starts over. */
const RETRY_MS = 10_000;
let failedAt = 0;

function holder(): Promise<Holder> {
  if (g.__bdsDb) return Promise.resolve(g.__bdsDb);
  if (!creating) {
    const url = env().databaseUrl;
    const memory = process.env.BDS_DB_MEMORY === '1'; // tests: in-memory PGlite
    creating = (url ? createPostgres(url) : createPglite(memory ? undefined : path.join(process.cwd(), '.data', 'pglite')))
      .then((h) => {
        g.__bdsDb = h;
        return h;
      })
      .catch((e) => {
        creating = null;
        throw e;
      });
  }
  return creating;
}

/** The migrated database. Await it in every repository function. */
export async function getDb(): Promise<Db> {
  if (failedAt && Date.now() - failedAt < RETRY_MS) throw new Error('database unavailable (retrying soon)');
  const h = await holder();
  try {
    await h.ready;
  } catch (e) {
    // Migrations failed (usually: database unreachable). Forget this client so a later call
    // reconnects, instead of keeping the rejected promise until the next restart.
    if (g.__bdsDb === h) {
      g.__bdsDb = undefined;
      creating = null;
      failedAt = Date.now();
      void h.close().catch(() => {});
    }
    throw e;
  }
  failedAt = 0;
  return h.db;
}

export async function dbKind(): Promise<'postgres' | 'pglite'> {
  return (await holder()).kind;
}

/** Runs migrations; called once at server start from instrumentation.ts. */
export async function migrateDb(): Promise<void> {
  await getDb();
}

/** Health check: true when a trivial query succeeds. */
export async function pingDb(timeoutMs = 3_000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const ping = (async () => {
      const db = await getDb();
      await db.execute('select 1');
      return true;
    })();
    ping.catch(() => {});
    return await Promise.race([ping, new Promise<boolean>((r) => (timer = setTimeout(() => r(false), timeoutMs)))]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Tests only. */
export async function closeDb(): Promise<void> {
  const h = g.__bdsDb;
  g.__bdsDb = undefined;
  creating = null;
  failedAt = 0;
  if (h) await h.close();
}
