# Big Day Stories

Short personalised stories that prepare children aged 2-12 for a big day (the dentist, a first day at school, a flight), answer the child's questions inside the story, and show the parent what worries the child and what to say.

Built for Business Cup 2.0 (Nov 14-15, 2026).

## What the app does

- **15 big-day scenarios**: the dentist, a shot, a first day at school, a flight, a haircut, moving house, a new sibling and more. Each one becomes a short plan of evening chapters before the day.
- **Duolingo-style home**: one screen per child with the next step, streaks, badges, a story library and a bedtime routine.
- **Sentence-by-sentence reader** with read-aloud, a fullscreen mode, and a choice of character voices for the narrator.
- **The child can ask questions** by typing or by voice, and the next page of the story answers them.
- **16 fantasy story friends** the child builds and dresses up; they appear in every story.
- **Parent panel behind a parent lock**: what worries the child, what to say, and how the plan is going.
- **Event day and after**: a "first, then" card with a printable A5 PDF, a calendar file, a check-in and a badge.
- **Reminders and offline use**: installable as a PWA, with push and in-app reminders.
- **Paywall** with Stripe in test mode, plus a demo mode for the jury.
- **Privacy by design**: only a first name or nickname, no account needed, and story audio kept for at most 30 days.

Stack: Next.js 16, React 19, TypeScript, PostgreSQL, Stripe, Web Push; deployed on Railway.

## Repository layout

| Folder | What is inside |
|---|---|
| `web/` | The web application (Next.js). Run all npm commands from here. Copy `web/.env.example` to `web/.env.local` and fill in the keys |
| `docs/` | Product and engineering documentation, see `docs/README.md` |

Setup and run instructions: `web/README.md`. What happens when a service fails (AI, voice, payments, database, offline) and the fallback for each case: [docs/reliability.md](docs/reliability.md); live status at `/api/health`.

## For the jury: the whole product in 3 minutes

Open the site and tap **Try a sample**. You get your own sample family (Max, 4, a dentist visit in 5 days and a past haircut), and a Demo bar at the bottom of every screen with a guided tour that ticks itself off:

1. While reading chapter 1, ask a question and watch the next page change.
2. Read chapter 1 to the end and tap **Finish**.
3. Open the parent panel.
4. Unlock the full plan: **Pay with the test card** (Stripe test mode, card 4242 4242 4242 4242, any future date, any CVC) or **Skip payment (demo access)**.
5. Jump to the event day: the "first, then" card and its printable A5 PDF.
6. Jump to after the event: the check-in, the badge, and the next big day with the form filled in.

**Evening 2**, **Event day** and **After the event** move the app's clock; **Reset demo** starts a clean sample for the next person.

To look around the whole app instead, tap **Or explore the whole app with sample data** under the buttons: the same sample family opens on the home page, with Max and his sister Mia (her school plan started last night, so her path, streak and library already have something in them). The Demo bar's **More to explore** links lead to the home path, library, badges, the story friend, storyteller voices and the parent's own voice, the bedtime routine and the colour palettes. The sample is kept apart from a real family's data. The **My app | Demo** switch in the header (on phones one chip, **Demo** or **Demo · Exit**) moves between the two in one tap, on every screen except the reader; each side opens on the screen it was left on, and the demo keeps its tour progress. **Back to my app** is also in the open Demo bar and in Settings, and Settings has **Open the demo**. **Reset demo** still starts a fresh sample.
