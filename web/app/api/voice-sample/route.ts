import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { apiError, checkOrigin, clientIp, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';
import { getSession } from '@/lib/server/session';
import { checkWav, deleteSample, sampleInfo, saveSample, SAMPLE_MAX_BYTES, SAMPLE_TRANSCRIPT } from '@/lib/tts/voiceSample';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The parent's voice for the storyteller clone (demo). Biometric data: consent, one per family, deletable. */
const Body = z.strictObject({
  /** Base64 of a 16 kHz mono 16-bit WAV. */
  audio: z.string().min(100).max(Math.ceil((SAMPLE_MAX_BYTES * 4) / 3) + 8),
  /** The adult ticked the consent box; its date (YYYY-MM-DD). */
  consentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Whether this family has a saved voice, and the text to read when recording one. */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  const info = s && env().tts.enabled ? await sampleInfo(s.familyId) : null;
  return NextResponse.json({ enabled: env().tts.enabled, has: !!info, savedAt: info?.savedAt ?? null, transcript: SAMPLE_TRANSCRIPT });
}

export async function POST(req: NextRequest) {
  if (!env().tts.enabled) return apiError('not_found', 'Voice is off');
  if (!allow(`voice:${clientIp(req)}`, 6, 60_000)) return apiError('rate_limited', 'Too many requests, wait a minute');
  const body = await readJson(req, Body, Math.ceil((SAMPLE_MAX_BYTES * 4) / 3) + 1024);
  if ('error' in body) return body.error;
  const s = await getSession(req);
  if (!s) return apiError('no_session', 'No session');
  const wav = Buffer.from(body.data.audio, 'base64');
  const ok = checkWav(wav);
  if ('error' in ok) {
    const msg = ok.error === 'short' ? 'The recording is too short' : ok.error === 'long' ? 'The recording is too long' : 'The recording could not be read';
    return apiError('bad_request', msg);
  }
  await saveSample(s.familyId, wav, body.data.consentOn);
  return NextResponse.json({ has: true });
}

export async function DELETE(req: NextRequest) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const s = await getSession(req);
  if (!s) return apiError('no_session', 'No session');
  await deleteSample(s.familyId);
  return NextResponse.json({ has: false });
}
