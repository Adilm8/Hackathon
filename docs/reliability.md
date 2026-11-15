# Reliability: what happens when something fails

Every outside service Big Day Stories uses is optional for the core loop. The rule from SPEC 2.3 (A1) holds everywhere: **the child's screen is never empty and never shows an error**. Every model call has a written template behind it, every premium feature has a free one behind it, and the family plan lives on the device first and on the server second.

Live status: `GET /api/health` (see [below](#apihealth)).

## Failure → behaviour → fallback

### AI (OpenRouter)

| Failure | What the app does | Fallback the family sees | Where |
|---|---|---|---|
| OpenRouter down, DNS or network error | The call fails at once; after 2 failures in 60 s the circuit breaker holds that model back for 2 min | Backup model (`OPENROUTER_MODEL_BACKUP`), then the written template pages for the chapter's beats | `lib/llm/run.ts`, `breaker.ts`, `providers.ts` |
| Model slow | Server deadlines: first page 5 s, whole chapter 25 s, answer 3.5 s, next page 12 s, event-day card 4 s. The browser waits 1 s longer | Pages already streamed are kept; the rest of the chapter comes from the template (`partial: true`) | `lib/llm/config.ts`, `chapter.ts`, `lib/store/story.ts` |
| Provider rate limit (HTTP 429) | The model is paused for the time the provider asked (`Retry-After`, at most 10 min) | Backup model or templates | `lib/llm/run.ts` |
| Malformed output (bad JSON, wrong schema) | Each page is validated with zod; one retry before the first page if there is time | A bad page is replaced by the matching template page; a failed chapter is all template pages | `chapter.ts`, `validate.ts` |
| Unsafe or off-tone text from the model | Level-4 check (stop phrases, false promises, scary or medical content, words the parent asked to avoid) | The page or answer is replaced by its template | `lib/safety/postcheck.ts`, `validate.ts` |
| Provider safety block (content filter) | Treated as a failed call | Template | `run.ts` |
| Daily spend cap reached (`LLM_BUDGET_USD_PER_DAY`, default $1) | No more paid calls until midnight UTC; every skipped call is still logged | Templates for stories, answers and cards; device voice instead of the premium voice | `lib/server/budget.ts` |
| No key or no model configured | The mock provider (free, offline) runs and labels its text `fallback` | The full product works from templates | `lib/env.ts` |
| Database down while logging a call | Only the log line is lost; the answer is not affected | none needed | `budget.ts` |

### Child's questions and safety

| Situation | Behaviour |
|---|---|
| Unsafe question (abuse, self-harm, danger) | Caught by word lists in the browser and again on the server **before** any model call. The child sees a calm "let's find a grown-up" message; the parent sees help lines (Childhelp, 988, 911). Nothing is sent to a model |
| Sensitive question (death, body, divorce...) | Category fixed to `sensitive`; the child gets no model text, the parent gets a drafted answer in Parent check. The model can raise a category, never lower it |
| Rude words, attempts to change the rules, non-English text | A kind redirect line written in code, no model call |
| Empty or whitespace-only question | Refused with a hint to type a question |
| More than 3 questions in a chapter | "Great questions tonight. Let's ask more tomorrow." |
| Phone numbers, emails, URLs, addresses, the child's name in a question | Removed or replaced by `[[CHILD]]` before anything leaves the device |
| Own question times out | "That's a great question. Let's ask [[GROWNUP]] together." Button questions get their written answer and a locally rewritten next page |

### Voice

| Failure | Behaviour | Fallback |
|---|---|---|
| Premium voice off (no `TTS_MODEL`) | `GET /api/tts` says off; the voice picker shows device voices only | Device voice (Web Speech API) |
| Premium voice fails on the first sentence | `/api/tts` answers 503 | The device voice reads the page |
| Premium voice fails in the middle of a page (network, provider, audio element error, autoplay refused) | **New:** the device voice continues from the sentence that failed, highlighting stays in step | Device voice for the rest of the page |
| Voice spend cap reached | `/api/tts` answers 503 "Daily voice budget reached" | Device voice |
| Provider slow | 20 s timeout (30 s for the cloned voice) | Device voice |
| Parent's cloned voice: no sample saved, sample deleted, clone model fails | `/api/tts` answers 503 `no_sample` or `upstream_failed` | Device voice; Settings still lets the parent record again |
| Recording too short, too long or unreadable | Refused with a clear message before upload; nothing stored | Record again |
| No speech voice on the device at all | Listen is hidden | Reading on screen |
| Audio cache disk not writable | Audio still plays, it is only not cached | none needed |

### Pictures

| Failure | Behaviour |
|---|---|
| Unknown scene id (for example from a model) | The cosy-room scene |
| **New:** scene file fails to load (night variant missing, offline before it was cached, a generated picture removed) | Falls back to the day scene, then the cosy-room scene, then hides the picture; the page colour shows through |
| Painted scene picture missing or fails to load | The built-in SVG scene for the same place (IllustratedScene) |

### Payments (Stripe, test mode only)

| Failure | Behaviour |
|---|---|
| No Stripe key | Development: mock checkout. Production: the paywall says payments are not set up; in the jury sample "Skip payment (demo access)" still unlocks everything |
| A live key is set | Refused: payments pause with a message (test keys only, N10) |
| Stripe slow or erroring | 20 s timeout, 2 automatic retries; the parent sees "The payment service did not answer. Please try again." |
| Webhook secret missing or webhook late | Access is also granted on return from Checkout (`/api/verify`), so the parent never waits for the webhook |
| Double purchase | Refused: "This big day is already unlocked" / "You already have Gold" |
| Payment cancelled | Back to the paywall with nothing changed |

### Database and sync

| Failure | Behaviour |
|---|---|
| Database down | **New:** connections time out in 5 s and queries in 10 s instead of hanging; `/api/health` answers 503 `down`. The family plan stays in the browser (IndexedDB); sync shows "offline" and retries with backoff. Chapter 1, answers and the event-day card keep working from the model or templates |
| Database down at server start | **New:** the server starts anyway and reconnects on a later request (at most once every 10 s); background jobs (push, cleanup) start once migrations succeed, retried with a growing pause up to every 5 min. Before, one failed start kept the database off until the next restart |
| Idle connection dropped by the database | **New:** logged; before, an unhandled pool error could crash the process |
| Paid chapter when access cannot be checked | The browser shows the chapter from templates rather than an error |
| Two devices edit the plan | Version check (409): the newer copy wins as a whole and is written to both sides |
| `DATABASE_URL` empty | Embedded PostgreSQL (PGlite) on disk; `/api/health` flags it as degraded in production |

### Reminders, offline and the browser

| Situation | Behaviour |
|---|---|
| No VAPID keys | `GET /api/push` returns no key; reminders are in-app and the calendar (.ics) file |
| Notifications denied, or iPhone not added to Home Screen | The app explains how to enable them (iOS needs Add to Home Screen) and keeps in-app reminders |
| Push service rejects a subscription (gone) | The subscription is removed |
| Offline | Service worker: chapters and screens opened before still work; other pages show the cached home or a friendly offline page. API calls are never cached |
| Stale screens after a deploy | Bump `VERSION` in `web/public/sw.js` |
| iPhone Safari: no Fullscreen API | The reader fills the viewport without the app's chrome (fully, from the Home Screen) |
| No SpeechRecognition (Firefox, some in-app browsers) | The mic button is not offered; typing and the question buttons work |
| Voice questions | Only after the parent's consent in Settings; on-device recognition where the browser confirms it, otherwise the browser's own service (disclosed in the consent text) |
| Microphone denied | Clear message; typing still works |

### Limits and odd input

| Input | Rule |
|---|---|
| Child's name | One word, 2 to 20 letters (first name or nickname, never a surname). **New:** the browser form and the server now use one rule: curly apostrophe (D’Andre, typed by iPhone keyboards), combining marks (Hindi, Thai, decomposed accents) and any script are accepted; emoji, digits and spaces are refused; stored in one Unicode form (NFC). Before, a name with ’ passed the form but the server refused the whole family document, so it never saved |
| Child's age | 2 to 12 on the form and in every server schema; text level and page count follow the age |
| Event date | Today to 60 days ahead on the form ("This date has passed"). **New:** the server refuses dates that do not exist (2026-02-31, month 13) |
| Words to avoid | **New:** the placeholders `[[CHILD]]` and `[[GROWNUP]]` no longer count as words, so avoiding "child" does not strip every sentence; if every template sentence holds an avoided word, a calm neutral page is shown instead of an empty chapter |
| Long fields | Every field has a maximum length in the zod schemas (question 300, own fear 40, captions 60...); request bodies are capped at 512 KB; unknown fields are rejected |
| Unicode and emoji in questions | Accepted and normalised; markup and control characters removed |
| Requests from another site | Refused (same-origin check on every state-changing route) |

Rate limits (per server instance, in memory): AI routes 300 requests per minute per IP and 30 model calls per minute per family; premium voice 120 sentences per minute per family; voice sample upload 6 per minute per IP; checkout 10 per minute per family; new family 20 per minute per IP; push 30 per minute per family. Over the limit the route answers 429 and the browser uses its fallback.

### Demo mode for the jury

With **no keys at all** (`DEMO_MODE=on`, no OpenRouter, Stripe or VAPID keys) the whole tour works: stories, answers and the event-day card come from the templates, the device voice reads, "Skip payment (demo access)" unlocks the plan, reminders are in-app. Each visitor gets their own sample family; **Reset demo** starts a clean one.

## /api/health

`GET /api/health` reports each dependency without any key or family data:

```json
{
  "ok": true,
  "status": "degraded",
  "checks": {
    "database": { "state": "ok", "note": "postgres" },
    "llm": { "state": "degraded", "note": "Daily spend cap reached: templates until midnight UTC" },
    "budget": { "state": "degraded", "note": "$1.0021 of $1.00 today (UTC)" },
    "voice": { "state": "degraded", "note": "Spend cap reached: device voice" },
    "payments": { "state": "ok", "note": "Stripe test mode" },
    "push": { "state": "ok", "note": "Web push reminders on" },
    "sessions": { "state": "ok", "note": "signed cookies" },
    "demo": { "state": "ok", "note": "Jury sample with \"Skip payment\" on" }
  },
  "db": true, "provider": "openrouter", "budgetLeft": false, "paused": [], "version": "0.1.0"
}
```

States: `ok`; `off` (not configured on purpose, the built-in fallback is in use); `degraded` (configured but failing or held back now, fallback in use); `down` (only the database). HTTP 200 for `ok` and `degraded`, 503 for `down`.

## Tests

- `web/tests/api/reliability.test.ts`: OpenRouter unreachable → full template chapter, circuit breaker stops further calls, button answer from the template; voice provider failing → 503 for the device-voice switch; `/api/health` shape and no key in the output.
- `web/tests/api/db-down.test.ts`: unreachable database fails fast, retries are throttled, health says `down`, chapter 1 still streams.
- `web/tests/unit/reliability.test.ts`: names in many scripts and apostrophes, impossible dates, words to avoid vs placeholders, never-empty chapter, every health state.
- Existing: `tests/api/ai-pipeline.test.ts` (model failure, bad schema, slow answer, safety categories), `tests/api/ai.test.ts`, `tests/unit/safety.test.ts`, `npm run safety` (65 safety questions).

## Known limits

- Rate limits, the circuit breaker and the spend total are per server instance (one instance on Railway in the MVP).
- The spend cap is checked before a call, so the last call of the day can go a few cents over.
- If the database is down, a paid family's access to chapters 2+ cannot be checked; the browser shows template pages so the child is not blocked.
