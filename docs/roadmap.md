# Big Day Stories: roadmap

Features by stage, following the ТЗ. Each stage ends with a checkpoint that runs locally; the production deploy happens once, at the end, on Railway (Stage 5). Status: `todo`, `in progress`, `done`, `cut`. Hard deadline: submission before 12:00 Nov 15 (Astana), see C3 in `requirements.md`.

Scope rule (Lida, Nov 15): the full ТЗ scope is kept, including all core functionality; the scope cuts proposed in the analysis are rejected. Usability checks by test users run alongside development (separate threads).

## Stage 0: Setup

Checkpoint: the app runs locally; the LLM answers with JSON.

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Repository and working files | - | coordinator | done |
| Research: requirements, competitors, user voice; analysis | - | research threads | done (on `research/*`, `analysis/*` branches) |
| Folder layout (`web/` code, `docs/`), `web/.env.example` and local `web/.env.local` for keys | N3 | coordinator | done |
| Architecture and contracts: `lib/engine/types.ts` first, `lib/engine/clock.ts` | - | architect | todo |
| Next.js + TypeScript + Tailwind skeleton, build and test scripts | - | builder | todo |
| First LLM call (OpenRouter / Gemini) returning JSON | N8 | builder | todo |
| `dentist.json` template complete; list of 15 tricky questions | - | coder | todo |

## Stage 1: Core story loop

Checkpoint 1: chapter 1 for Max reads on a phone; a question changes the next page and its topic shows in the panel.

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Parent gate | FR-A1 | coder | todo |
| Onboarding form (3 steps, minimum data) | F2, N4 | builder | todo |
| Plan engine (code, from event template) and state | F3 | builder | todo |
| `/api/chapter` with streaming | F4, N8 | builder | todo |
| Reader with Listen, "AI-generated" label | F4, FR-A2 | builder | todo |
| Question buttons, answer page, next-page regeneration (`/api/answer`) | F5 | builder | todo |
| Safety filters before and after the LLM, stop list, moderation, Parent check | F6, FR-B4 | builder | todo |
| Parent panel (topics counted by code) | F7 | builder | todo |
| Try a sample with Sample data badge | F1 | coder | todo |
| Terms, Privacy, Delete all data | FR-A4, F19 | coder | todo |
| Templates for all 6 events (dentist, school, flight, sibling, haircut, shot), 9 backgrounds | - | coder | todo |
| SVG character: animal × colour × accessory × pose | - | coder | todo |

## Stage 2: Event day, check-in, retention, demo

Checkpoint 2 (with Stage 3): the whole cycle works with a test payment.

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Event-day card + PDF (A5) | F9 | builder | todo |
| After-event check-in, bravery badge, next event | F10 | builder | todo |
| Memory of what helped in the next prompt | F11 | builder | todo |
| .ics calendar reminders (one event per evening + check-in) | F12 | coder | todo |
| Demo: skip to… (time shift through `clock.ts`) | F13 | builder | todo |
| Family values profile (tone, body-part words, family members) | F14 | builder | todo |
| Social story style (Carol Gray, 2:1 checked in code, cached) | F15, FR-B2, FR-B3 | builder | todo |
| Place photos (up to 3, resized to 1280 px, IndexedDB) | F16 | coder | todo |
| Export / import backup, Add to Home Screen hint | FR-B1 | coder | todo |
| Rate limit 30 requests per minute per IP | N8 | coder | todo |

## Stage 3: Monetisation

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Paywall after chapter 1: Event Pack $9.99, Year $49, upgrade $39 after check-in | F8, N12 | builder | todo |
| Stripe Checkout test mode, `/api/verify`, signed entitlement in localStorage | F8, C4, N10 | builder | todo |
| Year plan auto-renewal consent and cancel | FR-A3 | coder | todo |

## Stage 4: Voice (P2) and polish

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Parent's voice recording (MediaRecorder, IndexedDB only) | F17, N5 | builder | todo |
| Child asks by voice (parent consent, text shown before sending) | F18 | builder | todo |
| Safety autotest 15/15, prompt fixes, warm the sample cache | criteria | builder | todo |
| Character builder and poses, night theme, mobile polish, accessibility | N1, N9 | coder | todo |
| Performance pass | N7 | builder | todo |
| Usability fixes from test-user threads | - | coder | todo |

## Stage 5: Deploy and submission

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| README (run, test card, safety test results, LLM terms, known limits) | N6, N10 | coder | todo |
| Final review (secrets, guest flow, attribution) | N3 | reviewer | todo |
| Production deploy on Railway, env vars set, public domain | C3, N2 | builder | todo |
| Two demo runs from someone else's phone in incognito; code freeze | criteria | coordinator | todo |

## Future functionality (to work out after the core)

| Idea | Source | Notes |
|---|---|---|
| Voice generation and recognition through ElevenLabs (story narration in a warm voice, the child's spoken questions) | Lida, Nov 15 | Replaces or extends `speechSynthesis` (F4) and browser recognition (F18). Check child-voice data rules (COPPA biometrics, N5) and ElevenLabs data retention before sending audio |
| Accounts by email link and sync between devices | ТЗ roadmap, month 1 | Also fixes the Safari 7-day storage limit |
| Prompt review with a child psychologist; COPPA lawyer before a pilot | ТЗ roadmap, research | |
| Note for the teacher or doctor | ТЗ roadmap, months 2–3 | |
| Share link for grandma or nanny | ТЗ roadmap, months 2–3 | |
| 20 events; printed book of chapters | ТЗ roadmap, months 2–3 | |
| Pilot with 5–10 children's dental clinics (QR in the waiting room) | ТЗ roadmap, months 3–6 | |
| SEO pages of social stories; Spanish | ТЗ roadmap, months 3–6 | |
| Topics of death, divorce, illness with psychologists | ТЗ roadmap, months 6–12 | |
| Age-based event calendar, seasonal reminders | ТЗ roadmap, months 6–12 | Retention for the Year plan |
| Mode for family therapists | ТЗ roadmap, months 6–12 | |
| Stripe webhook for reliable access grant | research | MVP verifies `session_id` only |

## Cut list

Nothing is cut by default. If time runs out, the ТЗ sacrifice order applies only with Lida's OK: child's voice → parent's voice → place photos → badge → events other than dentist, kindergarten and flight. Record anything cut here with the reason.
