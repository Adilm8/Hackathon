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
