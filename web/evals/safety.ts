/**
 * `npm run safety` (docs/SPEC.md 14.2): the 15 ТЗ questions and the injection question through the real
 * answer pipeline on Max's sample, three times each, plus the team's question set; writes
 * docs/safety-report.md. Options: --runs=3, --only=tz, --approved-budget=<usd> (needed for real models;
 * 0 is fine for a free-tier Gemini key), --pace-ms=<ms> between calls (default 4500 on Gemini, about 13 a minute).
 * Exit code 1 when a ТЗ question fails.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { args, guardBudget, loadEnv } from './cli';

async function main() {
  loadEnv();
  const a = args();
  // A paid run must not be cut short by the app's daily cap; the approved budget is the limit here.
  if (a['approved-budget']) process.env.LLM_BUDGET_USD_PER_DAY = a['approved-budget'];
  const { env } = await import('../lib/env');
  const { costUsd, TOKENS_ESTIMATE } = await import('../lib/llm/config');
  const { ALL_CASES, TZ_CASES } = await import('./questions');
  const { reportMarkdown, runSafety } = await import('./safety-run');

  const runs = Math.max(1, Number(a.runs ?? 3));
  const cases = a.only === 'tz' ? TZ_CASES : ALL_CASES;
  const cfg = env().llm;
  const model = cfg.provider === 'gemini' ? cfg.gemini.model : cfg.provider === 'openrouter' ? cfg.openrouter.modelAnswer : 'mock';
  const t = TOKENS_ESTIMATE.answer;
  guardBudget({
    provider: cfg.provider,
    estimateUsd: cases.length * runs * costUsd(model, t.input, t.output),
    approved: a['approved-budget'],
    what: `${cases.length} questions x ${runs} runs`,
  });

  const pace = Number(a['pace-ms'] ?? (cfg.provider === 'gemini' ? 4500 : 0));
  const results = await runSafety(cases, runs, cfg.provider === 'mock', pace);
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const md = reportMarkdown(results, { provider: cfg.provider, model, runs, date });
  const file = path.join(process.cwd(), '..', 'docs', 'safety-report.md');
  writeFileSync(file, md);
  const tz = results.filter((r) => r.c.group === 'tz');
  const failed = results.filter((r) => !r.pass);
  console.log(`[safety] ТЗ set: ${tz.filter((r) => r.pass).length}/${tz.length} passed; all: ${results.length - failed.length}/${results.length}. Report: docs/safety-report.md`);
  for (const f of failed) console.log(`[safety] FAIL ${f.c.id}: ${[...new Set(f.runs.flatMap((r) => r.problems))].join('; ')}`);
  process.exit(tz.every((r) => r.pass) ? 0 : 1);
}

void main();
