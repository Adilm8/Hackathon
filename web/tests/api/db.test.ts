import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, pingDb } from '@/lib/db/client';
import { families, familyState } from '@/lib/db/schema';
import { FAMILY_DOC_SCHEMA_VERSION } from '@/lib/engine/schemas';

afterAll(async () => {
  await closeDb();
});

describe('embedded database', () => {
  it('migrates and stores a family document', async () => {
    expect(await pingDb()).toBe(true);
    const db = await getDb();
    const id = randomUUID();
    await db.insert(families).values({ id, kind: 'real' });
    await db.insert(familyState).values({
      familyId: id,
      doc: { schemaVersion: FAMILY_DOC_SCHEMA_VERSION, child: null, events: [], updatedAt: 1 },
    });
    const rows = await db.select().from(familyState).where(eq(familyState.familyId, id));
    expect(rows[0].doc.events).toEqual([]);
    expect(rows[0].version).toBe(1);
  });
});
