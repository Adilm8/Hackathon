# AI layer and safety (stream B)

Spec: `docs/SPEC.md` sections 8 (AI layer and safety), 9 (`/api/chapter`, `/api/answer`, `/api/ritual`), 12.3–12.4, 14.2.

## Files

| File | What it does |
|---|---|
| `lib/safety/filters.ts` | Level 1, **also for the browser**: `cleanText` (length cut, markup, name → `[[CHILD]]`, phones, emails, URLs, addresses), `precheck` (unsafe / sensitive / redirect), `isBlank`, `LIMITS` |
| `lib/safety/stoplist.ts` | Word lists: unsafe, sensitive, redirect patterns; stop phrases and output patterns of level 4 |
| `lib/safety/postcheck.ts` | Level 4: `checkText` (stop phrases, dosages, links, contacts, invented names, profanity) |
| `lib/safety/messages.ts` | Fixed texts: the unsafe message for the child, the help-line note for the adult, the own-question fallback, hints |
| `lib/llm/providers.ts` | Gemini, OpenRouter (data collection denied), mock; one code path through the AI SDK |
| `lib/llm/run.ts` | One guarded call: budget, per-family limit, circuit breaker, deadline, safety block, schema, usage log |
| `lib/llm/chapter.ts`, `answer.ts`, `ritual.ts` | The three calls with their fallbacks |
| `lib/llm/prompts/*.v1.ts` | Versioned prompts (8.3, 8.4) |
| `lib/llm/validate.ts`, `fallback.ts`, `mock.ts` | Checks of model output, template fallbacks, mock output |
| `lib/llm/deps.ts` | The only imports from other streams (templates, session, access, child name) |
| `lib/llm/warm.ts` | Opt-in background generation of the sample chapters for the cache |
| `lib/server/budget.ts`, `cache.ts` | Daily dollar cap and `llm_calls` log; one-hour cache of chapters and day cards |
| `evals/` | `npm run safety`, `npm run eval`, the question set and the story scenarios |

## For the screens (stream C, G)

- Before sending a question, run `cleanText(text, { max: LIMITS.question, childName, pronunciation })` and `isBlank`; show `BLANK_QUESTION_HINT` / `TOO_LONG_HINT`. The server repeats the same cleaning with the name from the server copy.
- `/api/answer` stream: `category` → `answer` | `draft` → `nextPage` → `done`. If a second `category` line arrives it only ever raises the category (for example `sensitive` → `unsafe`): **the last `category` wins**.
- `unsafe`: the stream is `category` then `done`. The browser shows `UNSAFE_CHILD_MESSAGE` and, small, `UNSAFE_ADULT_NOTE`; the question is not stored or counted.
- `sensitive`: show nothing to the child; Parent check gets `draft.text`. An empty draft means "open Parent check with *I'll answer myself* only".
- `source: 'fallback'` marks template text (also everything the mock provider writes).
- `nextPage` arrives only for `on_topic` in story style; set `updatedBecause` to the question id in the browser.
- Page `addresses` are already confirmed by the topic words (A9) on the server.
- Errors: 400 for a blank question or a fourth question in a chapter, 401 without a session, 402 for chapter 2+ and the day card without access, 429 for a request flood from one IP. An LLM failure is never an error: the fallback comes with `source: 'fallback'`.

## Configuration

`LLM_PROVIDER` = `mock` (default, no cost) | `gemini` (`GEMINI_API_KEY`, `GEMINI_MODEL`) | `openrouter` (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, optional `OPENROUTER_MODEL_ANSWER`, `OPENROUTER_MODEL_BACKUP`). `LLM_BUDGET_USD_PER_DAY` (default 1). `LLM_MOCK_DELAY_MS` slows the mock stream (15 ms per chunk in development). `LLM_WARM_SAMPLE=on` warms the sample chapters (spends money on a paid provider).

## Scripts

- `npm run safety` writes `docs/safety-report.md`. On the mock it tests levels 1 and 4 and costs nothing. With `gemini` or `openrouter` it prints the estimate and refuses to start without `--approved-budget=<usd>`.
- `npm run eval -- --models=a,b --runs=3 --approved-budget=<usd>` compares OpenRouter models (8.8 step 3) and writes `docs/llm-evaluation.md`; chapters for blind scoring go to `web/evals/out/` (not committed).

## Defaults chosen, to revisit with Lida

1. Questions that try to change the rules ("ignore your rules", "system prompt"), rude words and non-English questions are answered by code with a kind off-topic line, without a model call. Cheaper and predictable; the ТЗ expects off-topic for these.
2. The sensitive list is deliberately wide (for example "hospital", "touch me", "God"): a false hit only sends the question through Parent check.
3. Gemini safety filter at `BLOCK_LOW_AND_ABOVE`; reasoning off (`reasoning: 'none'`). A blocked answer falls back like any failure.
4. Prices of unknown models are counted high ($2 / $10 per million tokens) so the daily cap errs on the safe side; OpenRouter reports the real cost and that number is used.
5. The jury path is cached per context for an hour after the first reader. Warming the sample at boot and every hour (12.3, `lib/llm/warm.ts`) is **off by default** because it spends on a paid provider (5 chapters an hour); switch it on with `LLM_WARM_SAMPLE=on` once Lida approves. It builds the sample from `lib/engine/sample.ts`, so `/api/sample` should seed from the same builder for the cache to match.
6. Help-line numbers in `messages.ts` must be re-checked before submission (8.6).
7. A safety run on Gemini needs an approved budget, even on the free tier, because the script cannot know the billing plan (estimate for 65 questions × 3 runs: about $0.28 at Flash prices).

## Sources

- AI SDK (`ai`, `@ai-sdk/google`), Apache-2.0, github.com/vercel/ai; `@openrouter/ai-sdk-provider`, Apache-2.0, github.com/OpenRouterTeam/ai-sdk-provider.
- `obscenity` (profanity matching with leetspeak handling), MIT, github.com/jo3-l/obscenity.
- Five levels of protection and the classification follow the ТЗ; the first-name list in `stoplist.ts` comes from the public SSA lists of popular baby names.
