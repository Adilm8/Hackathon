/**
 * One structured, streamed model call with every guard of docs/SPEC.md 8.1, 8.7 and 12.4 around it:
 * daily budget, per-family rate limit, circuit breaker, deadline (abort), provider safety block,
 * schema validation, usage and cost log. Server-only.
 *
 * The result never throws: `final` resolves to `{ ok: true, object }` or `{ ok: false, reason }`,
 * and the caller switches to the template fallback.
 */
import 'server-only';
import { APICallError, NoObjectGeneratedError, Output, streamText } from 'ai';
import type { z } from 'zod';
import { allow } from '../server/ratelimit';
import { budgetLeft, recordCall, type CallOutcome } from '../server/budget';
import { recordFailure, recordSuccess } from './breaker';
import { costUsd, LIMITS, type LlmRoute } from './config';
import { modelFor, type ProviderName } from './providers';

export type FailReason = 'budget' | 'rate' | 'breaker' | 'timeout' | 'blocked' | 'schema' | 'error';

export type CallResult<T> =
  | { ok: true; object: T; provider: ProviderName; model: string }
  | { ok: false; reason: FailReason; provider?: ProviderName; model?: string };

export interface StructuredCall<S extends z.ZodType> {
  route: LlmRoute;
  familyId: string | null;
  schema: S;
  system: string;
  prompt: string;
  /** Writes the mock provider's output from the same inputs the prompt was built from. */
  mock: () => z.infer<S>;
  /** Aborts the call (deadline or client gone). */
  signal: AbortSignal;
  maxOutputTokens?: number;
  /** Skip the per-family limit (background warm-up of the sample cache). */
  skipRateLimit?: boolean;
}

export interface StructuredStream<T> {
  /** Partial objects as the model writes them. Ends early on failure; never throws. */
  partials: AsyncIterable<unknown>;
  final: Promise<CallResult<T>>;
}

class SchemaMismatch extends Error {}

const empty: AsyncIterable<unknown> = { [Symbol.asyncIterator]: async function* () {} };

function retryAfterMs(e: unknown): number | undefined {
  if (!APICallError.isInstance(e)) return undefined;
  const h = e.responseHeaders ?? {};
  const v = h['retry-after'] ?? h['Retry-After'];
  if (!v) return e.statusCode === 429 ? 60_000 : undefined;
  const s = Number(v);
  return Number.isFinite(s) ? s * 1000 : 60_000;
}

function classify(e: unknown, signal: AbortSignal): FailReason {
  if (signal.aborted) return 'timeout';
  if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) return 'timeout';
  if (e instanceof SchemaMismatch) return 'schema';
  if (NoObjectGeneratedError.isInstance(e)) {
    return e.finishReason === 'content-filter' ? 'blocked' : 'schema';
  }
  return 'error';
}

function outcomeOf(reason: FailReason): CallOutcome {
  if (reason === 'timeout') return 'timeout';
  if (reason === 'blocked') return 'blocked';
  if (reason === 'error') return 'error';
  return 'fallback';
}

export function callStructured<S extends z.ZodType>(call: StructuredCall<S>): StructuredStream<z.infer<S>> {
  type T = z.infer<S>;
  const started = Date.now();

  const skip = (reason: FailReason, provider = 'none', model = 'none'): StructuredStream<T> => {
    void recordCall({
      familyId: call.familyId, route: call.route, provider, model,
      inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, outcome: 'fallback',
    });
    return { partials: empty, final: Promise.resolve({ ok: false, reason }) };
  };

  if (call.familyId && !call.skipRateLimit && !allow(`llm:${call.familyId}`, LIMITS.familyLlmPerMinute, 60_000)) {
    return skip('rate');
  }
  const handle = modelFor(call.route, call.mock);
  if (!handle) return skip('breaker');

  let resolveFinal!: (r: CallResult<T>) => void;
  const final = new Promise<CallResult<T>>((r) => (resolveFinal = r));

  let setPartials!: (p: AsyncIterable<unknown>) => void;
  const partialsReady = new Promise<AsyncIterable<unknown>>((r) => (setPartials = r));
  const run = async (): Promise<CallResult<T>> => {
    if (!(await budgetLeft())) {
      setPartials(empty);
      return { ok: false, reason: 'budget' };
    }
    let inputTokens = 0;
    let outputTokens = 0;
    let reportedCost: number | undefined;
    let streamError: unknown;
    let finishReason: string | undefined;
    let result: CallResult<T>;
    try {
      const res = streamText({
        model: handle.model,
        system: call.system,
        prompt: call.prompt,
        output: Output.object({ schema: call.schema }),
        abortSignal: call.signal,
        maxRetries: 0,
        reasoning: 'none',
        maxOutputTokens: call.maxOutputTokens,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        providerOptions: handle.providerOptions as any,
        onError: ({ error }) => {
          // The first provider error explains a later "no output"; nothing with text is logged.
          streamError ??= error;
        },
        onEnd: (e: { finishReason?: string }) => {
          finishReason = e.finishReason;
        },
      });
      setPartials(res.partialOutputStream);
      const object = (await res.output) as T;
      const u = await res.usage;
      inputTokens = u.inputTokens ?? 0;
      outputTokens = u.outputTokens ?? 0;
      const meta = (await res.providerMetadata) as { openrouter?: { usage?: { cost?: number } } } | undefined;
      reportedCost = meta?.openrouter?.usage?.cost;
      const parsed = call.schema.safeParse(object);
      if (!parsed.success) throw new SchemaMismatch();
      recordSuccess(handle.key);
      result = { ok: true, object: parsed.data, provider: handle.provider, model: handle.modelId };
    } catch (e) {
      setPartials(empty);
      const cause = streamError ?? (e instanceof Error && e.cause) ?? e;
      const reason = finishReason === 'content-filter' ? 'blocked' : classify(cause, call.signal);
      e = cause;
      if (reason === 'error' || reason === 'timeout') {
        recordFailure(handle.key, { retryAfterMs: retryAfterMs(e) });
      }
      if (reason === 'error') {
        const status = APICallError.isInstance(e) ? ` status=${e.statusCode}` : '';
        // Provider error messages carry no request text; cut short anyway.
        const msg = e instanceof Error ? e.message.replace(/\s+/g, ' ').slice(0, 160) : 'error';
        console.error(`[llm] ${call.route} ${handle.provider}:${handle.modelId} failed${status}: ${msg}`);
      }
      result = { ok: false, reason, provider: handle.provider, model: handle.modelId };
    }
    void recordCall({
      familyId: call.familyId,
      route: call.route,
      provider: handle.provider,
      model: handle.modelId,
      inputTokens,
      outputTokens,
      costUsd: reportedCost ?? costUsd(handle.modelId, inputTokens, outputTokens),
      latencyMs: Date.now() - started,
      outcome: result.ok ? 'ok' : outcomeOf(result.reason),
    });
    return result;
  };

  void run().then(resolveFinal);
  const wrapped: AsyncIterable<unknown> = {
    async *[Symbol.asyncIterator]() {
      try {
        for await (const p of await partialsReady) yield p;
      } catch {
        // failure is reported through `final`
      }
    },
  };
  return { partials: wrapped, final };
}
