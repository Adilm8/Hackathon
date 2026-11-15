/** Child's first name or nickname rules for onboarding and Settings: one word, 2 to 20 characters. */
export const NAME_MIN = 2;
export const NAME_MAX = 20;
/**
 * One word: a letter first, then letters, combining marks (Hindi, Thai, decomposed accents),
 * a straight or curly apostrophe (iPhone keyboards type ’) or a hyphen. Shared with the server
 * schema, so a name the form accepts is never refused by /api/state.
 */
export const CHILD_NAME_PATTERN = /^\p{L}[\p{L}\p{M}'’-]*$/u;
const LETTERS = CHILD_NAME_PATTERN;

/** Trimmed and in one Unicode form (NFC), so "é" typed two ways is the same name. */
export function normalizeChildName(raw: string): string {
  return raw.normalize('NFC').trim();
}

/** The message to show under the name field, or '' when the name is fine. */
export function childNameError(raw: string): string {
  const name = normalizeChildName(raw);
  if (!name) return 'Please enter a first name or nickname.';
  const len = [...name].length;
  if (len < NAME_MIN) return `The name must be at least ${NAME_MIN} characters.`;
  if (len > NAME_MAX) return `The name can be at most ${NAME_MAX} characters.`;
  if (!LETTERS.test(name)) return 'One word, letters only (a hyphen or apostrophe is fine).';
  return '';
}
