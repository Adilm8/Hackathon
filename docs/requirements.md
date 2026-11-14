# Big Day Stories: requirements

Source of truth for what the app must do. Every requirement has an id so the roadmap can point to it. Priority: **Must** (pass/fail or core demo), **Should** (strong score impact), **Could** (only if time is left).

Inputs: the case brief (Business Cup 2.0), the team spec (ТЗ "Big Day Stories", feature ids F1–F19), and `docs/research/big-day-stories-requirements.md` (branch `research/requirements`). The full specification is `docs/SPEC.md`; where they differ, SPEC and `docs/decisions.md` win over this file.

## 1. Case rules (Business Cup 2.0)

| Id | Rule | Status |
|---|---|---|
| C1 | B2C web product, no mobile app; one track (we take **Skills**) | ok |
| C2 | Target: US adults 25–45 (our user: parents of children 3–8) | ok |
| C3 | Submission by the captain before **12:00 Nov 15** (Astana): PDF deck (≤10 slides, English), public production link usable without login, public GitHub repo with no keys in history | open |
| C4 | Paywall priced in USD, Stripe in test mode | open |
| C5 | Do not copy the organiser's (Zimran) own products | ok |
| C6 | Judging: Product & Engineering 40%, Value & Retention 20%, Problem & User 15%, Business Potential 15%, Originality 10% | info |

## 2. Target user and problem

- User: a US parent (25–45) of a child aged 3–8 facing a "big day": a first visit to the dentist, a doctor, a new school, and similar events.
- Problem: the child is anxious before the event; the parent wants a quick, personal way to prepare them.
- Job: get a short personalised story about the child's upcoming event, read or listen to it together, and track what helped.
- One full event cycle, walkable in 3 minutes without login: the parent enters the event, date and fears; gets a 5-chapter plan with a countdown; reads a chapter aloud while the child asks questions that the character answers and the next page takes into account; the parent panel collects question topics and suggests phrases; on the day, a "first → then" ritual card; afterwards a "how did it go" check-in, a bravery badge and the next event suggestion (the retention loop).
- Split of work: code computes and stores (plan, story state, topics, check-ins, counters); the LLM only writes text by given rules.
- Events in the MVP: dentist, school (kindergarten), flight, sibling, haircut, shot.

## 3. Functional requirements

### 3.1 From the ТЗ

| Id | Requirement | Priority | Stage | Notes |
|---|---|---|---|---|
ТЗ priorities: P0 = we do not submit without it (Must); P1 = after all P0 (Should); P2 = only if time is left, otherwise the button is hidden (Could). A feature is done only when all its criteria pass on a phone in the deployed version.

| Id | Requirement and acceptance criteria | Priority | Stage |
|---|---|---|---|
| F1 | **Try a sample** (for the jury): one button on the landing fills Max's form and runs the same generation as for a real parent; "Sample data" badge on every sample screen; no login | P0 | 1 |
| F2 | **Onboarding in 2 minutes**, 3 steps: (1) name, pronunciation, age 3–8; (2) event from 6 + "Other", date, up to 3 fears from a list + "more" field; (3) character and values profile. Only name, age, event and date are required. Date in the past or more than 60 days ahead is an error. No surname, address or child photo | P0 | 1 |
| F3 | **Plan by evenings**: min(5, days to the event) chapters with dates and a theme each; countdown "3 sleeps until the dentist"; chapter status locked / today / read. The plan skeleton is built by code from the event template, not by the LLM | P0 | 1 |
| F4 | **Reader**: background + character + text 18–22 px; swipe or back/next buttons; "Listen" via `speechSynthesis` with the current sentence highlighted; name spoken from the pronunciation field; page length by age; first page ready ≤ 6 s after tap | P0 | 1 |
| F5 | **Child asks a question**: 3 common-question buttons per page for the event + "Own question"; an answer page from the character (2–3 sentences); the next page is regenerated and refers to the question; max 3 questions per chapter (then "Let's ask tomorrow"); answer ≤ 4 s | P0 | 1 |
| F6 | **Parent check**: a question flagged sensitive opens a "Parent check" card with a draft and buttons Show / Edit / I'll answer myself; stop-list questions never go to the LLM | P0 | 1 |
| F7 | **Parent panel "What's on Max's mind"**: topics and counters (counted by code from state), verbatim questions, 1–2 ready phrases per topic and one technique for the event day; footer "Tips, not a diagnosis. Not therapy or medical advice"; updates right after a question | P0 | 1 |
| F8 | **Paywall after chapter 1**: Event Pack $9.99 and Year $49; Stripe Checkout in test mode; test card 4242 4242 4242 4242 shown with a Copy button; after payment the server verifies the session and unlocks chapters; chapters 2+ are not generated without payment | P0 | 4 |
| F9 | **Event-day card**: on the event day the home screen is a "first → then" card with the character, 3 steps and the technique from the panel; "Download PDF" (A5, large icons) | P0 | 3 |
| F10 | **After-event check-in in 30 s**: 3 smileys (calm / a bit hard / hard), what helped (checkboxes from plan techniques + own); saved to the child profile as helped / didn't help; bravery badge; next event suggested by age | P0 | 3 |
| F11 | **Memory of what helped**: the second event's form is prefilled; helped techniques go into the prompt as "use", didn't help as "don't use"; panel shows "Last time holding his foot helped" | P0 | 3 |
| F12 | **Evening reminders**: "Add to calendar" downloads an .ics with one event per plan evening at 19:30 + "How did it go?" on the event evening, each linking to its chapter; opens in Google, Apple and Outlook | P0 | 3 |
| F13 | **Demo: skip to…** (for the jury): evening 2 / event day / after; shifts "today" in the state rather than swapping screens; visible only in the sample and with `?demo=1` | P0 | 3 |
| F14 | **Family values profile**: religious / secular tone; body-part words (anatomical / family); who is at home ("mom", "dads", "grandma"…); settings go into every prompt; a story with "two dads" never mentions a mom | P1 | 5 |
| F15 | **Social story style** for autistic children: a toggle; re-reading gives the same text (from cache) | P1 | 5 |
| F16 | **Photos of the real place**: up to 3 photos with captions; resized to 1280 px in the browser; inserted on the "what will happen" page; "No faces, please" warning | P1 | 5 |
| F17 | **Parent's voice**: MediaRecorder, one recording per page, stored only in IndexedDB; "Listen to mom's voice" button instead of synthesis | P2 | 5 |
| F18 | **Child asks by voice**: only after a parent consent checkbox; recognition in the browser; audio not stored or sent, only text; text shown to the parent before sending | P2 | 5 |
| F19 | **Delete all data**: button with confirmation, clears all local storage | P0 | 2 |

Not in the MVP (slide only): note for the teacher or doctor, link for grandma or nanny, age-based event calendar, accounts and sync, death and divorce topics, printed book, other languages.

Sacrifice order if time runs out: child's voice → parent's voice → place photos → badge → events other than dentist, kindergarten and flight. The core (form, plan, chapter, question → answer → next page, panel, payment, check-in) is never cut.

### 3.2 Added by research

| Id | Requirement | Priority | Stage | Why |
|---|---|---|---|---|
| FR-A1 | Parent gate: "I am a parent or guardian (18+)" checkbox before the form | Must | 1 | COPPA, mixed audience |
| FR-A2 | "AI-generated story" label in the reader and on answers | Must | 1 | State AI-disclosure laws |
| FR-A3 | Year plan: explicit auto-renewal consent next to the terms, "Cancel anytime" in settings, renewal notice 15–45 days ahead (not 3) | Must | 4 | California auto-renewal law |
| FR-A4 | Terms and Privacy links on every screen; Privacy states the retention period; "Delete all data" button | Must | 1 | Amended COPPA rule |
| FR-B1 | Export / import data as JSON; "Add to Home Screen" hint | Should | 5 | Safari deletes site storage after 7 days without a visit |
| FR-B2 | Social story mode follows Carol Gray 10.2 (title, intro/body/ending, wh-questions, positive tone, describing:coaching ≥ 2:1) | Should | 5 | Method credibility |
| FR-B3 | The 2:1 ratio is checked in code from the sentence-type field of the LLM JSON, not only in the prompt | Should | 5 | Code computes, LLM writes |
| FR-B4 | Unsafe-topic message to the parent includes a help-line contact (number to verify) | Should | 1 | Chatbot safety laws |

## 4. Non-functional requirements

| Id | Requirement | Priority | Notes |
|---|---|---|---|
| N1 | Works equally on desktop and mobile web; iOS Safari 16+, Chrome Android | Must | speech APIs behind feature-detect |
| N2 | Public link usable without login; a guest family account is created silently on first use | Must | C3, SPEC D8 |
| N3 | No secrets in the repository or its history; keys only in env | Must | C3 |
| N4 | Minimum data: child's first name or nickname, age, event type, fears; no surname, address or face photo. The name never leaves the device: prompts carry `[[CHILD]]` | Must | COPPA, SPEC A4 |
| N5 | Child's voice is never stored or sent; parent's voice only in IndexedDB | Must | biometrics under COPPA |
| N6 | LLM provider does not train on our data; terms named in README | Must | |
| N7 | First page ≤ 6 s, answer ≤ 4 s, Lighthouse mobile ≥ 85 | Should | ТЗ |
| N8 | Timeout and fallback on every LLM call; 30 LLM calls per minute per family, 300 requests per minute per IP as a coarse guard; daily LLM spending cap (`LLM_BUDGET_USD_PER_DAY`) | Must | SPEC A2, 12.4 |
| N9 | WCAG AA: contrast 4.5:1, targets ≥ 44 px, prefers-reduced-motion, screen-reader labels | Should | |
| N10 | Payment verified on the server by `session_id`; webhook is a known limitation in README | Must | C4 |
| N11 | Analytics events without names, question text or child data; no cookies | Should | |
| N12 | No dark patterns in the paywall (no pressure timers) | Must | state design codes |
| N13 | Family plan, history and paid access are stored in PostgreSQL (embedded PGlite in development); the browser keeps a local-first working copy; paid access is a database row checked by the server | Must | SPEC D8, A3, 6.3 |

## 5. Out of scope for the MVP

- Sign-in by email and several children, a share link for grandparents, a note for the doctor (SPEC section 17).

## 6. Ready-to-submit criteria (from the ТЗ)

- The public link opens without login in incognito on iPhone and Android.
- "Try a sample" walks the whole cycle in 3 minutes, with the Sample data badge everywhere.
- A jury member's own question changes the next page and appears in the panel.
- The test payment goes through, the card number is on screen, chapters unlock.
- Safety autotest: 15 tricky questions pass 15/15.

## 7. Open questions

- Pitch wording: never "COPPA does not apply to us", never "clinically proven"; say "minimal data, parent is the operator, the child's name stays on the device, lawyer before a pilot".
