/**
 * Server configuration (docs/SPEC.md 12.6). Server-only: never import from a client component.
 * Values come from web/.env.local locally and from Railway variables in production.
 * Missing optional values fall back to safe defaults; a missing LLM key or model
 * falls back to the mock provider with one warning.
 */
import 'server-only';

export type LlmProvider = 'gemini' | 'openrouter' | 'mock';

function str(name: string): string {
  return (process.env[name] ?? '').trim();
}

function resolveProvider(): LlmProvider {
  const wanted = str('LLM_PROVIDER') || 'mock';
  if (wanted === 'gemini' && str('GEMINI_API_KEY') && str('GEMINI_MODEL')) return 'gemini';
  if (wanted === 'openrouter' && str('OPENROUTER_API_KEY') && str('OPENROUTER_MODEL')) return 'openrouter';
  if (wanted !== 'mock') {
    console.warn(`[env] LLM_PROVIDER=${wanted} has no key or model: using mock`);
  }
  return 'mock';
}

let cached: ReturnType<typeof load> | null = null;

function load() {
  const secret = str('ENTITLEMENT_SECRET');
  const isProd = process.env.NODE_ENV === 'production';
  if (!secret && isProd) {
    console.warn('[env] ENTITLEMENT_SECRET is empty: sessions use an insecure development secret');
  }
  const budget = Number(str('LLM_BUDGET_USD_PER_DAY') || '1');
  return {
    isProd,
    llm: {
      provider: resolveProvider(),
      openrouter: {
        apiKey: str('OPENROUTER_API_KEY'),
        model: str('OPENROUTER_MODEL'),
        modelAnswer: str('OPENROUTER_MODEL_ANSWER') || str('OPENROUTER_MODEL'),
        modelBackup: str('OPENROUTER_MODEL_BACKUP'),
      },
      gemini: { apiKey: str('GEMINI_API_KEY'), model: str('GEMINI_MODEL') },
      budgetUsdPerDay: Number.isFinite(budget) && budget >= 0 ? budget : 1,
    },
    /** Empty = embedded PGlite in web/.data (development, tests, usability threads). */
    databaseUrl: str('DATABASE_URL'),
    stripe: {
      secretKey: str('STRIPE_SECRET_KEY'),
      webhookSecret: str('STRIPE_WEBHOOK_SECRET'),
      /** Only test keys are ever used (N10). */
      isTestKey: str('STRIPE_SECRET_KEY').startsWith('sk_test_'),
    },
    entitlementSecret: secret || 'dev-only-insecure-secret-change-me',
    adminKey: str('ADMIN_KEY'),
    demoMode: (str('DEMO_MODE') || 'on') !== 'off',
    /** Empty = taken from the request. */
    baseUrl: str('NEXT_PUBLIC_BASE_URL'),
    elevenLabsKey: str('ELEVENLABS_API_KEY'),
    /** Web push reminders; empty keys = push is off and the app shows in-app reminders only. */
    vapid: {
      publicKey: str('VAPID_PUBLIC_KEY'),
      privateKey: str('VAPID_PRIVATE_KEY'),
      /** Contact the push services may use: VAPID_SUBJECT, else the app's public URL. */
      subject: str('VAPID_SUBJECT') || str('NEXT_PUBLIC_BASE_URL')
        || (str('RAILWAY_PUBLIC_DOMAIN') ? `https://${str('RAILWAY_PUBLIC_DOMAIN')}` : 'https://localhost'),
    },
  };
}

export function env() {
  if (!cached) cached = load();
  return cached;
}

/** Tests only. */
export function resetEnvCache() {
  cached = null;
}
