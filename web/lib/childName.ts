/** Child's first name or nickname rules for onboarding and Settings: one word, 2 to 20 characters. */
export const NAME_MIN = 2;
export const NAME_MAX = 20;
const LETTERS = /^[\p{L}][\p{L}'’-]*$/u;

/** The message to show under the name field, or '' when the name is fine. */
export function childNameError(raw: string): string {
  const name = raw.trim();
  if (!name) return 'Please enter a first name or nickname.';
  const len = [...name].length;
  if (len < NAME_MIN) return `The name must be at least ${NAME_MIN} characters.`;
  if (len > NAME_MAX) return `The name can be at most ${NAME_MAX} characters.`;
  if (!LETTERS.test(name)) return 'One word, letters only (a hyphen or apostrophe is fine).';
  return '';
}
