/**
 * Question prompt v1, added to the system prompt (docs/SPEC.md 8.4).
 * The question and the pages arrive cleaned (lib/safety/filters) and go inside <data> blocks.
 */
import type { StoryContext } from '../../engine/types';
import { dataBlock } from '../../safety/filters';

export const ANSWER_PROMPT_VERSION = 'answer.v1';

export interface AnswerPromptInput {
  question: string;
  currentPage: string;
  nextPage?: string;
  /** Set when code already fixed the category to sensitive (8.6 level 1). */
  sensitive: boolean;
  /** Topic of a button question, fixed by the template. */
  buttonTopic?: string;
}

/**
 * Second, separate call for an on_topic answer in story style: rewrite the next page (8.4).
 * Split from the answer so the child's answer is not held back by the page (deadline 3.5 s):
 * models that do not stream structured output return the whole object at once.
 */
export function buildRewritePrompt(input: { question: string; currentPage: string; answer: string; nextPage: string }): string {
  return [
    `The child asked: ${dataBlock(input.question)} while hearing page: ${dataBlock(input.currentPage)}.`,
    `The character already answered: ${dataBlock(input.answer)}`,
    `Rewrite the next page so it naturally refers to the question, keeping its events and length. Next page now: ${dataBlock(input.nextPage)}`,
    'Return only nextPage (sentences with text and kind, mood, background, addresses).',
  ].join('\n');
}

export function buildAnswerPrompt(ctx: StoryContext, input: AnswerPromptInput): string {
  const lines = [
    `The child asked: ${dataBlock(input.question)} while hearing page: ${dataBlock(input.currentPage)}.`,
    'First classify: on_topic | off_topic | sensitive | unsafe.',
    '- on_topic: answer as the character in 2-3 sentences, then rewrite the next page so it naturally refers',
    `  to the question.${input.nextPage && ctx.styleMode === 'story' ? ` Next page now: ${dataBlock(input.nextPage)}` : ' There is no next page to rewrite: return nextPage as null.'}`,
    '- off_topic: one kind sentence, then gently return to the story. nextPage is null.',
    '- sensitive (death, illness, divorce, body, where babies come from, religion): do NOT answer the child.',
    '  Draft an answer for the parent to review in parentDraft (2-4 short sentences the parent could say), respecting the family values. answer is empty, nextPage is null.',
    '- unsafe (harm, abuse, self-harm, violence): return only the category; everything else empty.',
    'Also return one short phrase the parent can say (parentPhrase), and the topic tag.',
    'Questions about the character: it is a character in a story that the grown-up reads; it never says it is real or alive, never keeps secrets from the parents, and never asks where the child lives.',
    'If the question asks for medicine, food or health advice, say it is a great question for [[GROWNUP]] or the doctor.',
  ];
  if (input.sensitive) lines.push('Code has already classified this question as sensitive. Return category "sensitive" and write parentDraft.');
  if (input.buttonTopic) lines.push(`The topic of this question is ${input.buttonTopic}.`);
  if (ctx.styleMode === 'social') lines.push('Social story style: answer literally in the first person, no fantasy. nextPage is always null.');
  lines.push('Fields in this order: category, topic, answer (sentences with text and kind), parentDraft, parentPhrase, nextPage.');
  return lines.join('\n');
}
