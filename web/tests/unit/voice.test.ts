import { describe, expect, it } from 'vitest';
import { classifyError, joinResults, speechVendor } from '@/lib/speech/listener';
import { englishVoices, pickVoice, RATES, type VoiceLike } from '@/lib/speech/voices';

const v = (name: string, lang: string, localService = true): VoiceLike => ({ name, lang, voiceURI: `uri:${name}`, localService });
const list = [v('Zarvox', 'en-US'), v('Thomas', 'fr-FR'), v('Daniel', 'en-GB'), v('Samantha', 'en-US'), v('Ava (Enhanced)', 'en-US'), v('Google US English', 'en_US', false)];

describe('reading voice', () => {
  it('lists English voices only, natural and well-known first, novelty voices last', () => {
    const names = englishVoices(list).map((x) => x.name);
    expect(names).not.toContain('Thomas');
    expect(names[0]).toBe('Ava (Enhanced)');
    expect(names.at(-1)).toBe('Zarvox');
  });
  it("keeps the parent's choice while the browser still has it", () => {
    expect(pickVoice(list, 'uri:Daniel')?.name).toBe('Daniel');
    expect(pickVoice(list, 'uri:Gone')?.name).toBe('Ava (Enhanced)');
    expect(pickVoice([], null)).toBeNull();
  });
  it('keeps the tested default speed', () => {
    expect(RATES.normal).toBe(0.92);
    expect(RATES.slow).toBeLessThan(RATES.normal);
  });
});

describe('voice questions', () => {
  it('maps recognition errors to what the screen says', () => {
    expect(classifyError('not-allowed')).toBe('denied');
    expect(classifyError('service-not-allowed')).toBe('dictation_off');
    expect(classifyError('no-speech')).toBe('unheard');
    expect(classifyError('network')).toBe('unavailable');
  });
  it('names the company whose speech service hears the audio', () => {
    expect(speechVendor('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Apple');
    expect(speechVendor('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1')).toBe('Apple');
    expect(speechVendor('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36')).toBe('Google');
    expect(speechVendor('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Microsoft');
  });
  it('joins partial results into one line', () => {
    expect(joinResults([[{ transcript: 'will the ' }], [{ transcript: ' dentist  be nice' }]])).toBe('will the dentist be nice');
  });
});

describe('premium story voice (server)', async () => {
  const { parseVoices } = await import('@/lib/env');
  const { resolveVoice, ttsCost } = await import('@/lib/tts/server');
  it('reads the character voices from the env', () => {
    expect(parseVoices('')).toEqual([{ id: '', label: 'Storyteller' }]);
    expect(parseVoices('a=Warm storyteller, b=Grandma ,c')).toEqual([
      { id: 'a', label: 'Warm storyteller' }, { id: 'b', label: 'Grandma' }, { id: 'c', label: 'c' },
    ]);
  });
  it('only uses voices the server offers', () => {
    const voices = [{ id: 'a' }, { id: 'b' }];
    expect(resolveVoice('b', voices)).toBe('b');
    expect(resolveVoice('evil', voices)).toBe('a');
    expect(resolveVoice(undefined, [])).toBe('');
  });
  it('counts the cost per character', () => {
    expect(ttsCost(3000, 40)).toBeCloseTo(0.12);
    expect(ttsCost(-1, 40)).toBe(0);
  });
});

describe('premium story voice formats', async () => {
  const { pcmToWav, wantsPcm } = await import('@/lib/tts/server');
  it('wraps Gemini PCM into a playable WAV', () => {
    expect(wantsPcm('google/gemini-3.8-flash-tts')).toBe(true);
    expect(wantsPcm('hexgrad/kokoro-82m')).toBe(false);
    const wav = pcmToWav(Buffer.alloc(480));
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.length).toBe(524);
  });
});

describe('character voices across models', async () => {
  const { splitVoice, priceFor } = await import('@/lib/tts/server');
  it('lets one character use another model', () => {
    expect(splitVoice('af_bella', 'hexgrad/kokoro-82m')).toEqual({ model: 'hexgrad/kokoro-82m', voice: 'af_bella' });
    expect(splitVoice('elevenlabs/eleven-v3@pFZP5JQG7iQjIQuC4Bku', 'hexgrad/kokoro-82m')).toEqual({ model: 'elevenlabs/eleven-v3', voice: 'pFZP5JQG7iQjIQuC4Bku' });
    expect(splitVoice('fish-audio/s2.1-pro-free:free@', 'x')).toEqual({ model: 'fish-audio/s2.1-pro-free:free', voice: '' });
  });
  it('counts each model at its own price', () => {
    expect(priceFor('fish-audio/s2.1-pro-free:free', 80)).toBe(0);
    expect(priceFor('hexgrad/kokoro-82m', 80)).toBe(0.62);
    expect(priceFor('elevenlabs/eleven-flash-v2.5', 80)).toBe(40);
    expect(priceFor('elevenlabs/eleven-v3', 1)).toBe(80);
    expect(priceFor('someone/new-tts', 33)).toBe(33);
  });
});

describe('story audio retention', async () => {
  const { sweepOldAudio, resetSweep, AUDIO_MAX_AGE_MS } = await import('@/lib/tts/server');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  it('deletes audio older than 30 days and keeps newer audio', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-'));
    const old = path.join(dir, 'old.mp3');
    const fresh = path.join(dir, 'fresh.wav');
    await fs.writeFile(old, 'a');
    await fs.writeFile(fresh, 'b');
    const now = Date.now();
    const past = new Date(now - AUDIO_MAX_AGE_MS - 60_000);
    await fs.utimes(old, past, past);
    resetSweep();
    expect(await sweepOldAudio(now, dir)).toBe(1);
    expect((await fs.readdir(dir)).sort()).toEqual(['fresh.wav']);
  });
});

describe('parent voice sample', async () => {
  const { encodeWav } = await import('@/lib/speech/wav');
  const { checkWav } = await import('@/lib/tts/voiceSample');
  const wav = (seconds: number) => Buffer.from(encodeWav(new Float32Array(16000 * seconds).fill(0.1), 16000));
  it('encodes 16 kHz mono 16-bit WAV', () => {
    const b = wav(1);
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.readUInt32LE(24)).toBe(16000);
    expect(b.readInt16LE(44)).toBeGreaterThan(3000);
    expect(b.length).toBe(44 + 32000);
  });
  it('accepts a 10 to 45 s sample and refuses others', () => {
    expect(checkWav(wav(25))).toEqual({ seconds: 25 });
    expect(checkWav(wav(3))).toEqual({ error: 'short' });
    expect(checkWav(Buffer.from('not a wav at all, definitely not a riff header here......'))).toEqual({ error: 'format' });
  });
});

describe('several family voices', async () => {
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { resetEnvCache } = await import('@/lib/env');
  const { encodeWav } = await import('@/lib/speech/wav');
  const vs = await import('@/lib/tts/voiceSample');
  const { parentVoiceId } = await import('@/lib/tts/server');
  const wav = Buffer.from(encodeWav(new Float32Array(16000 * 12).fill(0.1), 16000));

  it('saves up to MAX_VOICES named voices, lists, reads and deletes each', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bds-voices-'));
    process.env.TTS_CACHE_DIR = dir;
    resetEnvCache();
    try {
      const fam = 'fam-1';
      const mom = await vs.saveSample(fam, wav, '2026-11-15', ' Mom <b> ');
      const dad = await vs.saveSample(fam, wav, '2026-11-15', 'Dad');
      expect(mom?.name).toBe('Mom b');
      expect((await vs.listSamples(fam)).map((v) => v.name)).toEqual(['Mom b', 'Dad']);
      expect(await vs.getSample(fam, dad!.id)).not.toBeNull();
      expect((await vs.getSample(fam))?.wav.length).toBe(wav.length);
      for (let i = 2; i < vs.MAX_VOICES; i++) await vs.saveSample(fam, wav, '2026-11-15', `V${i}`);
      expect(await vs.saveSample(fam, wav, '2026-11-15', 'One too many')).toBeNull();
      await vs.deleteSample(fam, mom!.id);
      expect((await vs.listSamples(fam)).some((v) => v.id === mom!.id)).toBe(false);
      expect(await vs.listSamples('other')).toEqual([]);
      await vs.deleteSample(fam);
      expect(await vs.listSamples(fam)).toEqual([]);
    } finally {
      delete process.env.TTS_CACHE_DIR;
      resetEnvCache();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  it('reads the old single voice file as the voice "main"', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bds-voices-'));
    process.env.TTS_CACHE_DIR = dir;
    resetEnvCache();
    try {
      await fs.mkdir(path.join(dir, 'voices'), { recursive: true });
      await fs.writeFile(path.join(dir, 'voices', 'fam-2.wav'), wav);
      expect((await vs.listSamples('fam-2')).map((v) => [v.id, v.name])).toEqual([['main', 'My voice']]);
      await vs.deleteSample('fam-2', 'main');
      expect(await vs.listSamples('fam-2')).toEqual([]);
    } finally {
      delete process.env.TTS_CACHE_DIR;
      resetEnvCache();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  it('tells a family voice id from a character voice', () => {
    expect(parentVoiceId('parent')).toBe('');
    expect(parentVoiceId('parent:ab12cd')).toBe('ab12cd');
    expect(parentVoiceId('af_bella')).toBeNull();
    expect(parentVoiceId(undefined)).toBeNull();
  });
});
