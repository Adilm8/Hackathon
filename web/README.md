# Big Day Stories: web app

Specification: `../docs/SPEC.md`. Look and layout: `../docs/design/style-guide.md`.

## Run locally

```bash
cp .env.example .env.local   # fill in keys; LLM_PROVIDER=mock needs none
npm install
npm run dev                  # http://localhost:3000
```

With `DATABASE_URL` empty an embedded PostgreSQL (PGlite) is created in `web/.data/`. Delete that folder to start from a clean database.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` / `npm start` | production build and server (`$PORT`, default 3000) |
| `npm run typecheck` | TypeScript, including the check that `lib/engine/schemas.ts` matches `lib/engine/types.ts` |
| `npm test` | unit and API tests (mock LLM, in-memory database) |
| `npm run lint` | ESLint |
| `npm run db:generate` | writes a new SQL migration in `drizzle/` after a change to `lib/db/schema.ts` |

Migrations in `drizzle/` are applied automatically when the server starts (`instrumentation.ts`).

## Rules for every stream

- Contracts (`lib/engine/types.ts`, `schemas.ts`, SPEC sections 6, 8, 9) change only through the architect.
- Styling values come only from the tokens in `app/globals.css` (`bg-bg`, `text-ink`, `bg-primary`, `text-primary-text`, `rounded-card`, `shadow-step`, `text-story-m` ...). Parent screens wrap their root in `room-parent`; the reader at night uses `reader-night`.
- Components never call `new Date()` for calendar logic: use `clock.today()` from `lib/engine/clock.ts`.
- Unfinished P1/P2 features stay off in `lib/flags.ts`.
- `typecheck`, `test` and `build` are green before a push to `main`.

## Screens (stream C)

Routes of SPEC 4.2 live in `app/`; the reader, panel and shared UI in `components/reader`, `components/panel`, `components/ui`. Screens read and write family data only through `lib/store/*` (Zustand stores with the `bds:` keys of SPEC 6.2); `lib/store/boot.ts` hydrates them on the client and starts `lib/sync`. Engine functions come through `lib/store/engine.ts`, the story calls (`/api/chapter`, `/api/answer`, deadlines and template fallbacks) through `lib/store/story.ts`, the read-aloud voice through `lib/speech/narrator.ts`.

Ready-made parts used (all permissive licences):

| Part | Licence | Used for |
|---|---|---|
| [Radix UI primitives](https://github.com/radix-ui/primitives) (`react-dialog`, `react-switch`, `react-progress`) | MIT | sheets and dialogs with focus trap, switches, progress bar |
| [Zustand](https://github.com/pmndrs/zustand) `persist` | MIT | browser stores |
| Native `<input type="date">` | - | date of the big day (best practice on phones, see docs/design/ref-reader-calendar-dashboard.md) |

Patterns taken from known products (docs/design): one question per screen with a progress bar and a guide character (Duolingo onboarding), a path of chapters (Duolingo home), plan cards with a highlighted best value (Quizlet upgrade), insight cards in the dark parent room (Quizlet, Novakid research).

Defaults chosen without Lida (to revisit):

1. Onboarding is eight single-question screens grouped into the three steps of SPEC 4.5; the parent gate is the first screen.
2. The reader turns to night colours from 19:00 to 06:00 device time; the moon/sun button and Settings override it.
3. When the AI is unavailable, a button question still rewrites the next page from the template answer ("Max remembered the question…"), so the main mechanic stays visible offline.
4. In the sample, "Skip payment (demo access)" is also on the paywall itself, next to the real test checkout.
5. The Privacy page has no contact address yet: one must be added before a public launch.
6. Export/import backup and the "Use on another device" link are switched on (`lib/flags.ts`).
