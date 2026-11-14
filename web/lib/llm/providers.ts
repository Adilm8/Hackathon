/**
 * Providers and routing (docs/SPEC.md 8.1). Server-only.
 *
 * One code path for every provider through the AI SDK (`ai`, Apache-2.0, github.com/vercel/ai):
 * - gemini:     `@ai-sdk/google`, strict safety settings (level 2 of 8.6), reasoning off;
 * - openrouter: `@openrouter/ai-sdk-provider`, providers that collect data are denied (N6), reasoning off;
 * - mock:       a local language model that streams JSON written from the event templates.
 *               No network and no cost. It goes through exactly the same parsing and checks.
 *
 * A circuit breaker (./breaker) moves OpenRouter to OPENROUTER_MODEL_BACKUP for two minutes after two
 * failures, and pauses Gemini for as long as the provider asks after a rate-limit answer.
 */
import 'server-only';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { simulateReadableStream, type LanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { env } from '../env';
import { isOpen } from './breaker';
import type { LlmRoute } from './config';

export type ProviderName = 'gemini' | 'openrouter' | 'mock';

export interface ModelHandle {
  provider: ProviderName;
  modelId: string;
  /** Breaker key of this provider and model. */
  key: string;
  model: LanguageModel;
  providerOptions?: Record<string, Record<string, unknown>>;
}

/** Gemini safety filter at the strict threshold (8.6 level 2). */
const GEMINI_SAFETY = [
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
].map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' }));

let google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let openrouter: ReturnType<typeof createOpenRouter> | null = null;

function geminiHandle(): ModelHandle {
  const { apiKey, model } = env().llm.gemini;
  google ??= createGoogleGenerativeAI({ apiKey });
  return {
    provider: 'gemini',
    modelId: model,
    key: `gemini:${model}`,
    model: google(model),
    providerOptions: { google: { safetySettings: GEMINI_SAFETY, structuredOutputs: true } },
  };
}

function openrouterHandle(modelId: string): ModelHandle {
  openrouter ??= createOpenRouter({ apiKey: env().llm.openrouter.apiKey, compatibility: 'strict' });
  return {
    provider: 'openrouter',
    modelId,
    key: `openrouter:${modelId}`,
    model: openrouter.chat(modelId, {
      // Only providers that do not store or train on inputs (N6); fail rather than route elsewhere.
      provider: { data_collection: 'deny', require_parameters: true },
      // Reasoning off (8.1): the call-level `reasoning: 'none'` of the AI SDK is not passed on by this
      // provider, and hidden reasoning tokens would eat maxOutputTokens and the first-page deadline.
      reasoning: { effort: 'none', exclude: true },
      // Report the real cost of each call so the daily cap counts dollars, not estimates.
      usage: { include: true },
    }),
  };
}

/**
 * The model for a route, or null when the breaker says to go straight to the fallback.
 * `mockOutput` writes the mock's JSON from the same inputs the prompt was built from.
 */
export function modelFor(route: LlmRoute, mockOutput: () => unknown): ModelHandle | null {
  const cfg = env().llm;
  if (cfg.provider === 'mock') return mockHandle(mockOutput);
  if (cfg.provider === 'gemini') {
    const h = geminiHandle();
    return isOpen(h.key) ? null : h;
  }
  const primary = route === 'answer' ? cfg.openrouter.modelAnswer : cfg.openrouter.model;
  const main = openrouterHandle(primary);
  if (!isOpen(main.key)) return main;
  if (cfg.openrouter.modelBackup && cfg.openrouter.modelBackup !== primary) {
    const backup = openrouterHandle(cfg.openrouter.modelBackup);
    if (!isOpen(backup.key)) return backup;
  }
  return null;
}

const usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: undefined },
});

/** Splits JSON text into small pieces so the mock streams like a real model. */
function chunks(text: string, size = 48): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

/** Delay between mock chunks, ms. 0 in tests; a little in development so streaming is visible. */
function mockDelay(): number {
  const v = Number(process.env.LLM_MOCK_DELAY_MS ?? (process.env.NODE_ENV === 'development' ? 15 : 0));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

export function mockHandle(write: () => unknown): ModelHandle {
  const model = new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'mock',
    doStream: async () => {
      const text = JSON.stringify(write());
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: mockDelay(),
          chunks: [
            { type: 'text-start' as const, id: 't' },
            ...chunks(text).map((delta) => ({ type: 'text-delta' as const, id: 't', delta })),
            { type: 'text-end' as const, id: 't' },
            {
              type: 'finish' as const,
              finishReason: { unified: 'stop' as const, raw: undefined },
              logprobs: undefined,
              usage: usage(0, 0),
            },
          ],
        }),
      };
    },
  });
  return { provider: 'mock', modelId: 'mock', key: 'mock', model };
}
