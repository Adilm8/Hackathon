#!/usr/bin/env node
/**
 * Voice test (docs/voice-options.md): the same short story passage from several OpenRouter speech
 * models and voices, saved as mp3 next to a listening page with hidden names (blind test).
 *
 *   node scripts/voice-test.mjs --env path/to/.env.local --out path/to/folder [--budget 0.5] [--dry]
 *   node scripts/voice-test.mjs ... --clone my-voice.mp3   (adds zero-shot cloning on models that take a reference)
 *
 * Reads OPENROUTER_API_KEY from the env file and never prints it. Estimates every request from the
 * model's listed price (unknown price = $100 per million characters) and stops before the budget.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  args[argv[i].slice(2)] = next && !next.startsWith('--') ? next : true;
}
const envFile = typeof args.env === 'string' ? args.env : '.env.local';
const out = path.resolve(typeof args.out === 'string' ? args.out : '.data/voice-test');
const budget = Number(args.budget || 0.5);
const dry = !!args.dry;
/** --only <regex>: test only the models whose id matches (a second round). */
const only = typeof args.only === 'string' ? new RegExp(args.only, 'i') : null;
/** --round <letter>: a second round keeps the first round's files; its files and pages get this prefix. */
const prefix = typeof args.round === 'string' ? `${args.round}-` : '';

/** 16-bit mono PCM to a WAV file. */
function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function readKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  if (!existsSync(envFile)) throw new Error(`No env file at ${envFile}`);
  const line = readFileSync(envFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith('OPENROUTER_API_KEY='));
  const key = line?.slice('OPENROUTER_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('OPENROUTER_API_KEY is empty');
  return key;
}

const PASSAGE =
  'Max held the little blue toothbrush tight. "Will it hurt?" he whispered. ' +
  'Pip the fox smiled. "The dentist just counts your teeth, one, two, three. ' +
  'You can squeeze my paw, and breathe in slowly, like smelling a flower." ' +
  'Max breathed in, and out. His tummy felt a little bit calmer.';

// Candidate models and voices. A model the catalog does not list is skipped.
const CANDIDATES = [
  { match: /fish.*s2\.1.*free/i, voices: [''] },
  { match: /fish.*s2\.1-pro(?!.*free)/i, voices: [''] },
  { match: /kokoro/i, voices: ['af_heart', 'af_bella', 'bf_emma', 'am_michael'] },
  { match: /voxtral/i, voices: ['', 'en_paul_neutral'] },
  // ElevenLabs and Microsoft need an explicit voice. ElevenLabs premade voices: Rachel, Charlotte, Lily, Brian.
  { match: /^elevenlabs\/eleven-flash-v2\.5$/i, voices: ['21m00Tcm4TlvDq8ikWAM', 'XB0fDUnXU5powFXDhCwa', 'pFZP5JQG7iQjIQuC4Bku', 'nPczCjzI2devNBz1zQrb'] },
  { match: /^elevenlabs\/eleven-v3$/i, voices: ['21m00Tcm4TlvDq8ikWAM', 'pFZP5JQG7iQjIQuC4Bku'] },
  // Gemini TTS answers with raw PCM only; it is wrapped into WAV here.
  { match: /^google\/gemini-3\.8-flash-tts$/i, voices: ['Kore', 'Aoede', 'Puck', 'Sulafat'], pcm: true },
  { match: /gpt-4o-mini-tts/i, voices: ['coral', 'sage', 'fable'] },
  { match: /^microsoft\/mai-voice-2\.1$/i, voices: ['en-US-Ava:MAI-Voice-1', 'en-US-AvaMultilingualNeural', 'Jasper'] },
  { match: /^x-ai\/grok-voice-tts-1\.0$/i, voices: ['Ara', 'Eve'] },
];
const CLONE_MODELS = /voxtral|mai-voice-2|gemini.*flash.*tts/i;

/** USD per character from a catalog entry; unknown = $100 per million. */
function pricePerChar(m) {
  const p = m?.pricing ?? {};
  for (const k of ['characters', 'character', 'input_character']) {
    const v = Number(p[k]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  const prompt = Number(p.prompt);
  // Token-billed models: about 4 characters a token, audio out priced higher; count 10x to be safe.
  if (Number.isFinite(prompt) && prompt > 0) return (prompt * 10) / 4;
  const values = Object.values(p);
  if (values.length && values.every((v) => Number(v) === 0)) return 0;
  return 100 / 1_000_000;
}

async function main() {
  const key = readKey();
  mkdirSync(out, { recursive: true });
  const auth = { Authorization: `Bearer ${key}` };
  const res = await fetch('https://openrouter.ai/api/v1/models?output_modalities=speech', { headers: auth });
  let models = res.ok ? (await res.json()).data ?? [] : [];
  if (!models.length) {
    const all = await fetch('https://openrouter.ai/api/v1/models', { headers: auth }).then((r) => r.json());
    models = (all.data ?? []).filter(
      (m) => /speech|audio/.test(JSON.stringify(m.architecture?.output_modalities ?? '')) || /tts|voice|kokoro|eleven|fish/i.test(m.id),
    );
  }
  writeFileSync(
    path.join(out, 'models.json'),
    JSON.stringify(models.map((m) => ({ id: m.id, pricing: m.pricing, out: m.architecture?.output_modalities })), null, 2),
  );
  console.log(`Speech models in the catalog: ${models.length} (saved to models.json)`);

  const jobs = [];
  for (const c of CANDIDATES) {
    const m = models.find((x) => c.match.test(x.id));
    if (!m) continue;
    if (only && !only.test(m.id)) continue;
    for (const voice of c.voices) jobs.push({ model: m.id, voice, pcm: !!c.pcm, cost: pricePerChar(m) * PASSAGE.length });
  }
  const clone = typeof args.clone === 'string' ? args.clone : null;
  if (clone) {
    for (const m of models.filter((x) => CLONE_MODELS.test(x.id)).slice(0, 2)) {
      jobs.push({ model: m.id, voice: '', clone, cost: pricePerChar(m) * PASSAGE.length });
    }
  }

  let spent = 0;
  const done = [];
  for (const j of jobs) {
    if (spent + j.cost > budget) {
      console.log(`skip ${j.model} ${j.voice || 'default'}: would pass the $${budget} budget`);
      continue;
    }
    const label = `${j.model}${j.voice ? ` · ${j.voice}` : ''}${j.clone ? ' · clone' : ''}`;
    if (dry) {
      console.log(`dry: ${label} ≈ $${j.cost.toFixed(4)}`);
      spent += j.cost;
      continue;
    }
    const body = {
      model: j.model, input: PASSAGE, response_format: j.pcm ? 'pcm' : 'mp3', ...(j.voice ? { voice: j.voice } : {}),
      instructions: 'Warm, calm bedtime-story narration for a young child.', provider: { data_collection: 'deny' },
    };
    if (j.clone) {
      const fmt = path.extname(j.clone).slice(1) || 'mp3';
      body.input_references = [{ type: 'input_audio', input_audio: { data: readFileSync(j.clone).toString('base64'), format: fmt } }];
    }
    const t0 = Date.now();
    let r;
    try {
      r = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    } catch (e) {
      console.log(`fail ${label}: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    const ms = Date.now() - t0;
    if (!r.ok) {
      console.log(`fail ${label}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      continue;
    }
    spent += j.cost;
    const bytes = Buffer.from(await r.arrayBuffer());
    const file = `${prefix}${String(done.length + 1).padStart(2, '0')}.${j.pcm ? 'wav' : 'mp3'}`;
    writeFileSync(path.join(out, file), j.pcm ? pcmToWav(bytes) : bytes);
    done.push({ file, label, ms, cost: j.cost });
    console.log(`ok   ${label} ${ms} ms ≈ $${j.cost.toFixed(4)}`);
  }

  // Blind page: samples in random order with letters; the names are in key.json.
  const letters = done
    .map((d) => ({ ...d, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((d, i) => ({ letter: String.fromCharCode(65 + i), label: d.label, ms: d.ms, cost: d.cost, file: d.file }));
  writeFileSync(path.join(out, `${prefix}key.json`), JSON.stringify(letters, null, 2));
  writeFileSync(
    path.join(out, `${prefix}index.html`),
    `<!doctype html><meta charset="utf-8"><title>Voice test</title>
<style>body{font:16px system-ui;max-width:640px;margin:2rem auto;padding:0 1rem}li{margin:1rem 0}</style>
<h1>Voice test (blind)</h1><p>${PASSAGE}</p><p>Listen, note your favourites, then open key.json to see which model each letter is.</p>
<ol type="A">
${letters.map((d) => `<li><audio controls preload="none" src="${d.file}"></audio></li>`).join('\n')}
</ol>`,
  );
  console.log(`\n${done.length} samples, estimated spend $${spent.toFixed(4)} of $${budget}. Open ${path.join(out, `${prefix}index.html`)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
