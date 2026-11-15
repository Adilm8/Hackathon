/**
 * Story frames on the server (lib/frames/prompt.ts). Server-only. One picture per page text through
 * OpenRouter's image models, saved on disk by a hash of model + prompt, so a page is drawn once for
 * every family that reads it. Off until FRAMES_MODEL is set. Spend counts against the LLM daily cap
 * and its own FRAMES_BUDGET_USD_PER_DAY; past either, the painted scene shows instead.
 */
import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { recordCall, spentToday } from '../server/budget';
import { cacheKey } from '../server/cache';
import { env } from '../env';

export type FrameResult = { image: Buffer; cached: boolean } | { error: 'disabled' | 'budget' | 'upstream' };

/** USD per picture on OpenRouter (catalog, 15 Nov 2026). Unknown models use FRAMES_PRICE_USD. */
const PRICES: [RegExp, number][] = [
  [/:free$/, 0], [/recraft-v4\.1-flash/, 0.0028], [/flux-3-image-klein/, 0.0032], [/muse-image/, 0.004],
  [/seedream-5-0-flash/, 0.0072], [/flux-3-image$/, 0.0164], [/gemini-.*image/, 0.04],
];
export function framePrice(model: string, fallback: number): number {
  return PRICES.find(([re]) => re.test(model))?.[1] ?? fallback;
}

const spent = { day: '', usd: 0 };
function framesSpent(add = 0): number {
  const day = new Date().toISOString().slice(0, 10);
  if (spent.day !== day) Object.assign(spent, { day, usd: 0 });
  spent.usd += add;
  return spent.usd;
}

function dir(): string {
  return env().frames.cacheDir || path.join(process.cwd(), '.data', 'frames');
}

export async function drawFrame(prompt: string, familyId: string | null): Promise<FrameResult> {
  const { frames, llm } = env();
  if (!frames.enabled) return { error: 'disabled' };
  const file = path.join(dir(), `${cacheKey(['frame', 1, frames.model, prompt])}.webp`);
  try {
    return { image: await readFile(file), cached: true };
  } catch {
    /* not drawn yet */
  }
  const price = framePrice(frames.model, frames.priceUsd);
  if (framesSpent() + price > frames.budgetUsdPerDay || (await spentToday()) + price > llm.budgetUsdPerDay) return { error: 'budget' };
  const t0 = Date.now();
  let outcome: 'ok' | 'error' | 'timeout' = 'error';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${llm.openrouter.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: frames.model,
        modalities: ['image'],
        messages: [{ role: 'user', content: prompt }],
        image_config: { aspect_ratio: '16:9' },
        ...(frames.model.endsWith(':free') ? {} : { provider: { data_collection: 'deny' } }),
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error(`[frames] upstream ${res.status}`);
      return { error: 'upstream' };
    }
    const json = (await res.json()) as { choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[] };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) return { error: 'upstream' };
    const raw = url.startsWith('data:') ? Buffer.from(url.slice(url.indexOf(',') + 1), 'base64') : Buffer.from(await (await fetch(url)).arrayBuffer());
    const image = await sharp(raw).resize(1280, 720, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    outcome = 'ok';
    framesSpent(price);
    await mkdir(dir(), { recursive: true }).catch(() => {});
    await writeFile(file, image).catch((e) => console.error('[frames] cache write failed:', e instanceof Error ? e.message : e));
    return { image, cached: false };
  } catch (e) {
    outcome = e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'error';
    return { error: 'upstream' };
  } finally {
    await recordCall({
      familyId, route: 'frame', provider: 'openrouter', model: frames.model,
      inputTokens: prompt.length, outputTokens: 0, costUsd: outcome === 'ok' ? price : 0,
      latencyMs: Date.now() - t0, outcome,
    });
  }
}
