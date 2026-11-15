/**
 * What /api/health reports (docs/reliability.md). Server-only.
 * Every dependency gets a state and the fallback the app uses while it is not "ok":
 *   ok       works as designed
 *   off      not configured on purpose; the app uses its built-in fallback (templates, device voice, ...)
 *   degraded configured but failing or held back right now; the fallback is in use
 *   down     the dependency the server needs to keep data (the database) does not answer
 * `status` is the worst of them: "down" only for the database, else "degraded" if anything is degraded.
 * No key, URL or family data is ever included.
 */
import 'server-only';
import { dbKind, pingDb } from '../db/client';
import { env } from '../env';
import { openKeys } from '../llm/breaker';
import { gatewayMode } from '../payments/gateway';
import { budgetLeft, spentToday } from './budget';

export type CheckState = 'ok' | 'off' | 'degraded' | 'down';
export interface Check {
  state: CheckState;
  /** What the user gets right now, in one line. */
  note: string;
}
export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthInputs {
  db: boolean;
  dbKind: 'postgres' | 'pglite' | 'unknown';
  isProd: boolean;
  llmWanted: string;
  llmProvider: string;
  paused: string[];
  budgetLeft: boolean;
  spentToday: number;
  budgetPerDay: number;
  ttsEnabled: boolean;
  payments: ReturnType<typeof gatewayMode>;
  webhookSecret: boolean;
  vapid: boolean;
  secretSet: boolean;
  demoMode: boolean;
}

/** Pure: the report for given inputs (unit-tested without any service). */
export function buildHealth(i: HealthInputs): { status: HealthStatus; checks: Record<string, Check> } {
  const checks: Record<string, Check> = {};

  checks.database = !i.db
    ? { state: 'down', note: 'Database does not answer: the app keeps the family plan on the device and saves when it is back' }
    : i.isProd && i.dbKind === 'pglite'
      ? { state: 'degraded', note: 'DATABASE_URL is empty: embedded database on the server disk, not for production' }
      : { state: 'ok', note: i.dbKind };

  const wantsModel = i.llmWanted !== '' && i.llmWanted !== 'mock';
  if (i.llmProvider === 'mock') {
    checks.llm = wantsModel
      ? { state: 'degraded', note: `LLM_PROVIDER=${i.llmWanted} has no key or model: every story comes from the templates` }
      : { state: 'off', note: 'No model configured: stories and answers come from the written templates' };
  } else if (!i.budgetLeft) {
    checks.llm = { state: 'degraded', note: 'Daily spend cap reached: templates until midnight UTC' };
  } else if (i.paused.length) {
    checks.llm = { state: 'degraded', note: `Circuit breaker holds back ${i.paused.join(', ')}: backup model or templates` };
  } else {
    checks.llm = { state: 'ok', note: i.llmProvider };
  }

  checks.budget = {
    state: i.llmProvider === 'mock' ? 'off' : i.budgetLeft ? 'ok' : 'degraded',
    note: `$${i.spentToday.toFixed(4)} of $${i.budgetPerDay.toFixed(2)} today (UTC)`,
  };

  checks.voice = i.ttsEnabled
    ? { state: i.budgetLeft ? 'ok' : 'degraded', note: i.budgetLeft ? 'Premium story voice on; device voice if a sentence fails' : 'Spend cap reached: device voice' }
    : { state: 'off', note: 'Premium voice off: the device voice reads the story' };

  checks.payments =
    i.payments === 'stripe'
      ? { state: i.webhookSecret ? 'ok' : 'degraded', note: i.webhookSecret ? 'Stripe test mode' : 'Stripe test mode, no webhook secret: access is granted on return from Checkout only' }
      : i.payments === 'mock'
        ? { state: 'off', note: 'Mock checkout (no Stripe key)' }
        : i.payments === 'live_key_refused'
          ? { state: 'degraded', note: 'A live Stripe key is set and refused: payments are paused' }
          : { state: 'off', note: 'Payments not set up: the paywall explains it; demo access still works in the sample' };

  checks.push = i.vapid
    ? { state: 'ok', note: 'Web push reminders on' }
    : { state: 'off', note: 'No VAPID keys: in-app reminders and calendar (.ics) only' };

  checks.sessions = !i.secretSet && i.isProd
    ? { state: 'degraded', note: 'ENTITLEMENT_SECRET is empty: sessions use the development secret' }
    : { state: 'ok', note: 'signed cookies' };

  checks.demo = { state: i.demoMode ? 'ok' : 'off', note: i.demoMode ? 'Jury sample with "Skip payment" on' : 'Demo access off' };

  const states = Object.values(checks).map((c) => c.state);
  const status: HealthStatus = states.includes('down') ? 'down' : states.includes('degraded') ? 'degraded' : 'ok';
  return { status, checks };
}

/** Collects the inputs from the running server. Never throws; the database ping is capped at 3 s. */
export async function collectHealth(): Promise<HealthInputs> {
  const e = env();
  const [db, kind, left, spent] = await Promise.all([
    pingDb(3_000),
    dbKind().catch(() => 'unknown' as const),
    budgetLeft().catch(() => true),
    spentToday().catch(() => 0),
  ]);
  let payments: ReturnType<typeof gatewayMode>;
  try {
    payments = gatewayMode();
  } catch {
    payments = 'off';
  }
  return {
    db,
    dbKind: kind,
    isProd: e.isProd,
    llmWanted: (process.env.LLM_PROVIDER ?? '').trim(),
    llmProvider: e.llm.provider,
    paused: openKeys(),
    budgetLeft: left,
    spentToday: spent,
    budgetPerDay: e.llm.budgetUsdPerDay,
    ttsEnabled: e.tts.enabled,
    payments,
    webhookSecret: !!e.stripe.webhookSecret,
    vapid: !!(e.vapid.publicKey && e.vapid.privateKey),
    secretSet: !!(process.env.ENTITLEMENT_SECRET ?? '').trim(),
    demoMode: e.demoMode,
  };
}
