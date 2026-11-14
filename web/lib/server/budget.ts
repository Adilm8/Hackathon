/**
 * Daily spending cap and the usage log of LLM calls (docs/SPEC.md 8.7, 12.4). Server-only.
 *
 * Every call (and every call we skipped) is written to `llm_calls` without any text. Today's spend
 * (UTC day) is read once from the database and then kept in memory. When it reaches
 * LLM_BUDGET_USD_PER_DAY every call returns the template fallback until midnight UTC.
 * Logging never breaks a response: a database error only costs the log line.
 */
import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { llmCalls } from '../db/schema';
import { env } from '../env';
import type { LlmRoute } from '../llm/config';

export type CallOutcome = 'ok' | 'fallback' | 'blocked' | 'timeout' | 'error';

export interface CallRecord {
  familyId: string | null;
  route: LlmRoute;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  outcome: CallOutcome;
}

const state: { day: string; spent: number; loaded: boolean; loading: Promise<void> | null } = {
  day: '',
  spent: 0,
  loaded: false,
  loading: null,
};

function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

async function load(day: string): Promise<void> {
  try {
    const db = await getDb();
    const [row] = await db
      .select({ total: sql<string>`coalesce(sum(${llmCalls.costUsd}), 0)::text` })
      .from(llmCalls)
      .where(sql`${llmCalls.createdAt} >= ${`${day}T00:00:00Z`}::timestamptz`);
    // Calls recorded in memory while loading are added on top.
    if (state.day === day) state.spent += Number(row?.total ?? 0);
  } catch (e) {
    console.error('[budget] could not read today\'s spend:', e instanceof Error ? e.message : e);
  }
}

async function ensureDay(now = Date.now()): Promise<void> {
  const day = utcDay(now);
  if (state.day !== day) {
    state.day = day;
    state.spent = 0;
    state.loaded = false;
    state.loading = null;
  }
  if (!state.loaded) {
    state.loading ??= load(day).finally(() => {
      state.loaded = true;
    });
    await state.loading;
  }
}

/** Dollars spent today (UTC). */
export async function spentToday(now = Date.now()): Promise<number> {
  await ensureDay(now);
  return state.spent;
}

/** True while today's spend is under the cap. The mock provider is free and always allowed. */
export async function budgetLeft(now = Date.now()): Promise<boolean> {
  if (env().llm.provider === 'mock') return true;
  return (await spentToday(now)) < env().llm.budgetUsdPerDay;
}

/** Writes one row to llm_calls and adds its cost to today's total. Never throws. */
export async function recordCall(r: CallRecord, now = Date.now()): Promise<void> {
  await ensureDay(now);
  state.spent += r.costUsd;
  console.log(
    `[llm] route=${r.route} provider=${r.provider} model=${r.model} outcome=${r.outcome} ` +
      `ms=${r.latencyMs} in=${r.inputTokens} out=${r.outputTokens} usd=${r.costUsd.toFixed(6)}`,
  );
  try {
    const db = await getDb();
    await db.insert(llmCalls).values({
      familyId: r.familyId,
      route: r.route,
      provider: r.provider,
      model: r.model,
      inputTokens: Math.max(0, Math.round(r.inputTokens)),
      outputTokens: Math.max(0, Math.round(r.outputTokens)),
      costUsd: r.costUsd.toFixed(6),
      latencyMs: Math.max(0, Math.round(r.latencyMs)),
      outcome: r.outcome,
    });
  } catch (e) {
    console.error('[budget] could not write llm_calls:', e instanceof Error ? e.message : e);
  }
}

/** Tests only. */
export function resetBudget(): void {
  state.day = '';
  state.spent = 0;
  state.loaded = false;
  state.loading = null;
}
