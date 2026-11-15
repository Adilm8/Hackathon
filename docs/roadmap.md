# Big Day Stories: roadmap

Features by stage. The full specification is `docs/SPEC.md`; its build plan (section 15) runs the streams below in parallel threads and branches. Each stage ends with a checkpoint that runs locally; the production deploy happens once, near the end, on Railway with PostgreSQL (Stage 6). Status: `todo`, `in progress`, `done`, `off` (switched off by its flag). Hard deadline: submission before 12:00 Nov 15 (Astana), see C3 in `requirements.md`.

Scope rule (Lida, Nov 15): nothing is cut. A feature that is not passing at code freeze (10:30) is switched off in `flags.ts` and listed in the README as "next". Every feature is open in the MVP; payment unlocks only chapters 2+ and the event-day card (SPEC D15, K3, K11). The cycle is closed on templates and the mock provider before any model is connected (SPEC A1); the working provider for development and tests is Gemini (`LLM_PROVIDER=gemini`), OpenRouter becomes the production choice after the evaluation (SPEC D17, 8.8). Usability checks by test users run alongside development in separate threads (SPEC 14.4).

## Stage 0: Foundation (02:00–02:45, stream S0, alone)

Checkpoint: the app starts locally; types, clock and the dentist template are merged.

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Repository, working files, folder layout, `web/.env.example` | N3 | coordinator | done |
| Specification `docs/SPEC.md` | - | architect | done |
| Scaffold of `web/`: Next.js + TypeScript + Tailwind, app shell, theme tokens, test setup | - | builder | todo |
| `lib/engine/types.ts`, `schemas.ts`, `clock.ts`, `flags.ts` | - | builder | todo |
| `content/events/dentist.json` complete; 16 safety questions | - | coder | todo |

## Stage 1: Core story loop (02:45–05:00, streams A, B, C, F)

Checkpoint 1 (05:00, together with Stage 2): Max's chapter 1 reads on a phone-sized screen; a question changes the next page; the topic shows in the panel; the family survives a reload from the database.

| Feature | Requirements | Stream | Owner | Status |
|---|---|---|---|---|
| Parent gate | FR-A1 | C | coder | todo |
| Onboarding form (3 steps, first name or nickname, never a surname) | F2, N4 | C | builder | todo |
| Plan engine (code, from event template), story state, topics | F3, F7 | A | builder | todo |
| `/api/chapter` with streaming, template fallback, mock provider | F4, N8 | B | builder | todo |
| Reader with Listen, "AI-generated" label | F4, FR-A2 | C | builder | todo |
| Question buttons, answer page, next-page regeneration (`/api/answer`) | F5 | B, C | builder | todo |
| Safety: filters before and after the LLM, stop lists, provider safety settings, Parent check | F6, FR-B4 | B | builder | todo |
| Parent panel (topics counted by code) | F7 | C | builder | todo |
| Try a sample with Sample data badge | F1 | C, D | coder | todo |
| Terms, Privacy | FR-A4 | C | coder | todo |
| SVG character and scenes, icons, night theme base | - | F | coder | todo |

## Stage 2: Persistence with PostgreSQL (02:45–05:00, stream D)

Guest family account without login; plan and history on the server; local-first sync (SPEC D8, sections 6.2, 6.3, 12.2).

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Drizzle schema `web/lib/db/schema.ts`, migrations in `web/drizzle/` applied at start | N13 | builder | todo |
| `DATABASE_URL` set → PostgreSQL (`pg`); empty → embedded PGlite in `web/.data/` | N13 | builder | todo |
| Signed session cookie, silent guest family (`lib/server/session.ts`) | N2, N13 | builder | todo |
| `/api/family`, `/api/state` with version conflict (409), `/api/sample`, `/api/restore` | N13 | builder | todo |
| Local-first sync in the browser (`lib/sync/*`) | N13 | builder | todo |
| Ready test profile for the jury | F1 | coder | todo |
| Delete all data: server rows and every local store | F19 | coder | todo |
| Rate limits (30 LLM calls/min per family, 300/min per IP) and daily LLM budget | N8 | coder | todo |

## Stage 3: Event day, check-in, retention, demo (05:00–07:00, stream G; B connects Gemini)

Checkpoint 2 (07:00, together with Stage 4): the whole cycle works locally with a test payment: sample → paywall → chapters 2+ → day card → check-in → badge → next event prefilled.

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Event-day card + PDF (A5) | F9 | builder | todo |
| After-event check-in, bravery badge, next event | F10 | builder | todo |
| Memory of what helped in the next prompt | F11 | builder | todo |
| .ics calendar reminders (server route) | F12 | coder | todo |
| Demo: skip to… (time shift through `clock.ts`) | F13 | builder | todo |
| Remaining event templates (all seven to the schema in SPEC 7) | - | coder | todo |
| Model evaluation and choice (SPEC 8.8, budget approved by Lida first) | - | builder | todo |

## Stage 4: Monetisation (05:00–07:00, stream E)

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Paywall after chapter 1 (locks only chapters 2+ and the day card): Event Pack $9.99, Family Year $49, Monthly, upgrade after check-in | F8, N12 | builder | todo |
| Stripe Checkout test mode, `/api/verify`, paid access as a database row checked by the server | F8, C4, N10 | builder | todo |
| Year plan auto-renewal consent, `/api/portal`, cancel | FR-A3 | coder | todo |
| Optional webhook `/api/stripe/webhook` after the deploy | N10 | builder | todo |

## Stage 5: Extras and quality (07:00–08:30, streams H, I)

Every P1 and P2 feature is either passing or switched off in `flags.ts`. Finishing order if time is short: values profile → social style → place photos → export and restore link → parent's voice → voice question.

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Family values profile | F14 | builder | todo |
| Social story style (Carol Gray, 2:1 checked in code, cached) | F15, FR-B2, FR-B3 | builder | todo |
| Place photos (up to 3, resized to 1280 px, IndexedDB) | F16 | coder | todo |
| Export / import backup, "Use on another device" restore link | FR-B1 | coder | todo |
| Parent's voice recording (IndexedDB only) | F17, N5 | builder | todo |
| Child asks by voice (parent consent, text shown before sending) | F18 | builder | todo |
| Safety test on the chosen model; usability fixes | criteria | builder | todo |
| Mobile polish, accessibility, performance | N1, N7, N9 | coder | todo |

## Stage 6: Deploy and submission (08:30–11:00)

| Feature | Requirements | Owner | Status |
|---|---|---|---|
| Railway project with PostgreSQL (Lida creates it early) | N13 | Lida | todo |
| First Railway deploy (08:30–09:00): Root Directory `web`, variables, health check, public domain | C3, N2 | builder | todo |
| Fixes on production, README, safety report | N6, N10 | coder | todo |
| Final review (secrets, guest flow, attribution) | N3 | reviewer | todo |
| Two clean runs from other people's phones; code freeze 10:30; submission 11:00 | criteria | coordinator | todo |

## Future functionality (to work out after the core)

Planned by tier in SPEC section 17.

| Idea | Source | Notes |
|---|---|---|
| Voice generation and recognition through ElevenLabs (story narration, the child's spoken questions) | Lida, Nov 15; SPEC 17.1 | Budget approved by Lida first. Check child-voice data rules (COPPA biometrics, N5) and ElevenLabs data retention |
| Three subscription levels (Free, Big Day Pass, Gold) with Gold extras locked by capability | SPEC 10.1, 17.2 | Done 15 Nov |
| Generated pictures inside stories | SPEC D10, 17.2 | Painted scene pictures ship in Gold |
| Sign-in by email, several children | ТЗ roadmap, SPEC 17 | |
| Prompt review with a child psychologist; COPPA lawyer before a pilot | ТЗ roadmap, research | |
| Note for the teacher or doctor; share link for grandma or nanny | ТЗ roadmap, months 2–3 | |
| 20 events; printed book of chapters | ТЗ roadmap, months 2–3 | |
| Pilot with 5–10 children's dental clinics (QR in the waiting room) | ТЗ roadmap, months 3–6 | |
| SEO pages of social stories; Spanish and other languages | ТЗ roadmap, months 3–6 | |
| Topics of death, divorce, illness with psychologists | ТЗ roadmap, months 6–12 | |
| Age-based event calendar, seasonal reminders | ТЗ roadmap, months 6–12 | Retention for the Year plan |
| Mode for family therapists | ТЗ roadmap, months 6–12 | |
| Several instances: rate limiter and sample cache in Redis | SPEC 12 scaling | |

## Switched off at freeze

Features switched off by their flag at code freeze, with the reason.
