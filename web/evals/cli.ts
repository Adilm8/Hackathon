/**
 * Shared helpers of the evaluation scripts: env loading, argument parsing and the spending guard
 * (docs/SPEC.md 8.7): a script that would call a paid model prints its estimate first and refuses to
 * start without --approved-budget=<usd> at least as large as the estimate.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

export function loadEnv(): void {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (existsSync(p)) {
      try {
        process.loadEnvFile(p);
      } catch {
        // ignore malformed files; env() falls back to mock
      }
    }
  }
}

export function args(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? 'true';
  }
  return out;
}

export function guardBudget(opts: { provider: string; estimateUsd: number; approved?: string; what: string }): void {
  console.log(`[eval] ${opts.what}: provider ${opts.provider}, estimated cost $${opts.estimateUsd.toFixed(4)}`);
  if (opts.provider === 'mock') return;
  const approved = Number(opts.approved);
  if (!opts.approved || !Number.isFinite(approved)) {
    console.error('[eval] Refusing to start: this run calls a paid model. Ask for a budget, then pass --approved-budget=<usd>.');
    process.exit(2);
  }
  if (approved === 0) {
    console.log('[eval] Approved budget is $0: run only with a free-tier key (no billing on the provider project).');
    return;
  }
  if (opts.estimateUsd > approved) {
    console.error(`[eval] Refusing to start: estimate $${opts.estimateUsd.toFixed(4)} is above the approved $${approved}.`);
    process.exit(2);
  }
}
