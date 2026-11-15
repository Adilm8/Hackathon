import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { apiError, checkOrigin, clientIp, readJson } from '@/lib/server/http';
import { allow } from '@/lib/server/ratelimit';
import { getSession } from '@/lib/server/session';
import { checkWav, deleteSample, listSamples, MAX_VOICES, saveSample, SAMPLE_MAX_BYTES, SAMPLE_TRANSCRIPT } from '@/lib/tts/voiceSample';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The family's voices for the storyteller clone (demo). Biometric data: consent, up to MAX_VOICES per family, each deletable. */
const Body = z.strictObject({
  /** Base64 of a 16 kHz mono 16-bit WAV. */
  audio: z.string().min(100).max(Math.ceil((SAMPLE_MAX_BYTES * 4) / 3) + 8),
  /** The adult ticked the consent box; its date (YYYY-MM-DD). */
  consentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Whose voice it is ("Mom", "Grandpa"). */
  name: z.string().max(40).optional(),
});

/** The family's saved voices, and the text to read when recording one. */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  const voices = s && env().tts.enabled ? await listSamples(s.familyId) : [];
  return NextResponse.json({
    enabled: env().tts.enabled, has: voices.length > 0, max: MAX_VOICES, transcript: SAMPLE_TRANSCRIPT,
    voices: voices.map((v) => ({ id: v.id, name: v.name, savedAt: v.savedAt })),
  });
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
  const v = await saveSample(s.familyId, wav, body.data.consentOn, body.data.name);
  if (!v) return apiError('bad_request', `You can keep up to ${MAX_VOICES} voices. Delete one first.`);
  return NextResponse.json({ has: true, voice: { id: v.id, name: v.name, savedAt: v.savedAt } });
}

export async function DELETE(req: NextRequest) {
  const bad = checkOrigin(req);
  if (bad) return bad;
  const s = await getSession(req);
  if (!s) return apiError('no_session', 'No session');
  // ?id= deletes one voice; without it, all the family's voices.
  const id = req.nextUrl.searchParams.get('id') ?? undefined;
  await deleteSample(s.familyId, id);
  return NextResponse.json({ has: (await listSamples(s.familyId)).length > 0 });
}
