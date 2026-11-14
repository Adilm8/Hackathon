/**
 * The only place where the AI layer touches other streams' modules (engine, persistence).
 * Keeping these in one file makes a renamed export a one-line change.
 *
 * pageTargets and confirmAddresses follow docs/SPEC.md 5.2 and 5.4 (A9). Stream A exports the same
 * rules from lib/engine; once both are in main these local copies become re-exports.
 */
import { getState } from '../db/state';
import type { EventTemplate, Page, Topic } from '../engine/types';

export { getTemplate } from '../engine/templates';
export { getSession } from '../server/session';
export { hasEventAccess } from '../db/entitlements';

/** Pages per chapter and words per page by age (5.2). */
export function pageTargets(age: number): { pages: number; minWords: number; maxWords: number } {
  if (age <= 4) return { pages: 4, minWords: 40, maxWords: 60 };
  if (age <= 6) return { pages: 5, minWords: 60, maxWords: 90 };
  return { pages: 5, minWords: 90, maxWords: 130 };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A9: a topic the model says a page addresses counts only when the page text contains a word
 * from the template's list for that topic (case-insensitive, whole word or word prefix).
 */
export function confirmAddresses(page: Pick<Page, 'sentences' | 'addresses'>, template: EventTemplate): Topic[] {
  const text = page.sentences.map((s) => s.text).join(' ').toLowerCase();
  const out: Topic[] = [];
  for (const topic of new Set(page.addresses)) {
    const words = template.topicWords[topic] ?? [];
    const hit = words.some((w) => {
      const word = w.toLowerCase().trim();
      if (!word) return false;
      if (/^\[\[.*\]\]$/.test(word)) return text.includes(word);
      return new RegExp(`(^|[^\\p{L}])${escapeRegExp(word)}`, 'u').test(text);
    });
    if (hit) out.push(topic);
  }
  return out;
}

/** The child's name and pronunciation from the server copy, for the second name replacement (8.6). */
export async function childNameOf(familyId: string, timeoutMs = 400): Promise<{ name?: string; pronunciation?: string }> {
  try {
    const state = await Promise.race([
      getState(familyId),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    const child = state?.doc.child;
    return child ? { name: child.name, pronunciation: child.pronunciation } : {};
  } catch {
    return {};
  }
}
