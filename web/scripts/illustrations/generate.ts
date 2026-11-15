/**
 * Makes the illustrated scene backgrounds (lib/illustrations) through OpenRouter's image models.
 *
 *   npm run illustrations                      # every missing picture, free Recraft model
 *   npm run illustrations -- --only=dentist    # one event (or neutral)
 *   npm run illustrations -- --force --only=events/dentist/what_happens
 *   npm run illustrations -- --model=black-forest-labs/flux-3-image-klein --max-usd=0.30
 *   npm run illustrations -- --dry-run         # print the prompts, spend nothing
 *
 * Needs OPENROUTER_API_KEY (web/.env.local is read). Paid models stop once --max-usd is reached
 * (default 0, so only free models run unless a budget is given). Pictures are saved as
 * public/illustrations/<key>.webp (1280x720) and listed with a content hash in
 * content/illustrations/manifest.json, so the app shows only pictures that exist.
 * Look through every new picture before committing it.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { allIllustrationKeys, illustrationPrompt } from '../../lib/illustrations/prompts';

const root = path.resolve(__dirname, '../..');
const manifestFile = path.join(root, 'content/illustrations/manifest.json');
const outDir = path.join(root, 'public/illustrations');

/** USD per image on OpenRouter (catalog, 15 Nov 2026: 1670 image tokens per ~1K picture). */
const PRICES: [RegExp, number][] = [
  [/:free$/, 0], [/recraft-v4\.1-flash/, 0.0028], [/flux-3-image-klein/, 0.0032], [/muse-image/, 0.004],
  [/seedream-5-0-flash/, 0.0072], [/flux-3-image$/, 0.0164], [/gemini-.*flash.*image/, 0.04],
];

function arg(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : process.argv.includes(`--${name}`) ? 'true' : undefined;
}

function loadEnvLocal() {
  const f = path.join(root, '.env.local');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generate(model: string, prompt: string, key: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        modalities: ['image'],
        messages: [{ role: 'user', content: prompt }],
        image_config: { aspect_ratio: '16:9' },
        // Free endpoints only exist with training allowed; the prompts hold no personal data.
        ...(model.endsWith(':free') ? {} : { provider: { data_collection: 'deny' } }),
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (res.status === 429 && attempt < 6) {
      const wait = 15_000 * attempt;
      console.log(`  rate limited, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    const body = await res.text();
    if (!res.ok) throw new Error(`${key}: ${res.status} ${body.slice(0, 300)}`);
    const url: string | undefined = JSON.parse(body).choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error(`${key}: no image in the answer ${body.slice(0, 300)}`);
    if (url.startsWith('data:')) return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    const img = await fetch(url);
    return Buffer.from(await img.arrayBuffer());
  }
}

async function main() {
  loadEnvLocal();
  const model = arg('model') || 'recraft/recraft-v4.1-flash-v2:free';
  const only = arg('only');
  const force = arg('force') === 'true';
  const dry = arg('dry-run') === 'true';
  const maxUsd = Number(arg('max-usd') ?? '0');
  const price = PRICES.find(([re]) => re.test(model))?.[1];
  if (price === undefined && !dry) throw new Error(`Unknown price for ${model}: add it to PRICES first`);

  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { version: number; model?: string; files: Record<string, string> };
  const keys = allIllustrationKeys().filter((k) => !only || k === only || k.split('/').includes(only));
  const todo = keys.filter((k) => force || !manifest.files[k]);
  console.log(`${todo.length} of ${keys.length} pictures to make with ${model}${price ? ` (~$${(todo.length * price).toFixed(3)})` : ''}`);
  if (!dry && !process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set');

  let spent = 0;
  let failed = 0;
  for (const key of todo) {
    const prompt = illustrationPrompt(key)!;
    if (dry) {
      console.log(`\n## ${key}\n${prompt}`);
      continue;
    }
    if (price && spent + price > maxUsd + 1e-9) {
      console.log(`Stopped: the budget of $${maxUsd} is reached (pass --max-usd to raise it)`);
      break;
    }
    process.stdout.write(`${key} … `);
    const t0 = Date.now();
    try {
      const raw = await generate(model, prompt, key);
      spent += price ?? 0;
      const webp = await sharp(raw).resize(1280, 720, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
      const file = path.join(outDir, `${key}.webp`);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, webp);
      manifest.files[key] = createHash('sha256').update(webp).digest('hex').slice(0, 10);
      manifest.model = model;
      // Saved after every picture, so a stopped run keeps what it made.
      writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
      console.log(`ok ${((Date.now() - t0) / 1000).toFixed(1)}s, ${(webp.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      failed++;
      console.log(`failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (!dry) console.log(`Done. Spent about $${spent.toFixed(3)}, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
