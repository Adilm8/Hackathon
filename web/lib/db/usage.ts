/** Usage summary for GET /api/admin/usage (docs/SPEC.md 9). Server-only. Never reads or stores any text. */
import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from './client';
import { llmCalls, familyState } from './schema';
import { countFamilies } from './families';
import { countPurchases } from './entitlements';

export async function spendByDay(days = 14) {
  const db = await getDb();
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${llmCalls.createdAt}), 'YYYY-MM-DD')`,
      model: llmCalls.model,
      route: llmCalls.route,
      calls: sql<number>`count(*)::int`,
      costUsd: sql<string>`coalesce(sum(${llmCalls.costUsd}), 0)::text`,
    })
    .from(llmCalls)
    .where(sql`${llmCalls.createdAt} > now() - make_interval(days => ${days})`)
    .groupBy(sql`1`, llmCalls.model, llmCalls.route)
    .orderBy(sql`1 desc`);
  return rows;
}

/** Product counts taken from the data itself (there is no analytics tracker, D11). */
export async function productCounts() {
  const db = await getDb();
  const fam = await countFamilies();
  const purchases = await countPurchases();
  const [agg] = await db
    .select({
      events: sql<number>`coalesce(sum(jsonb_array_length(${familyState.doc}->'events')), 0)::int`,
      chaptersRead: sql<number>`coalesce(sum((select count(*) from jsonb_array_elements(${familyState.doc}->'events') e, jsonb_array_elements(e->'chapters') c where c ? 'readOn')), 0)::int`,
      checkins: sql<number>`coalesce(sum((select count(*) from jsonb_array_elements(${familyState.doc}->'events') e where e ? 'checkin')), 0)::int`,
    })
    .from(familyState);
  return { families: fam, purchases, ...agg };
}
