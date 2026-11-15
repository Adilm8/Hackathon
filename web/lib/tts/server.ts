/**
 * Premium story voice (docs/voice-options.md, SPEC 17.1). Server-only.
 * One sentence per request through OpenRouter's /audio/speech, mp3 out (WAV for Gemini).
 * ElevenLabs and Microsoft models need an explicit voice: set TTS_VOICES. Audio is cached on disk by
 * a hash of model + voice + text, so a page is synthesised once for every family that reads it.
 * The text holds the child's first name (never a surname, SPEC 6.1); the request asks OpenRouter
 * for providers that do not train on data (data_collection deny; zero retention with TTS_ZDR=on). Costs count against the LLM daily cap.
 */
import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { budgetLeft, recordCall } from '../server/budget';
import { cacheKey } from '../server/cache';
import { env } from '../env';

export const TTS_MAX_CHARS = 400;

/** Gemini TTS answers only with raw 16-bit PCM at 24 kHz (voice test, 15 Nov); it is wrapped into WAV. */
export function wantsPcm(model: string): boolean {
  return /gemini/i.test(model);
}

/** 16-bit mono PCM to a WAV file. */
export function pcmToWav(pcm: Buffer, rate = 24000): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export type TtsResult = { audio: Buffer; cached: boolean; type: 'audio/mpeg' | 'audio/wav' } | { error: 'disabled' | 'budget' | 'upstream' };

function dir(): string {
  return env().tts.cacheDir || path.join(process.cwd(), '.data', 'tts');
}

/** OpenRouter prices per million characters (catalog, 15 Nov 2026); unknown models use TTS_PRICE_PER_M_CHARS. */
const PRICES: [RegExp, number][] = [
  [/:free$/, 0], [/kokoro/, 0.62], [/gemini/, 10], [/fish-audio/, 15], [/grok-voice/, 15], [/mai-voice-2\.1-flash|mai-voice-2-flash/, 15],
  [/mai-voice/, 22], [/eleven-(flash|turbo)|eleven-v4-turbo|eleven-v3-conversational/, 40], [/elevenlabs/, 80], [/minimax\/speech-2\.8-hd/, 100],
];
export function priceFor(model: string, fallback: number): number {
  return PRICES.find(([re]) => re.test(model))?.[1] ?? fallback;
}

/** Cost of one request in USD at the given price. */
export function ttsCost(chars: number, pricePerMChars: number): number {
  return (Math.max(0, chars) * Math.max(0, pricePerMChars)) / 1_000_000;
}

/** A voice the server offers; anything else becomes the default (first) voice. */
export function resolveVoice(wanted: string | undefined, voices: { id: string }[]): string {
  // An id may be "model@voice" to use another model for this character (voice test, 15 Nov).
  return voices.find((v) => v.id === wanted)?.id ?? voices[0]?.id ?? '';
}

/** "model@voice" picks another model for one character; a plain id uses the default model. */
export function splitVoice(id: string, defaultModel: string): { model: string; voice: string } {
  const at = id.lastIndexOf('@');
  return at > 0 ? { model: id.slice(0, at), voice: id.slice(at + 1) } : { model: defaultModel, voice: id };
}

export async function synthesize(text: string, familyId: string | null, wantedVoice?: string): Promise<TtsResult> {
  const { tts, llm } = env();
  if (!tts.enabled) return { error: 'disabled' };
  const { model, voice } = splitVoice(resolveVoice(wantedVoice, tts.voices), tts.model);
  const key = cacheKey(['tts', 1, model, voice, text]);
  const pcm = wantsPcm(model);
  const type = pcm ? 'audio/wav' : 'audio/mpeg';
  const file = path.join(dir(), `${key}.${pcm ? 'wav' : 'mp3'}`);
  try {
    return { audio: await readFile(file), cached: true, type };
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
        model,
        input: text,
        ...(voice ? { voice } : {}),
        response_format: pcm ? 'pcm' : 'mp3',
        instructions: 'Warm, calm bedtime-story narration for a young child.',
        provider: { data_collection: 'deny', ...(tts.zdr ? { zdr: true } : {}) },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[tts] upstream ${res.status}`);
      return { error: 'upstream' };
    }
    const raw = Buffer.from(await res.arrayBuffer());
    const audio = pcm ? pcmToWav(raw) : raw;
    outcome = 'ok';
    await mkdir(dir(), { recursive: true }).catch(() => {});
    await writeFile(file, audio).catch((e) => console.error('[tts] cache write failed:', e instanceof Error ? e.message : e));
    return { audio, cached: false, type };
  } catch (e) {
    outcome = e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'error';
    return { error: 'upstream' };
  } finally {
    await recordCall({
      familyId, route: 'tts', provider: 'openrouter', model,
      inputTokens: text.length, outputTokens: 0,
      costUsd: outcome === 'ok' ? ttsCost(text.length, priceFor(model, tts.pricePerMChars)) : 0,
      latencyMs: Date.now() - t0, outcome,
    });
  }
}
