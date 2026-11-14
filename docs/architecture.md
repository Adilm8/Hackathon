# Architecture

Owned by the architect. This page is the one-page summary; the full contracts are in [SPEC.md](SPEC.md) and builders work from there. Anything that changes a contract between modules goes back to the architect.

## System overview

```
Browser (parent's phone)                 Server (one Next.js service on Railway)        Outside
┌──────────────────────────────┐         ┌───────────────────────────────────────┐
│ Screens (App Router, Tailwind)│  JSON   │ /api/chapter /api/answer /api/ritual  │──▶ LLM through OpenRouter
│ Story engine (pure code):     │◀──────▶ │   filter → model → checks → fallback  │    (Gemini for tests, mock for dev)
│   plan, clock, topics, access │ stream  │ /api/checkout /api/verify /api/portal │──▶ Stripe (test mode)
│ Stores (Zustand, localStorage)│         │ /api/family /api/state /api/sample    │
│ Sync module (local-first)     │         │ /api/ics /api/health                  │
│ IndexedDB: photos, recordings │         │ Event templates (JSON), sessions,     │
│ Speech: narrator, listener    │         │ rate limit, budget, sample cache      │
└──────────────────────────────┘         └──────────────────┬────────────────────┘
                                                            ▼
                                             PostgreSQL: families, family_state,
                                             entitlements, llm_calls
```

Principles:

- Code computes and stores (plan, story state, topics, counters, access). The LLM only writes text by rules and returns JSON that code validates. Product knowledge lives in the event templates.
- Every LLM call has a deadline and a template fallback; the whole cycle works with `LLM_PROVIDER=mock`.
- Local-first: the browser holds a working copy, the database holds the durable copy. No login: a guest family is identified by a signed, httpOnly cookie.
- The child's name is never sent to an LLM and by default never stored on the server. Photos and voice recordings stay on the device.
- Paid access is a database row written by the server after it verifies the Stripe session.

## Stack

| Layer | Technology | SPEC |
|---|---|---|
| UI | Next.js (App Router) + TypeScript + Tailwind, installable web app | 11 |
| State | Zustand persisted to localStorage; idb-keyval for photos and recordings; sync module | 6.2 |
| Database | PostgreSQL on Railway through Drizzle ORM; embedded PostgreSQL (PGlite) when `DATABASE_URL` is empty | 6.3 |
| LLM | OpenRouter (paid models chosen by evaluation), Gemini Flash for tests, mock provider; AI SDK with schema-validated streaming; zod | 8 |
| Safety | Five levels: filters before the model, provider safety, system prompt, checks after the model, Parent check | 8.6 |
| Illustrations | SVG character builder + static scenes | 11.4 |
| Speech | `Narrator` and `Listener` interfaces; browser implementations now, ElevenLabs later | 11.6, 17.1 |
| PDF | @react-pdf/renderer, loaded on demand | 11.7 |
| Calendar | .ics from a server route + Google Calendar link | 11.8 |
| Payments | Stripe Checkout (test mode), server-side verification, optional webhook | 10 |
| Hosting | Railway: one web service (Root Directory `web`) + PostgreSQL, deployed once at the end | 16 |

## Where things are

Folder layout: SPEC 11.1. Contracts (`lib/engine/types.ts`, zod schemas): SPEC 6.1 and 8.5. Database schema: SPEC 6.3. API: SPEC 9. Configuration variables: SPEC 12.6 and `web/.env.example`. Deployment steps: SPEC 16. Scaling path: SPEC 12.7.
