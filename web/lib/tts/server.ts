/**
 * Premium story voice (docs/voice-options.md, SPEC 17.1). Server-only.
 * One sentence per request through OpenRouter's /audio/speech, mp3 out. Audio is cached on disk by
 * a hash of model + voice + text, so a page is synthesised once for every family that reads it.
 * The text holds the child's first name (never a surname, SPEC 6.1); the request asks OpenRouter
 * for providers that keep no data (zdr, data_collection deny). Costs count against the LLM daily cap.
 */
import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { budgetLeft, recordCall } from '../server/budget';
import { cacheKey } from '../server/cache';
import { env } from '../env';

export const TTS_MAX_CHARS = 400;

export type TtsResult = { audio: Buffer; cached: boolean } | { error: 'disabled' | 'budget' | 'upstream' };

function dir(): string {
  return env().tts.cacheDir || path.join(process.cwd(), '.data', 'tts');
}

/** Cost of one request in USD at the configured price. */
export function ttsCost(chars: number, pricePerMChars: number): number {
  return (Math.max(0, chars) * Math.max(0, pricePerMChars)) / 1_000_000;
}

/** A voice the server offers; anything else becomes the default (first) voice. */
export function resolveVoice(wanted: string | undefined, voices: { id: string }[]): string {
  return voices.find((v) => v.id === wanted)?.id ?? voices[0]?.id ?? '';
}

export async function synthesize(text: string, familyId: string | null, wantedVoice?: string): Promise<TtsResult> {
  const { tts, llm } = env();
  if (!tts.enabled) return { error: 'disabled' };
  const voice = resolveVoice(wantedVoice, tts.voices);
  const key = cacheKey(['tts', 1, tts.model, voice, text]);
  const file = path.join(dir(), `${key}.mp3`);
  try {
    return { audio: await readFile(file), cached: true };
  } catch {
    /* not cached yet */
  }
  if (!(await budgetLeft())) return { error: 'budget' };
  const t0 = Date.now();
  let outcome: 'ok' | 'error' | 'timeout' = 'error';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${llm.openrouter.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: tts.model,
        input: text,
        ...(voice ? { voice } : {}),
        response_format: 'mp3',
        instructions: 'Warm, calm bedtime-story narration for a young child.',
        provider: { zdr: true, data_collection: 'deny' },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[tts] upstream ${res.status}`);
      return { error: 'upstream' };
    }
    const audio = Buffer.from(await res.arrayBuffer());
    outcome = 'ok';
    await mkdir(dir(), { recursive: true }).catch(() => {});
    await writeFile(file, audio).catch((e) => console.error('[tts] cache write failed:', e instanceof Error ? e.message : e));
    return { audio, cached: false };
  } catch (e) {
    outcome = e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'error';
    return { error: 'upstream' };
  } finally {
    await recordCall({
      familyId, route: 'tts', provider: 'openrouter', model: tts.model,
      inputTokens: text.length, outputTokens: 0,
      costUsd: outcome === 'ok' ? ttsCost(text.length, tts.pricePerMChars) : 0,
      latencyMs: Date.now() - t0, outcome,
    });
  }
}
