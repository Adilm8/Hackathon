# Big Day Stories

Short personalised stories that prepare children aged 3-8 for a big day (the dentist, a first day at school, a flight), answer the child's questions inside the story, and show the parent what worries the child and what to say.

Built for Business Cup 2.0 (Nov 14-15, 2026).

## Repository layout

| Folder | What is inside |
|---|---|
| `web/` | The web application (Next.js). Run all npm commands from here. Copy `web/.env.example` to `web/.env.local` and fill in the keys |
| `docs/` | Product and engineering documentation, see `docs/README.md` |

Setup and run instructions: `web/README.md`.

## For the jury: the whole product in 3 minutes

Open the site and tap **Try a sample**. You get your own sample family (Max, 4, a dentist visit in 5 days and a past haircut), and a Demo bar at the bottom of every screen with a guided tour that ticks itself off:

1. Read chapter 1.
2. Ask a question and watch the next page change.
3. Open the parent panel.
4. Unlock the full plan: **Pay with the test card** (Stripe test mode, card 4242 4242 4242 4242, any future date, any CVC) or **Skip payment (demo access)**.
5. Jump to the event day: the "first, then" card and its printable A5 PDF.
6. Jump to after the event: the check-in, the badge, and the next big day with the form filled in.

**Evening 2**, **Event day** and **After the event** move the app's clock; **Reset demo** starts a clean sample for the next person.
