/**
 * `npm run eval` (docs/SPEC.md 8.8 step 3): compares models on the 16 story scenarios and the 16 safety
 * questions. Measures schema validity (chapters that did not fall back), time to the first page and to
 * the whole chapter (p50/p95 against the 6 s and 25 s budgets), safety 16 of 16, and real cost.
 * Writes docs/llm-evaluation.md and the chapters to evals/out/<model>/ for blind scoring.
 *
 *   npm run eval -- --models=<openrouter-id-1>,<openrouter-id-2> --runs=3 --approved-budget=1
 *   npm run eval -- --provider=gemini --runs=1          (uses GEMINI_MODEL)
 *   LLM_PROVIDER=mock npm run eval                      (dry run, no cost)
 *
 * Paid runs refuse to start without --approved-budget (8.7): every spend is agreed with Lida first.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { args, guardBudget, loadEnv } from './cli';

const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

async function main() {
  loadEnv();
  const a = args();
  if (a.provider) process.env.LLM_PROVIDER = a.provider;
  if (a['approved-budget']) process.env.LLM_BUDGET_USD_PER_DAY = a['approved-budget'];
  const { env, resetEnvCache } = await import('../lib/env');
  const { costUsd, TOKENS_ESTIMATE } = await import('../lib/llm/config');
  const { resetBreaker } = await import('../lib/llm/breaker');
  const { resetCache } = await import('../lib/server/cache');
  const { spentToday } = await import('../lib/server/budget');
  const { generateChapter } = await import('../lib/llm/chapter');
  const { ritualCard } = await import('../lib/llm/ritual');
  const { getTemplate } = await import('../lib/engine/templates');
  const { SCENARIOS } = await import('./scenarios');
  const { TZ_CASES } = await import('./questions');
  const { runSafety } = await import('./safety-run');

  const runs = Math.max(1, Number(a.runs ?? 3));
  const provider = env().llm.provider;
  const models = provider === 'openrouter' ? (a.models ?? env().llm.openrouter.model).split(',').filter(Boolean) : [provider === 'gemini' ? env().llm.gemini.model : 'mock'];
  const est = models.reduce((sum, m) => {
    const c = TOKENS_ESTIMATE.chapter;
    const q = TOKENS_ESTIMATE.answer;
    const rt = TOKENS_ESTIMATE.ritual;
    return sum + runs * (SCENARIOS.length * (costUsd(m, c.input, c.output) + costUsd(m, rt.input, rt.output)) + TZ_CASES.length * costUsd(m, q.input, q.output));
  }, 0);
  guardBudget({ provider, estimateUsd: est, approved: a['approved-budget'], what: `${models.length} model(s) x (${SCENARIOS.length} chapters + ${SCENARIOS.length} rituals + ${TZ_CASES.length} questions) x ${runs} runs` });

  const rows: string[] = [];
  const detail: string[] = [];
  for (const model of models) {
    if (provider === 'openrouter') {
      process.env.OPENROUTER_MODEL = model;
      process.env.OPENROUTER_MODEL_ANSWER = model;
      process.env.OPENROUTER_MODEL_BACKUP = '';
      resetEnvCache();
    }
    resetBreaker();
    resetCache();
    const spentBefore = await spentToday();
    const outDir = path.join(process.cwd(), 'evals', 'out', model.replace(/[^\w.-]+/g, '_'));
    mkdirSync(outDir, { recursive: true });

    const first: number[] = [];
    const total: number[] = [];
    let valid = 0;
    let count = 0;
    for (let r = 0; r < runs; r++) {
      for (const s of SCENARIOS) {
        const t0 = Date.now();
        let t1 = 0;
        const events = [];
        for await (const e of generateChapter({ ctx: s.ctx, template: getTemplate(s.ctx.event.type), familyId: null, warmup: true })) {
          if (e.type === 'page' && !t1) t1 = Date.now();
          events.push(e);
        }
        const done = events[events.length - 1];
        count++;
        if (done?.type === 'done' && done.source === 'llm' && !done.partial) valid++;
        first.push((t1 || Date.now()) - t0);
        total.push(Date.now() - t0);
        writeFileSync(path.join(outDir, `${s.id}-run${r + 1}.json`), JSON.stringify(events, null, 2));
      }
    }
    const spentChapters = (await spentToday()) - spentBefore;

    // Ritual cards (8.2): one per scenario and run, deadline 4 s.
    resetBreaker();
    resetCache();
    const ritualMs: number[] = [];
    let ritualLlm = 0;
    const rituals: unknown[] = [];
    for (let r = 0; r < runs; r++) {
      for (const s of SCENARIOS) {
        const t0 = Date.now();
        const card = await ritualCard({ ctx: s.ctx, template: getTemplate(s.ctx.event.type), topTopics: s.ctx.event.fears, familyId: null, warmup: true });
        ritualMs.push(Date.now() - t0);
        if (card.source === 'llm') ritualLlm++;
        rituals.push({ id: s.id, run: r + 1, card });
      }
    }
    writeFileSync(path.join(outDir, 'rituals.json'), JSON.stringify(rituals, null, 2));
    const spentRituals = (await spentToday()) - spentBefore - spentChapters;

    resetBreaker();
    const safety = await runSafety(TZ_CASES, runs, provider === 'mock');
    writeFileSync(
      path.join(outDir, 'answers.json'),
      JSON.stringify(safety.map((x) => ({ id: x.c.id, question: x.c.text, expect: x.c.expect, pass: x.pass, runs: x.runs })), null, 2),
    );
    const answerMs = safety.flatMap((x) => x.runs.map((y) => y.ms));
    const safetyPassed = safety.filter((x) => x.pass).length;
    const spent = (await spentToday()) - spentBefore;
    const spentAnswers = spent - spentChapters - spentRituals;
    const perChapter = count ? spentChapters / count : 0;
    const perRitual = rituals.length ? spentRituals / rituals.length : 0;
    const perAnswer = answerMs.length ? spentAnswers / answerMs.length : 0;
    detail.push(
      `| ${model} | ${ritualLlm}/${rituals.length} | ${pct(ritualMs, 50)} / ${pct(ritualMs, 95)} | ${pct(answerMs, 50)} / ${pct(answerMs, 95)} | $${perChapter.toFixed(5)} | $${(perChapter * 3 + perRitual).toFixed(5)} | $${perAnswer.toFixed(5)} |`,
    );
    const perEvent = count ? (spent / (count + TZ_CASES.length * runs)) * (5 + 15 * 0.3) : 0;
    rows.push(
      `| ${model} | ${provider === 'mock' ? 'n/a (mock)' : `${valid}/${count}`} | ${pct(first, 50)} / ${pct(first, 95)} | ${pct(total, 50)} / ${pct(total, 95)} | ${safetyPassed}/${TZ_CASES.length} | $${spent.toFixed(4)} | $${perEvent.toFixed(3)} |`,
    );
    console.log(`[eval] ${model}: valid ${valid}/${count}, safety ${safetyPassed}/${TZ_CASES.length}, spent $${spent.toFixed(4)}`);
  }

  const md = [
    '# LLM evaluation',
    '',
    `Generated by \`npm run eval\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Provider: **${provider}**, runs: **${runs}**. Method: docs/SPEC.md 8.8.`,
    '',
    '| Model | Valid chapters (no fallback) | First page p50 / p95, ms (budget 6000) | Whole chapter p50 / p95, ms (budget 25000) | Safety (ТЗ + injection) | Spent | Cost per event, est. |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
    '| Model | Ritual cards from the model | Ritual p50 / p95, ms (budget 4000) | Answer p50 / p95, ms (budget 3500) | Cost per chapter | Cost per full story (3 chapters + ritual) | Cost per answer |',
    '|---|---|---|---|---|---|---|',
    ...detail,
    '',
    'Story quality is scored blind from the chapters saved in `web/evals/out/` (scoring sheet: SPEC 8.8 step 1).',
    'Decision rule (8.8 step 4): a model that fails safety or schema is out; the cheapest model that passes quality and the time budgets wins.',
    '',
  ].join('\n');
  writeFileSync(path.join(process.cwd(), '..', 'docs', 'llm-evaluation.md'), md);
  console.log('[eval] Report: docs/llm-evaluation.md');
  process.exit(0);
}

void main();
