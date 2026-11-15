/**
 * Numbers of the AI layer in one place (docs/SPEC.md 8.1, 8.2, 8.7, 12.4). Server-only.
 */
import 'server-only';

export type LlmRoute = 'chapter' | 'answer' | 'rewrite' | 'ritual' | 'eval' | 'tts' | 'frame';

/** Server budgets per call, in ms (8.2). The browser-side deadlines are 1 s larger. */
const scale = (() => {
  const v = Number(process.env.LLM_DEADLINE_SCALE ?? 1);
  return Number.isFinite(v) && v >= 1 ? v : 1;
})();
export const DEADLINES = {
  chapterFirstPage: 5_000 * scale,
  chapterTotal: 25_000 * scale,
  answer: 3_500 * scale,
  answerNextPage: 12_000 * scale,
  ritual: 4_000 * scale,
} as const;
/** Production budgets, for reports when DEADLINES are stretched by LLM_DEADLINE_SCALE (evaluation only). */
export const BUDGET_MS = { chapterFirstPage: 5_000, chapterTotal: 25_000, answer: 3_500, ritual: 4_000 } as const;

/** Rate limits (12.4). */
export const LIMITS = {
  familyLlmPerMinute: 30,
  ipRequestsPerMinute: 300,
  questionsPerChapter: 3,
} as const;

/** Circuit breaker (8.1): after 2 failures within 60 s the backup model is used for 2 minutes. */
export const BREAKER = { failures: 2, windowMs: 60_000, openMs: 120_000 } as const;

/** Rough prompt sizes used by the evaluation estimate (8.7): tokens per call. */
export const TOKENS_ESTIMATE = {
  chapter: { input: 2_400, output: 1_500 },
  answer: { input: 1_900, output: 150 },
  rewrite: { input: 1_900, output: 250 },
  ritual: { input: 1_500, output: 120 },
  eval: { input: 2_400, output: 1_500 },
} as const;

/**
 * Prices in USD per million tokens, input / output, used when the provider does not report the cost.
 * OpenRouter reports the real cost of every call (usage accounting) and that number wins.
 * Unknown models are priced high on purpose so the daily cap errs on the safe side.
 */
const PRICES: { match: RegExp; input: number; output: number }[] = [
  { match: /gemini.*flash.*lite/i, input: 0.1, output: 0.4 },
  { match: /gemini.*flash/i, input: 0.3, output: 2.5 },
  { match: /gemini.*pro/i, input: 1.25, output: 10 },
  { match: /deepseek/i, input: 0.3, output: 1.2 }, // v4.1 flash baseline provider price; cheapest routes ~0.05 / 0.20
  { match: /haiku-5/i, input: 0.1, output: 0.5 }, // OpenRouter list price, 15 Nov 2026
  { match: /haiku/i, input: 1, output: 5 },
  { match: /^mock$/, input: 0, output: 0 },
];
const UNKNOWN_PRICE = { input: 2, output: 10 };

export function priceOf(model: string): { input: number; output: number } {
  return PRICES.find((p) => p.match.test(model)) ?? UNKNOWN_PRICE;
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceOf(model);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/** Version of the prompt files, stored with every generated chapter (8.1). */
export const PROMPT_VERSION = 'v1';
