# Engine (`lib/engine/`)

Pure TypeScript rules of docs/SPEC.md section 5. No LLM, no network, no `new Date()` for
calendar logic: every function takes "today" as an `ISODate` (`clock.today()` in the
browser). Functions that change data return a new object and never mutate their input,
so stores can use them directly. Covered by `tests/unit/*.test.ts`.

Contracts (`types.ts`, `schemas.ts`) and `clock.ts` belong to the foundation and change
only through the architect.

## templates.ts

| Export | Use |
|---|---|
| `getTemplate(type): EventTemplate` | validated template from `content/events/<type>.json` (throws on an invalid file) |
| `allTemplates()`, `TEMPLATES`, `EVENT_TYPES` | all seven |
| `eventLabel(event, template?)` | "Dentist visit", or the parent's label for Other |
| `countdownLabel(event, template?)` | "the dentist" |
| `ALL_BACKGROUND_IDS` | every scene id the templates use; the backgrounds registry must cover them |

## plan.ts (5.2, 5.3, 4.4, 4.6)

| Export | Use |
|---|---|
| `validateEventDate(date, today)` | `'ok' \| 'past' \| 'too_far'` (over 60 days) |
| `isQuickPrep(date, today)` | today or tomorrow |
| `createEvent({ id, childId, type, date, today, fears, customLabel?, customFear?, photos? }, template?)` | a `BigEvent` with its chapters; `mustAddress` = fears |
| `planChapters(eventDate, today)`, `buildChapters(template, eventDate, today)`, `chapterCount` | the plan itself |
| `chapterStatus(chapter, event, today, hasAccess)` | `'read' \| 'needs_pay' \| 'today' \| 'catch_up' \| 'locked'`; chapter 1 is never locked |
| `canReadAhead(...)`, `isChapterOpen(...)` | same arguments; "Read ahead" is one chapter ahead at most, with access |
| `opensOnText(chapter)` | "This chapter opens on Wednesday evening" |
| `eventPhase(event, today)` | `'prep' \| 'day' \| 'after' \| 'done'` |
| `countdownText(event, template, today)` | "5 sleeps until the dentist" / "Tomorrow is the big day" / "Today is the big day" / null |
| `tonightChapter(event, today)`, `readProgress(event)` | home and plan |
| `sortEventsForHome(events, today)`, `homeFocusEvent(events, today)` | home list and its top slot |
| `pageTargets(age)` | `{ pages, minWords, maxWords }` |

## state.ts (5.4, 4.8, 4.9, 4.13, 5.7)

| Export | Use |
|---|---|
| `buildStoryContext({ event, child, template?, chapterIndex })` | the `StoryContext` for every LLM call; never contains the name |
| `confirmAddresses(page, template)` | the A9 check: claimed topics proved by the template word list |
| `deriveMustAddress(event)` | fears not yet covered + topics of questions not yet answered in the story |
| `applyGeneratedChapter(event, index, { pages, summary?, usedTechniques?, place?, source }, template, today)` | store a generated or fallback chapter |
| `insertAnswerPage(event, index, { questionId, afterPageId, sentences, background?, mood?, source }, template)` | answer page after the current page |
| `applyRewrittenPage(event, index, pageId, page, questionId, template, source?)` | rewritten next page with `updatedBecause` |
| `nextStoryPage(chapter, pageId)` | the page a question may rewrite |
| `recordQuestion(event, input, today, template?)` | `{ ok: true, event, question } \| { ok: false, error: 'unsafe' \| 'limit' }` |
| `setQuestionAnswer`, `setParentAction(event, id, 'shown' \| 'edited' \| 'self', shownAnswer?)` | after the stream / Parent check |
| `questionsInChapter`, `canAskQuestion` | 3 per chapter |
| `markChapterRead(event, index, today)`, `skillsPractised(event)` | reader end, badge screen |
| `setRitual(event, ritual)` | stores the day card once |
| `checkinTechniqueOptions(event, template?)` | chips for "What helped?" |
| `saveCheckin({ event, child, input: { rating, helped, didntHelp, custom? }, today, template? })` | `{ event, child, badge }` |
| `badgeCollection(child)` | newest first |

## memory.ts (5.7)

`techniqueMemory(child, { excludeEventId? })` → `{ helpedBefore, avoid }` (newest outcome wins),
`memoryLines(child, opts)` → "Last time: counting to ten helped (haircut, Oct 25)",
`pickDayTechnique(template, child, topTopics, opts)` → `{ id, label, how, reason }`.

## topics.ts (4.10, 5.5)

`summarise(event, child, template, today?)` → `{ rows, selfAnswered, dayTechnique, memoryLines, parentSkill, totalQuestions, empty }`;
`topTopics(event, n)`, `topicLabel(topic)`, `FEAR_OPTIONS` (onboarding list, label → topic).

## access.ts (5.6, 10)

`hasEventAccess(entitlements, eventId, nowMs)`, `activeEntitlements`, `canOpenChapterByAccess(index, hasAccess)`,
`featureNeedsAccess('chapter' | 'ritual', index?)`, `accessSummary(entitlements, nowMs)`, `isUpgradeEligible(entitlements, nowMs)`.

## fallback.ts (A1, 8.2)

`fallbackPages(template, beats, styleMode, age, chapterIndex)`, `fallbackChapter(template, chapter, styleMode, age)`,
`fallbackAnswer(template, buttonId?)`, `fallbackParentPhrase(template, topic)`, `fallbackRitual(template, event, child)`,
`questionButtonsForPage(template, pageNumber)` (three buttons, rotating), `FALLBACK_COPY` (own question, Parent check, question limit lines).

## suggestions.ts (5.9)

`suggestNext(child, events, today, n = 3)` → `EventType[]`.

## ics.ts (11.8)

`buildIcs(data, { baseUrl, stampMs? })` → `.ics` text (floating 19:30 per evening, 19:00 check-in on the day),
`encodeIcsPayload` / `decodeIcsPayload` for `GET /api/ics?d=`, `icsHref(data)`, `googleCalendarUrl(data, { baseUrl })`.
Built with the [`ics`](https://github.com/adamgibbons/ics) package (ISC licence).

## sample.ts (4.3)

`buildSampleFamily(today, { nowMs? })` → the seeded `FamilyDoc` (Max, 4; past haircut with check-in and badge; dentist in 5 days); `SAMPLE_IDS`.

## text.ts

`renderText(text, child, { speak?, pronunciation? })` fills `[[CHILD]]` and `[[GROWNUP]]` (first family word, or "your grown-up",
capitalised at a sentence start); `grownupWord(values)`, `updatedChipText(question, name)`, `countWords`, `containsAnyWord`.

## Templates (`content/events/*.json`)

Seven files validated by `EventTemplateSchema` and by `tests/unit/templates.test.ts`: two fallback pages per beat and style of
40–60 words, every claimed topic proved by the word list, social pages in the first person with at least two describing sentences
per coaching one (Carol Gray's Social Stories criteria), no stop phrases, only the two placeholders. Dentist follows the ТЗ example;
the other events use the question buttons and rituals of ТЗ section 3. Practical steps follow common advice for parents from
paediatric dentists, paediatricians and child-life specialists; a child psychologist reviews them before any real launch (SPEC 17).
