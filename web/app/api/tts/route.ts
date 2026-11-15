import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/llm/route-guard';
import { env } from '@/lib/env';
import { apiError } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';
import { familyHasExtra } from '@/lib/payments/access';
import { isGoldVoice, parentVoiceId, resolveVoice, synthesize, TTS_MAX_CHARS } from '@/lib/tts/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.strictObject({ text: z.string().trim().min(1).max(TTS_MAX_CHARS), voice: z.string().max(80).optional() });

/** Whether the premium story voice is switched on, and its character voices (docs/voice-options.md). `gold` marks a Gold-only voice. */
export function GET() {
  const { enabled, voices, model } = env().tts;
  return NextResponse.json({ enabled, voices: enabled ? voices.map((v) => ({ ...v, gold: isGoldVoice(v.id, model) })) : [] });
}

/** One sentence of the story as audio (mp3, or WAV for Gemini). Never logs the text. */
export async function POST(req: NextRequest) {
  if (!env().tts.enabled) return apiError('not_found', 'Premium voice is off');
  const g = await guard(req, Body);
  if ('error' in g) return g.error;
  // A chapter is about 40 sentences; 120 a minute leaves room to skip back and forth.
  if (!allow(`tts:${g.familyId}`, 120, 60_000)) return apiError('rate_limited', 'Too many requests, wait a minute');
  // Gold extras (SPEC 10.1): the parent's cloned voice needs Gold; a Gold character voice
  // falls back to the default storyteller for everyone else, so Listen never goes silent.
  const { tts } = env();
  let voice = g.data.voice;
  const parent = parentVoiceId(voice) !== null;
  if (parent && !(await familyHasExtra(g.familyId, 'voice.clone'))) {
    return apiError('payment_required', 'Your own voice is part of Gold');
  }
  if (!parent && voice && isGoldVoice(resolveVoice(voice, tts.voices), tts.model) && !(await familyHasExtra(g.familyId, 'voice.premium'))) {
    voice = undefined;
  }
  const r = await synthesize(g.data.text, g.familyId, voice);
  if ('error' in r) return apiError('upstream_failed', r.error === 'budget' ? 'Daily voice budget reached' : r.error === 'no_sample' ? 'No saved voice' : 'Voice unavailable', 503);
  return new NextResponse(new Uint8Array(r.audio), {
    headers: { 'Content-Type': r.type, 'Cache-Control': 'private, max-age=86400', 'X-Cache': r.cached ? 'hit' : 'miss' },
  });
}
