/**
 * Fixed texts of the safety layer (docs/SPEC.md 8.6). Shared by the browser and the server.
 * The wording of the child-facing message comes from the ТЗ and should be reviewed by a
 * child psychologist after the hackathon. Numbers (to be re-checked before submission, SPEC 8.6):
 * Childhelp National Child Abuse Hotline 1-800-422-4453 (childhelphotline.org),
 * 988 Suicide & Crisis Lifeline (988lifeline.org), 911 for emergencies.
 */

/** Shown to the child for an unsafe question. Nothing else is said. */
export const UNSAFE_CHILD_MESSAGE =
  "Thank you for telling me. That's really important. Please tell a grown-up you trust right now.";

/** Shown below it, in small text, for the adult (FR-B4). */
export const UNSAFE_ADULT_NOTE =
  'If a child may be in danger, call the Childhelp National Child Abuse Hotline at 1-800-422-4453 or 911. ' +
  'For thoughts of self-harm, call or text 988.';

/** The line the character says when it cannot answer an own question in time (8.2). */
export const OWN_QUESTION_FALLBACK = [
  "That's a great question.",
  "Let's ask [[GROWNUP]] about it together, and then we'll keep reading.",
];

/** Kind redirect used when a question tries to change the rules or is rude (off_topic, no LLM call). */
export const REDIRECT_LINES = [
  "Let's keep our story gentle and cozy.",
  "Shall we see what happens on the next page?",
];

/** Parent phrase for an off-topic or redirected question. */
export const REDIRECT_PARENT_PHRASE = "Good thinking! Let's find out what happens next in the story.";

/** Parent phrase for a sensitive question the model could not draft. */
export const SENSITIVE_PARENT_PHRASE = "That's a big question. Let's talk about it together, just you and me.";

/** Shown when the question box is empty or only spaces. */
export const BLANK_QUESTION_HINT = 'Type a question first, then tap Ask.';

/** Shown when the question was cut to the length limit. */
export const TOO_LONG_HINT = 'That question was long, so we kept the first part.';
