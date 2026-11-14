/**
 * TEMPORARY level-1 filter (docs/SPEC.md 8.6) until lib/safety from the AI stream is in main.
 * Runs in the browser before /api/answer; the server repeats the real checks.
 */
const UNSAFE = /\b(kill|hurt me|hit me|hits me|touch(es|ed)? my private|abuse|suicide|die myself|cut myself|gun|knife|stab|punch(es)? me)\b/i;
const SENSITIVE = /\b(die|dies|died|dead|death|sick|cancer|illness|divorce|divorced|babies come|baby come|where do babies|penis|vagina|private parts|god|heaven|pray|religion|jesus|allah)\b/i;

export function cleanQuestion(text: string, childName: string): string {
  let t = text.slice(0, 120).trim();
  if (childName) t = t.replace(new RegExp(`\\b${childName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '[[CHILD]]');
  return t
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '')
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '')
    .trim();
}

export function preClassify(text: string): 'unsafe' | 'sensitive' | null {
  if (UNSAFE.test(text)) return 'unsafe';
  if (SENSITIVE.test(text)) return 'sensitive';
  return null;
}
