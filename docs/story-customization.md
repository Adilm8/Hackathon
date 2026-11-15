# Story customization and generation quality

Research note, 15 Nov 2026. Question: what should parents be able to set for a story, and what
should we add to generation to make the stories better? Sources are listed at the end.

## 1. What we have today

- The parent sets: child name (never sent to the model), age, pronoun, Story friend, values
  (tone secular/religious, body words, family chips), social-story style, event type, date,
  up to 3 worries plus one own worry, up to 3 place photos with captions.
- The engine fixes the rest: number of chapters = days until the event (max 5), the 5 beats are
  split over them, every chapter is 5 pages of 60-110 words (by age), 2-3 minutes aloud.
- The prompt (`web/lib/llm/prompts/system.v1.ts`) gets the template's steps, sensory details,
  honesty notes, goals, techniques and the child's technique memory. It cannot know which steps
  will really happen for this child, who comes along, what comforts the child, what the child
  loves, or what comes after.

## 2. What comparable products and practice do

**Personalized story apps** (Oscar, StoryBook AI, Your AI Bedtime Stories, DreamFables and
similar): the common controls are story length (short / medium / long), the hero and side
characters (a parent, a sibling, a pet, a favourite toy), the child's interests or a setting
(space, dinosaurs, under the sea), the mood (calm and sleepy, funny, adventurous) and a lesson.
Length and interests are the two settings every one of them has.

**Social Stories 10.2 (Carol Gray)**: a story is tailored to the person: format and length match
their attention span, and it should use their own interests. It answers the six WH questions
(where, when, who, what, how, why), keeps descriptive sentences at least 2:1 over coaching ones
(we already check this), uses literal language and a title, introduction, body and conclusion.
At least half of stories should praise what the child already does well.

**Child life practice for medical and new events** (Mayo Clinic, CHOP, Nationwide Children's,
Michigan Medicine, Stanford Children's): tell the child what will happen, where, who will be
there, when it starts and how long it takes, and how it may feel; share what they need to know,
not every detail. Preschoolers do best with 2-3 days of preparation, school-age children with
more. Bring a comfort item. Give the child small real choices (which arm, sit on a lap or a
chair, watch or look away) because choice gives a sense of control. Make a coping plan with one
or two techniques the child already likes. Avoid scary trigger words where a gentler accurate
word exists ("a quick squeeze" for the cuff, "medicine through a tiny straw"). Plan something
nice afterwards so the story ends with a look forward.

## 3. Gaps that hurt story quality

1. **Generic steps.** The template lists every possible step (for the dentist: x-ray, fluoride,
   cleaning). A child who will not have an x-ray hears about one anyway, which can add worry.
2. **No "who comes along".** The family chips describe the whole family, not the grown-up who
   goes on the day, so the story cannot promise the right person.
3. **No comfort object or coping plan from the parent.** Techniques come only from the template
   and the memory of past events.
4. **No interests.** The child's own world (trains, space, horses) is the strongest hook for
   attention, and every comparable app uses it.
5. **One length for all.** Some children need 1 minute at bedtime, some want 5. The number of
   chapters cannot be chosen either (a parent may want 3 evenings, not 5).
6. **No "after".** The stories end with the rehearsal; nothing gives the child a treat or plan
   to look forward to.
7. **No first time / been before.** A child who had a hard time last time needs a different
   story from a first-timer.
8. **No words to avoid.** Parents know their child's trigger words.

## 4. Proposed parent options

All optional, with today's behaviour as the default. The genre has its own step right after the
big day; the rest live on one step "Make the story yours" after the worries. Everything can be
changed later on the plan's "Story options" screen (`/event/[id]/story`); changes apply to chapters
not written yet, and the number of evenings can change only until the first chapter is written.

Built (15 Nov 2026): all ten options below plus the three generation rules of section 5
(WH questions in chapter 1, praise at the end of every chapter, the plan on the last page).
Fallback pages follow the length (a one-beat chapter has only 4 template pages, so "Long" falls
back to 4) and drop sentences with avoided words; they cannot leave out turned-off steps.

| # | Option | Values | How it is used |
|---|--------|--------|----------------|
| 1 | Chapter length | Short (~1 min, 3 pages) · Standard (2-3 min, 5 pages) · Long (4-5 min, 7 pages) | page count and words in the prompt and the fallback |
| 2 | Number of evenings | Auto (by days left) or 1-5, never more than the days left | beat split of the plan |
| 3 | Moments to include | the template's steps as toggles (all on), plus up to 2 own moments | prompt: build only on the chosen steps; own moments in data blocks |
| 4 | Who comes along | one or two chips from the family list, or "a grown-up" | prompt: the grown-up on the day |
| 5 | Comfort object | teddy, blanket, toy, book, none, with an optional nickname | prompt: the hero brings it; shown in rehearsal |
| 6 | Favourite things | up to 3 of ~12 chips (dinosaurs, space, trains, animals, princesses and knights, cars, ocean, music, sports, drawing, bugs, building) | prompt: small details and comparisons, never the plot |
| 7 | Story genre (own step right after the big day) | Bedtime story · Funny adventure · Discover & grow · Moral values · Fairy tale & magic · Brave hero · Calm & mindful | prompt: genre line; a social story stays literal whatever the genre |
| 8 | Been before? | First time · Been before, went fine · Been before, it was hard | prompt: what to stress |
| 9 | Something nice after | chips (park, favourite snack, call Grandma, play time) or own text | prompt: last chapter ends looking forward to it |
| 10 | Words to avoid | up to 3, own text | prompt and post-check: replaced in model text |

Later, not in this build: the child's own choices in the story ("pick which arm" pages), a
featured coping technique per event, a detail level separate from length, siblings or a pet as
side characters.

## 5. Generation improvements beyond the options

- Answer the six WH questions explicitly in chapter 1 (where, when, who, how long).
- End every chapter with one sentence that praises something the hero did (Social Stories:
  at least half the content should applaud).
- Keep a short "coping plan" line in the last chapter: the comfort object, the chosen
  technique and the "after" plan, so the day card and the story agree.
- Add the new options to the eval scenarios before the next paid model run.

## Sources

- [Social Stories 10.2 criteria, Carol Gray](https://carolgraysocialstories.com/wp-content/uploads/2018/12/Social-Stories-10.2-Criteria.pdf)
- [Mayo Clinic Children's Center, preparing your child](https://www.mayoclinic.org/departments-centers/childrens-center/child-life-program/preparing-your-child)
- [CHOP, preparing your child for medical experiences](https://www.chop.edu/pages/preparing-your-child-medical-experiences)
- [Nationwide Children's, supporting your child during medical procedures](https://www.nationwidechildrens.org/your-visit/overnight-and-extended-stays/during-your-stay/child-life-specialists/resources-for-families/supporting-child-medical-procedures)
- [Michigan Medicine, 10 tips for a hospital stay or surgery](https://www.michiganmedicine.org/health-lab/how-prepare-your-child-hospital-stay-or-surgery-10-expert-tips)
- [Child Life Digest, helping kids create a coping plan](https://childlifedigest.beehiiv.com/p/helping-kids-create-coping-plan)
- [Oscar personalized stories (The Decoder)](https://the-decoder.com/ai-storytelling-app-oscar-brings-sweet-dreams-one-bedtime-story-at-a-time/)
- [StoryBook AI](https://apps.apple.com/us/app/id6745899509), [Your AI Bedtime Stories](https://apps.apple.com/us/app/your-ai-bedtime-stories/id6756010994)
