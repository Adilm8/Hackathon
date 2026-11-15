/**
 * Parent's voice sample for the storyteller clone (demo, decided by Lida on 15 Nov 2026). Server-only.
 *
 * A voice is biometric data, so: the sample is saved only with the adult's explicit consent, one per
 * family, as a 16 kHz mono WAV next to the audio cache; it is deleted on "Delete my voice", with the
 * family ("Delete all data", a new sample family) and after 30 days at the latest. It is sent only to
 * the voice service (OpenRouter, provider does not train on data) with each sentence to be read.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../env';

/** What the parent reads aloud; sent with the sample so the voice service matches words to sound. */
export const SAMPLE_TRANSCRIPT =
  'Once upon a time, in a cozy little house, a curious child got ready for a big day. ' +
  '"Will it be okay?" the child asked. "Yes," I said softly, "I will be right here with you. ' +
  'We can take a slow breath together, in and out, and count to three." ' +
  'Then we smiled, held hands, and walked on together.';

export const SAMPLE_MIN_S = 8;
export const SAMPLE_MAX_S = 45;
export const SAMPLE_MAX_BYTES = 2 * 1024 * 1024;

export function voicesDir(): string {
  return path.join(env().tts.cacheDir || path.join(process.cwd(), '.data', 'tts'), 'voices');
}

const fileOf = (familyId: string) => path.join(voicesDir(), `${familyId.replace(/[^a-zA-Z0-9-]/g, '')}.wav`);
const metaOf = (familyId: string) => fileOf(familyId).replace(/\.wav$/, '.json');

/** Checks that the bytes are a PCM WAV of a sensible length. Returns its duration in seconds or an error. */
export function checkWav(buf: Buffer): { seconds: number } | { error: string } {
  if (buf.length < 44 || buf.length > SAMPLE_MAX_BYTES) return { error: 'size' };
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return { error: 'format' };
  const channels = buf.readUInt16LE(22);
  const rate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  if (buf.readUInt16LE(20) !== 1 || !channels || !rate || !bits) return { error: 'format' };
  const seconds = (buf.length - 44) / (rate * channels * (bits / 8));
  if (seconds < SAMPLE_MIN_S) return { error: 'short' };
  if (seconds > SAMPLE_MAX_S) return { error: 'long' };
  return { seconds };
}

export async function saveSample(familyId: string, wav: Buffer, consentOn: string): Promise<void> {
  await mkdir(voicesDir(), { recursive: true });
  await writeFile(fileOf(familyId), wav);
  await writeFile(metaOf(familyId), JSON.stringify({ consentOn, savedAt: new Date().toISOString() }));
}

export async function getSample(familyId: string): Promise<{ wav: Buffer; hash: string } | null> {
  try {
    const wav = await readFile(fileOf(familyId));
    return { wav, hash: createHash('sha256').update(wav).digest('base64url').slice(0, 16) };
  } catch {
    return null;
  }
}

export async function sampleInfo(familyId: string): Promise<{ consentOn: string; savedAt: string } | null> {
  try {
    await readFile(fileOf(familyId), { flag: 'r' });
    return JSON.parse(await readFile(metaOf(familyId), 'utf8'));
  } catch {
    return null;
  }
}

/** Removes the family's voice sample. Never throws. */
export async function deleteSample(familyId: string): Promise<void> {
  await unlink(fileOf(familyId)).catch(() => {});
  await unlink(metaOf(familyId)).catch(() => {});
}
