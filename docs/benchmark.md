# Benchmark: what comparable apps have, and what Big Day Stories has

Date: 15 Nov 2026. Scope: consumer apps a US parent of a 3 to 7 year old is likely to know.
We studied the patterns, not the assets: no names, art, sounds or copy of any brand are reused.

Apps looked at, by group:

- **Gamified learning** (a well-known language app, its kids' reading spin-off, a free kids' learning app): short daily sessions, a path of lessons, streaks, XP and levels, daily goals, rewards, reminders.
- **Kids' bedtime and sleep apps** (sleep-story apps for children, personalised storybook apps): a calm night look, wind-down routines, a library of stories, favourites, read-aloud voice, offline listening.
- **Social-story apps** (apps used by parents and therapists to prepare a child for a new event): step-by-step stories of a real place, photos of the real place, a visual "first, then" schedule, rehearsal before the day, a short reflection after.

Status: **have** = built and on main, **partial** = some of it is there, **missing** = not built.

## 1. Habit and motivation

| Feature | Seen in | Big Day Stories | Notes |
|---|---|---|---|
| Path of lessons (one node per session) | gamified learning | have | /home story path: chapters, big day, check-in, badge |
| Daily streak | gamified learning | have | "Evenings in a row" on /home |
| Week strip under the streak (which days were done) | gamified learning | **added (PR "home progress")** | seven dots, today ringed |
| Streak protection / rest day ("freeze") | gamified learning | **added (PR "home progress")** | one missed evening a week does not break the run; shown as a snowflake dot |
| XP / points and levels | gamified learning | **added (PR "home progress")** | "stars" for reading, questions, check-ins, badges; levels with kid-friendly names |
| Daily goal and today's tasks | gamified learning | have | Today card with read / ask / day card / check-in |
| Achievements / badge gallery | all groups | have | Badges tab, earned and still to come |
| Celebration at the end of a session (animation, sound) | all groups | **added (PR "celebrations")** | confetti and a soft chime at the end of a chapter and on the badge; respects reduced motion and a Sounds switch |
| Reminders (push / calendar) | all groups | **added (PR "push reminders")** | opt-in web push (evening chapter, big day morning, check-in) with quiet hours; in-app reminder on /home where push is not available; calendar file stays |
| Leaderboards, friends, leagues | gamified learning | not planned | wrong fit for small children and for privacy (COPPA) |

## 2. Story and reading

| Feature | Seen in | Big Day Stories | Notes |
|---|---|---|---|
| Personalised hero (child's name, look) | storybook apps | have | first name only, story friend built in onboarding |
| Read-aloud voice with word highlight | storybook, reading apps | have | browser voice + read-along |
| Parent records own voice | storybook apps | partial | built, behind a flag (`parentVoice`) |
| Night look for bedtime | sleep apps | have | warm dusk after 7 pm, palettes |
| Text size | reading apps | have | Medium / Large / Extra large |
| Easy-read letters (dyslexia-friendly font, wider spacing) | reading apps | **added (PR "celebrations")** | Settings > Reading, a highly legible open font (OFL) |
| Story library: read again any chapter | sleep, storybook apps | **added (PR "library")** | Library tab on /home, all read chapters of every big day |
| Favourites | sleep, storybook apps | **added (PR "library")** | heart on a chapter, favourites first |
| Bedtime routine / wind-down timer | sleep apps | **added (PR "library")** | bath, teeth, pyjamas, story, lights; gentle timer, no sound at night by default |
| Offline use / install as an app | sleep apps | **added (PR "library")** | service worker caches the app shell and read pages; install prompt on /home |
| Photos of the real place | social-story apps | partial | built, behind a flag (`placePhotos`) |
| "First, then" card for the day | social-story apps | have | day card with three steps |

## 3. Parent side

| Feature | Seen in | Big Day Stories | Notes |
|---|---|---|---|
| Parent area behind a gate | all kids' apps | have | parent gate + parent panel |
| Progress report / weekly summary | gamified learning, kids' learning | **added (PR "home progress")** | "This week" card: evenings read, questions asked, stars, badges |
| Tips for the parent per session | social-story apps | have | parent panel per chapter |
| Several children | kids' learning | **added (PR "switch children")** | "Stories for" switch on /home and the parent panel; each child's path, streak, library and badges; other children's profiles kept on this device |
| Share an achievement | gamified learning | **added (PR "library")** | Share button on the badge (system share sheet, or copies the text); no picture of the child leaves the device |
| Backup / move to another device | many | partial | export/import and restore link built, behind flags |
| Subscription with tiers | all | have | Big Day Pass, Gold, Platinum, Diamond |

## 4. First run and polish

| Feature | Seen in | Big Day Stories | Notes |
|---|---|---|---|
| Short onboarding with a progress bar | gamified learning | have | single-question steps in three groups |
| Try before sign-up (no account) | gamified learning | have | guest family, sample family for the jury |
| Empty states with a next step | all | have | EmptyState on every list |
| Reduced motion | all good apps | have | CSS honours prefers-reduced-motion; celebrations too |
| Colour themes | some | have | four palettes, light and night |

## What we deliberately leave out

- Leaderboards, chat, public profiles: children 3 to 7, privacy first (first name only, no surname, no photos sent anywhere).
- Medical advice: stories prepare emotionally; the app never tells a parent what is medically right.
- Ads and loot-box style rewards: stars only mark effort, they never buy anything.
