/**
 * Browser side of the story options: the parent's own text is cleaned (child's name, contact details,
 * markup) before it is stored, exactly like the own worry and photo captions.
 */
import { cleanText, isBlank } from '@/lib/safety/filters';
import type { StoryPrefs } from '@/lib/engine/types';

function clean(text: string | undefined, max: number, childName: string, pronunciation?: string): string | undefined {
  if (!text) return undefined;
  const t = cleanText(text, { max, childName, pronunciation }).text;
  return isBlank(t) ? undefined : t;
}

export function cleanStoryText(prefs: StoryPrefs | undefined, childName: string, pronunciation?: string): StoryPrefs | undefined {
  if (!prefs) return undefined;
  const list = (xs: string[] | undefined, max: number) =>
    xs?.map((x) => clean(x, max, childName, pronunciation)).filter((x): x is string => !!x);
  const out: StoryPrefs = { ...prefs };
  if (prefs.moments) out.moments = list(prefs.moments, 60);
  if (prefs.avoidWords) out.avoidWords = list(prefs.avoidWords, 24);
  if (prefs.after !== undefined) out.after = clean(prefs.after, 60, childName, pronunciation);
  if (prefs.comfort) {
    const nickname = clean(prefs.comfort.nickname, 24, childName, pronunciation);
    out.comfort = nickname ? { kind: prefs.comfort.kind, nickname } : { kind: prefs.comfort.kind };
  }
  return out;
}
