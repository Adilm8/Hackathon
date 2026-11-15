# Decisions log

Append only, newest at the bottom. A decision here wins over older text in other docs.

| Date | Decision | Decided by | Why |
|---|---|---|---|
| 2026-11-15 | Working files: requirements, roadmap by stages, architecture, decisions log | Lida | Track requirements and which features ship at which stage |
| 2026-11-15 | The project is Big Day Stories; the earlier idea is dropped | Lida | New direction for the hackathon |
| 2026-11-15 | Keep the full ТЗ scope and all core functionality; the analysis scope cuts are rejected | Lida | Product & Engineering is 40% of the score |
| 2026-11-15 | Deploy once, at the end, straight to Railway (not Vercel) | Lida | |
| 2026-11-15 | LLM through OpenRouter and Gemini; keys in `.env.local` locally (template `.env.example`) | Lida | |
| 2026-11-15 | Voice generation and recognition through ElevenLabs later (future functionality) | Lida | |
| 2026-11-15 | Usability checks by test users run in separate threads alongside development | Lida | |
| 2026-11-15 | `docs/SPEC.md` is the single specification development relies on (flows, rules, data, API, build plan); it wins over older text in other docs | Lida, architect | One file to build from |
| 2026-11-15 | PostgreSQL stores each family's plan, history and paid access; no login, a guest family is created silently; a seeded test profile exists for the jury | Lida | Keep past and future information; simple schema for the MVP |
| 2026-11-15 | Production LLM is a paid model through OpenRouter chosen by an evaluation (SPEC 8.8); Gemini Flash is for tests only; every paid run needs a budget approved by Lida first (the key has a $5 limit) | Lida | Quality and cost control |
| 2026-11-15 | No analytics tracker; product counts come from the database | Lida | The goal is an end-to-end product with a clear core value |
| 2026-11-15 | Voice, generated pictures and other premium features are planned by subscription tier (SPEC 17); the MVP is sized by the time left | Lida | |
| 2026-11-15 | Hard questions and complex mechanics are decided by Lida (SPEC 19); the stated default is built until she answers | Lida | |
| 2026-11-15 | The child's name is never sent to an LLM (placeholder `[[CHILD]]`) | architect | Privacy and no prompt injection through the name field |
| 2026-11-15 | Paid access is a database row written after the server verifies the Stripe session, not a flag in the browser | architect | A browser flag can be set by hand |
| 2026-11-15 | Rate limit is per family (30/min) with a coarse per-IP guard (300/min) and a daily spending cap, instead of 30/min per IP (N8) | architect | The jury shares one Wi-Fi address |
| 2026-11-15 | Build order: the whole cycle works on event templates and the mock provider before a real model is connected | architect | Working product from the first checkpoint; demo survives a model outage |
| 2026-11-15 | Voice question (F18) is shown only where recognition runs on the device | architect | Default browser recognition sends audio to a server, which would break N5 |
| 2026-11-15 | Child's name: follow US law and best practice; a first name or nickname is stored, a surname never | Lida | |
| 2026-11-15 | Features will be grouped into named subscription levels (SPEC 17.2); the free level offers a couple of trial stories; in the MVP every feature is open and only the case-rule paywall (chapters 2+, day card) stays | Lida | |
| 2026-11-15 | Models: benchmarks first, start from the cheaper models (DeepSeek 4.1 Flash, Haiku 5.5), then test; Gemini is used wherever possible for now | Lida | Cost control; Gemini has limits and is reviewed again soon |
| 2026-11-15 | A family with access may read one chapter ahead; a check-in records "didn't help" only when the parent marks it | architect | Delegated by Lida; re-checked in a usability session |
| 2026-11-15 | The paywall stays in the MVP. The jury sees every function through the jury demo mode: guided tour in the sample, the real Stripe test checkout, and one-tap demo access granted by the server to sample families only (`DEMO_MODE`) | Lida, architect | Case rules need a working paywall; the jury has three minutes |
| 2026-11-15 | Development starts on SPEC.md; the remaining open questions (SPEC 19) keep their defaults and are revisited later; the look follows `docs/design/style-guide.md` | Lida | |
| 2026-11-15 | Payments as built: `/api/verify` also returns `purchase { plan, eventId? }`; the monthly plan is on; the paywall names are Big Day Pass and Gold; Gold has no free trial; the renewal reminder is Stripe's email; cancelling takes effect at the end of the paid period (SPEC 10.5, 19 K12, K14 to K16) | payment stream, architect | Defaults, to be revisited with Lida |
| 2026-11-15 | Engine rules as built: later chapters get only on-topic question texts; only story pages close a topic; the check-in list is topped up from the template when the plan used few techniques; one badge per event; saving a check-in again replaces that event's memory records (SPEC 5.4, 4.13, 4.14, 5.7, 19 K17 to K21) | engine stream, architect | Defaults, to be revisited with Lida |
| 2026-11-15 | UI polish: "Skip & make plan" on the onboarding character step (it also skips the family values step; defaults are used and can be changed in Settings); on phones `/home` shows a child pill and a Parent panel link; the home header link reads "Plan & reminders"; "Ask your own" sits in the QuestionBar title row on every screen size; back links on the badge, check-in, locked day and settings screens; a chapter preview card in the landing hero; a drawn trail between `StoryPath` nodes; card elevation in `SideCards` and `SettingsView` | Lida | Shorter first setup, no dead ends, clearer home and landing |
