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
  const pool = new Pool({ connectionString: url, max: 5 });
  const db = drizzlePg(pool, { schema });
  const ready = migrate(db, { migrationsFolder: MIGRATIONS });
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
  // Query API is the same; one type keeps repository modules simple.
  return { db: lite as unknown as Db, ready, kind: 'pglite', close: () => client.close() };
}

let creating: Promise<Holder> | null = null;

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
  const h = await holder();
  await h.ready;
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
export async function pingDb(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.execute('select 1');
    return true;
  } catch {
    return false;
  }
}

/** Tests only. */
export async function closeDb(): Promise<void> {
  const h = g.__bdsDb;
  g.__bdsDb = undefined;
  creating = null;
  if (h) await h.close();
}
