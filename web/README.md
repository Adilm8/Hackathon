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

## Event day and jury demo (stream G)

| Part | Where |
|---|---|
| Day card (4.12), printable A5 card (11.7) | `app/event/[id]/day`, `components/eventday/RitualCardView.tsx`, `lib/eventday/ritual.ts` |
| Check-in (4.13), badge and next event (4.14) | `app/event/[id]/checkin`, `app/event/[id]/badge` |
| Calendar (11.8) | `GET /api/ics`, `components/eventday/CalendarButtons.tsx` on the plan |
| Demo bar: tour, time travel, access (4.3, 5.1) | `components/eventday/DemoBar.tsx` (mounted by `Screen`), rules in `lib/demo/demo.ts` |
| Demo access (9, 10.4a) | `POST /api/sample/access` (`grant`, `reset`); `GET` returns `{ demoMode }` for the Demo bar |

Ready-made parts and patterns: jsPDF (MIT, loaded only on tap) for the A5 card file, the browser's print with a CSS `@page A5` sheet for printing, the `ics` package (ISC) for the calendar file, Google Calendar's public `render?action=TEMPLATE` link; a guided checklist that ticks itself from real data (onboarding checklists of Linear and Notion), a collapsible demo strip with a "Next step" button.

Defaults chosen without Lida (to revisit):

1. **Download PDF** saves a real A5 file (`lib/eventday/pdf.ts`, jsPDF, black on white, same text as the card); **Print on A5** keeps the browser print. SPEC 11.7 named `@react-pdf/renderer`; jsPDF is smaller and loads only when tapped.
2. The day card from the AI is stored once; when the AI is unavailable the template card (adjusted by memory) is shown and the AI is asked again next time.
3. "Panel opened" and "day card seen" ticks of the tour are kept in this browser (`bds:sample:demo`), since they are not family data; the other four come from the family document.
4. **Reset demo** removes the demo access on the server and then starts a fresh sample family (unpaid, real today, no questions), so the next juror starts clean.
5. The Demo bar starts folded on phones (a strip with "Next step"), open on screens from 768 px; it folds itself after a jump. The "Demo access" badge in the header shows from 400 px; on narrower phones the Demo bar strip says it.
6. The badge screen offers the three suggested events as links that preselect the event in the form (`/start?again=1&type=…`).
7. The sample warm-up stays off (`LLM_WARM_SAMPLE` unset), so nothing is spent on a paid model.

### Usability fixes (second pass)

- Voice questions: the browser is asked about on-device recognition only after a tap, with a 3 s timeout (`mayListenOnDevice` just checks the API exists). Asking on page load crashed /settings in a Chromium build. Settings voice options sit in an error boundary; `app/error.tsx` catches any screen.
- Demo bar: on a step's own screen "Next step" turns into what to do there (Finish, ask a question, Save), and on the paywall into "Skip payment"; tour ticks are only ever added (the day tick used to wipe the panel tick); the tour stays on the event it started with; "Tour complete" at 6/6.
- Calendar: reminders whose time has passed on the parent's own clock are left out, chapter numbers stay real.
- Check-in "Hard" face is sad (raised inner brows, blue), not angry. One /api/ritual request per event at a time.

### Saved children and "Create your own story"

- Every finished onboarding saves the child in this browser under `bds:profiles` (`lib/store/profiles.ts`): first name or nickname only (anything after a space is dropped), age, pronoun, pronunciation, story friend, values, story style. Up to 6, newest first, the same first name updates the same child. Not sent to the server; "Delete all data" removes it with the other `bds` keys.
- Onboarding opens with "Who is this story for?" when a saved child exists. Tapping one skips name, age, story friend and values and goes to the big day ("Change" brings them back); the pencil keeps the steps but prefilled; × forgets a saved child. "Plan another big day" with only this workspace's child goes straight to the event, also skipping the story friend and values.
- "Create your own story" (`components/ui/CreateStoryButton.tsx`): a header button on every screen except onboarding, and on /home. In the sample it switches to the parent's own space first, so the sample stays intact for the tour.

### Home page (sections, story path, today's cards)

- `/home` is the parent's own home, not the landing: sections on the left from 1024 px (Stories, Big days, Badges, Parent panel, Child, Settings; `?tab=days|badges|child`), a bottom tab bar with a "New story" button below that (`components/home/HomeNav.tsx`, stacked under the Demo bar by `Screen`).
- Middle: a header card for the chosen big day (`?event=` switches between open ones) and the story path (`components/home/StoryPath.tsx`): one node per chapter, then the big day, the check-in and the badge; the first unfinished node is bigger, ringed, with a "Start" / "Unlock" / "Opens Wednesday" bubble and the child's story friend beside it. Node states come from `lib/home/path.ts` (tested in `tests/unit/home-path.test.ts`).
- Right from 1280 px (below the path on smaller screens): today's tasks (read tonight's chapter, ask a question, day card, check-in), the evenings-in-a-row streak with the latest badges, the Big Day Pass offer while the big day is not unlocked, and "Create your own story".
- The Child section lists other children saved on this device; "make a story for Leo" opens onboarding at the big day with Leo filled in (`/start?again=1&child=<id>`).

### Motivation on /home (benchmark, docs/benchmark.md)

- `lib/home/progress.ts` (tested in `tests/unit/home-progress.test.ts`): the streak forgives one missed evening a week ("rest evening", snowflake), a seven-dot week strip, stars (chapter 10, question 5, check-in 20, badge 30) and seven levels with generic names, and the parent's "This week" report.
- Right column: streak card with the week strip, then the level card. Child tab: "This week with Max" and the level.
- Defaults to revisit with Lida: star values, level names and thresholds, one rest evening per seven days.

### Celebrations, sounds, easy-read letters

- `lib/fx/celebrate.ts`: confetti (CSS, skipped with reduced motion) and a soft three-note chime (Web Audio, no files) when a chapter ends and the first time a badge opens in a tab.
- `lib/store/prefs.ts` (`bds:prefs`, this device only, outside the SPEC 6.1 Settings contract): Sounds, Easy-read letters, favourite chapters. `components/ui/PrefsSync.tsx` loads it and sets `<html data-font="easy">`, which swaps the body font to Atkinson Hyperlegible (OFL, next/font) with wider letter and word spacing. Switches in Settings > Reading.

### Story library, favourites, bedtime routine

- Library tab on /home (`?tab=library`, also in the bottom tab bar): every chapter read, newest first, "Read again" opens the reader; the heart keeps a chapter under Favourites (`bds:prefs` favorites, this device). Logic in `lib/home/library.ts`.
- `/routine`: bath, teeth, pyjamas, story, lights; steps can be switched off (`bds:prefs` routineOff); a calm ring timer per step with Pause and Next step, a soft chime when time is up (only with Sounds on), the story step opens tonight's chapter. Linked from the right column on /home and the Library tab.
- Defaults to revisit with Lida: step list and minutes.

### Offline, install, share

- `public/sw.js` (registered in production by `components/ui/ServiceWorker.tsx`): pages network first with the last cached copy offline, hashed build files, icons and scenes cache first, `/api` never cached. Bump `VERSION` in sw.js to drop old caches.
- `components/home/InstallCard.tsx` on /home: the browser's install prompt where it exists, a "Share > Add to Home Screen" hint on iPhone/iPad Safari; hidden once installed or dismissed (`bds:install-dismissed`).
- Badge page: "Share the good news" (`components/badges/ShareBadge.tsx`): system share sheet or copy; shares only the badge name and the app link, never the child's name.
