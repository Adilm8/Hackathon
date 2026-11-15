/**
 * Parent's voice sample for the storyteller clone (demo, decided by Lida on 15 Nov 2026). Server-only.
 *
 * A voice is biometric data, so: the sample is saved only with the adult's explicit consent, up to
 * MAX_VOICES per family, as a 16 kHz mono WAV next to the audio cache; it is deleted on "Delete my voice", with the
 * family ("Delete all data", a new sample family) and after 30 days at the latest. It is sent only to
 * the voice service (OpenRouter, provider does not train on data) with each sentence to be read.
 */
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
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

/** Up to this many saved voices per family (Lida 15 Nov 2026: Mom, Dad, Grandma…). */
export const MAX_VOICES = 4;
export type SavedVoice = { id: string; name: string; consentOn: string; savedAt: string };

const fam = (familyId: string) => familyId.replace(/[^a-zA-Z0-9-]/g, '');
const cleanId = (id: string) => id.replace(/[^a-z0-9]/g, '').slice(0, 12);
/** The first sample (PR #32) was saved as `<family>.wav`; it is the voice with id "main". */
const fileOf = (familyId: string, id: string) =>
  path.join(voicesDir(), id === 'main' ? `${fam(familyId)}.wav` : `${fam(familyId)}--${cleanId(id)}.wav`);
const metaOf = (familyId: string, id: string) => fileOf(familyId, id).replace(/\.wav$/, '.json');

/** A short name for a voice, as the grown-up typed it ("Mom", "Grandpa Joe"). */
export function cleanVoiceName(name: string | undefined): string {
  const n = (name ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return n || 'My voice';
}

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

/** Saves a new voice for the family; null when it already has MAX_VOICES. */
export async function saveSample(familyId: string, wav: Buffer, consentOn: string, name?: string): Promise<SavedVoice | null> {
  if ((await listSamples(familyId)).length >= MAX_VOICES) return null;
  await mkdir(voicesDir(), { recursive: true });
  const v: SavedVoice = { id: randomBytes(6).toString('hex').slice(0, 8).replace(/^\d/, 'v'), name: cleanVoiceName(name), consentOn, savedAt: new Date().toISOString() };
  await writeFile(fileOf(familyId, v.id), wav);
  await writeFile(metaOf(familyId, v.id), JSON.stringify(v));
  return v;
}

/** The family's saved voices, oldest first. */
export async function listSamples(familyId: string): Promise<SavedVoice[]> {
  const f = fam(familyId);
  if (!f) return [];
  const names = await readdir(voicesDir()).catch(() => [] as string[]);
  const ids = names.flatMap((n) => (n === `${f}.wav` ? ['main'] : n.startsWith(`${f}--`) && n.endsWith('.wav') ? [n.slice(f.length + 2, -4)] : []));
  const out: SavedVoice[] = [];
  for (const id of ids) {
    const meta = await readFile(metaOf(familyId, id), 'utf8').then((t) => JSON.parse(t) as Partial<SavedVoice>, () => ({}) as Partial<SavedVoice>);
    out.push({ id, name: cleanVoiceName(meta.name), consentOn: meta.consentOn ?? '', savedAt: meta.savedAt ?? '' });
  }
  return out.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
}

/** One voice's audio; without an id, the family's first voice. */
export async function getSample(familyId: string, id?: string): Promise<{ wav: Buffer; hash: string } | null> {
  const voiceId = id ? cleanId(id) || id : (await listSamples(familyId))[0]?.id;
  if (!voiceId) return null;
  try {
    const wav = await readFile(fileOf(familyId, voiceId));
    return { wav, hash: createHash('sha256').update(wav).digest('base64url').slice(0, 16) };
  } catch {
    return null;
  }
}

/** Removes one voice, or all the family's voices without an id. Never throws. */
export async function deleteSample(familyId: string, id?: string): Promise<void> {
  const ids = id ? [id === 'main' ? 'main' : cleanId(id)] : (await listSamples(familyId)).map((v) => v.id);
  for (const v of ids) {
    await unlink(fileOf(familyId, v)).catch(() => {});
    await unlink(metaOf(familyId, v)).catch(() => {});
  }
}
