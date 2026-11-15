# Big day scenarios: audit and expansion plan

Status: built 15 Nov 2026 (Lida chose all 21). Collections use the six picker groups (lib/engine/templates.ts EVENT_GROUPS); brave-moment stickers are saved in the check-in (`checkin.brave`).

## 1. What we have today

15 event templates in `web/content/events/*.json`, one badge each:

| Type | Label | Questions | Techniques | Badge |
|---|---|---|---|---|
| dentist | Dentist visit | 9 | 10 | Brave Smile |
| school | First day at school | 9 | 9 | School Star |
| flight | First flight | 9 | 10 | Sky Explorer |
| sibling | New baby in the family | 9 | 9 | Big Sibling Heart |
| haircut | Haircut | 9 | 9 | Snip Snap Star |
| shot | Shot at the doctor | 9 | 10 | Brave Arm |
| doctor | Doctor check-up | 8 | 9 | Healthy Hero |
| blood_test | Blood test | 8 | 9 | Super Sleeve |
| hospital | Hospital stay | 8 | 9 | Hospital Hero |
| moving | Moving house | 8 | 9 | New Home Explorer |
| sleepover | First sleepover | 8 | 8 | Starry Night |
| babysitter | New babysitter | 8 | 8 | Brave Goodbye |
| swimming | First swimming lesson | 8 | 9 | Splash Star |
| party | Birthday party | 8 | 8 | Party Star |
| other | Another big day | 8 | 8 | Big Day Hero |

Each template also has 5 beats, 6+ steps, 5+ sensory details, honesty notes, a ritual,
parent phrases per topic and 40 fallback pages (story + social style).

Achievements today: one badge per big day, stars (chapter 10, question 5, check-in 20,
badge 30), 7 levels, streak with a rest evening. No achievement catalogue, no sets, no
repeat badges, nothing the parent can award.

## 2. Audit findings

### 2.1 Quality (good)
- Answers are honest: no "won't hurt", pain is described as a pinch, a tug or a sore arm.
- Every template has the separation, strangers, unknown and sensory questions, which are
  the top fears in the research.
- Fallback text is long enough and passes the A9 topic-word test.

### 2.2 Problems found
1. **Feelings questions have no topic.** "What if I cry?", "Why do I feel sad?", "Is the
   present for me?", "What if I don't like the food?" are tagged `other`, so the engine
   cannot match them to a fear or a technique. Proposal: retag to the nearest topic
   (`love` for feelings, `body` for food) now; a separate `feelings` topic later if needed.
2. **Same question, different topic.** "Why do I need it?" is `unknown` in shot but `body`
   in blood_test. Make them the same (`body`).
3. **Labels differ between the picker and the template.** Picker says "Flight" and "New
   sibling", template says "First flight" and "New baby in the family". Pick one each.
4. **Ages 2–12, questions written for 3–8.** A 2-year-old cannot use "What is the picture of
   my teeth?", and a 10-year-old will not tap "Will [[GROWNUP]] hold me?". Proposal: an
   optional `ages` range on each question button, plus 2–3 extra questions per template for
   ages 8–12 (embarrassment, being seen crying, phone, being in charge of yourself).
5. **Common questions missing** (from parent forums and child-life guides):
   - dentist: "Will they pull my tooth?", "Will there be a needle?"
   - doctor: "What if I'm scared of the doctor's hands being cold?" (cold hands, tongue stick)
   - shot: "Can I bring my toy?", "Can I sit up or lie down?"
   - blood_test: "What if I feel dizzy?"
   - hospital: "Will I have an operation?", "Will I sleep during it?" (covered by the new
     Surgery scenario below)
   - school: "What if I miss [[GROWNUP]]?", "What if I can't do the work?"
   - flight: "What if I feel sick?", "Can I see the pilot?"
   - moving: "Will I go to a new school?", "Will my pet come?"
   - sleepover: "What if I wet the bed?" (very common, needs a kind answer)
   - babysitter: "What if I get hurt?", "Can I stay up late?"
   - swimming: "Can I wear goggles or a float?", "What if I need the toilet?"
   - party: "What if I don't know anyone?", "What if I lose a game?"
6. **Badge is once per event.** A second dentist visit gives the same badge again with no
   sense of progress.

## 3. New scenarios (proposal)

Scenes: no new pictures needed. Each new type reuses existing scenes
(dentist, school, flight, sibling, haircut, shot, home-evening, outside, cosy-room) and,
for the illustrated mode, the closest existing event's pictures. New pictures cost money
and will only be generated if Lida agrees.

### Tier A: build now (21)

| # | Type id | Label | Ages | Scene reused | Badge |
|---|---|---|---|---|---|
| 1 | surgery | Operation (surgery) | 2–12 | shot | Brave Sleeper |
| 2 | eye_exam | Eye test and glasses | 3–12 | dentist | Sharp Eyes |
| 3 | tooth_loss | Losing a tooth | 5–9 | home-evening | Gap Tooth Grin |
| 4 | potty | Big kid toilet (potty training) | 2–4 | home-evening | Potty Champion |
| 5 | big_bed | Big bed or own room | 2–6 | cosy-room | Own Bed Star |
| 6 | daycare | New daycare or preschool | 2–5 | school | Little Learner |
| 7 | new_school | Changing schools | 5–12 | school | New Class Hero |
| 8 | test_day | Big test at school | 7–12 | school | Calm Thinker |
| 9 | camp | Summer camp | 6–12 | outside | Happy Camper |
| 10 | playdate | First playdate | 2–8 | home-evening | Good Friend |
| 11 | sports | Sports game or competition | 5–12 | outside | Team Player |
| 12 | performance | Show, recital or concert | 4–12 | school | Stage Star |
| 13 | new_class | New class or club (dance, karate, music) | 3–12 | school | Try It Star |
| 14 | bike | Learning to ride a bike | 3–8 | outside | Wheel Hero |
| 15 | road_trip | Long car trip | 2–12 | outside | Road Explorer |
| 16 | holiday | Family holiday gathering | 2–12 | home-evening | Family Heart |
| 17 | halloween | Halloween and costumes | 3–10 | outside (night) | Spooky Brave |
| 18 | two_homes | Two homes (parents living apart) | 3–12 | home-evening | Two Homes Heart |
| 19 | pet_loss | Saying goodbye to a pet | 3–12 | cosy-room | Loving Memory |
| 20 | new_pet | New pet at home | 2–10 | home-evening | Pet Pal |
| 21 | parent_trip | Grown-up goes away for work | 2–10 | home-evening | Countdown Champ |

### Tier B: later, if wanted (14)
Emergency room, ear piercing, braces or orthodontist, allergy test, visiting someone in
hospital, a relative's funeral, fire drill at school, storm or power outage, fireworks,
hotel and vacation, restaurant, pacifier goodbye, wedding, grandparents staying over.

### Sensitive scenarios: rules
two_homes, pet_loss (and funeral in tier B) follow extra rules in the template honesty notes:
- never say whose fault it is, never promise the parents will get back together;
- use the real words "died" and "dead" for a pet, never "went to sleep" (child-life and
  AAP guidance: "sleep" makes bedtime scary);
- the parent always chooses what the story says about the reason;
- no blame, no secrets, no picking sides.
These are the hard questions for Lida: are two_homes and pet_loss in for the jury demo?

## 4. Ready-made achievements (proposal)

Four kinds, all earned by effort, never bought, no leaderboard (same rule as stars).

### 4.1 Scenario badges (have, extend)
Every new scenario gets its own badge (table above). Repeat visits level the badge up:
1st time bronze, 3rd time silver, 5th time gold (e.g. "Brave Smile ×3").

### 4.2 Journey achievements (new, 12)
| Id | Name | How it is earned |
|---|---|---|
| first_story | First Page | First chapter read |
| three_nights | Three Nights | 3 evenings in a row |
| week_reader | Story Week | 7 evenings (rest evening allowed) |
| moon_month | Moon Month | 30 evenings in total |
| first_question | Curious Mind | First question asked |
| ten_questions | Question Explorer | 10 questions asked |
| told_the_day | Day Teller | First "how did it go" check-in |
| practise | Practice Pro | Rehearsal chapter read before the day |
| ready_star | Ready Star | All chapters read before the big day |
| try_again | Try Again Hero | Check-in says "hard", and a later big day of the same type is done |
| big_day_5 | Five Big Days | 5 big days completed |
| big_day_10 | Ten Big Days | 10 big days completed |

### 4.3 Collections (new, 6)
Sets of scenario badges, shown as a shelf on the Library tab.
| Set | Badges in it |
|---|---|
| Health Hero | dentist, doctor, shot, blood_test, eye_exam, hospital, surgery |
| Explorer | flight, road_trip, moving, camp, sleepover |
| Growing Up | potty, big_bed, tooth_loss, bike, haircut |
| School Life | daycare, school, new_school, test_day, new_class |
| Friends and Fun | party, playdate, sports, performance, halloween, holiday |
| Big Heart | sibling, new_pet, two_homes, pet_loss, parent_trip, babysitter |

### 4.4 Brave moments (new, parent-awarded)
After the check-in the parent can tap one or two moments it was proud of. Each is a small
sticker: Deep Breather, Said Hello, Held Still, Asked for Help, Tried Something New,
Used My Words, Kind Helper, Waited My Turn. They come from the technique that helped, so
the app also learns what works for this child.

## 5. Proposed build order
1. Fix the audit problems on the 15 templates (topics, labels, ~40 new questions, `ages`).
2. Tier A scenarios in batches of 5–7 per PR, each with full fallback pages and tests.
3. Achievements: journey + collections + repeat levels (pure logic in `lib/home`, tests),
   then the brave-moment stickers on the check-in screen.
