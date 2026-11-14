/**
 * Event-day card prompt v1 (docs/SPEC.md 8.2, 4.12): three "first → then" steps and one technique.
 */
import type { EventTemplate, StoryContext, Topic } from '../../engine/types';
import { allowedTechniques } from '../fallback';
import { TOPIC_LABEL } from './system.v1';

export const RITUAL_PROMPT_VERSION = 'ritual.v1';

export function buildRitualPrompt(ctx: StoryContext, template: EventTemplate, topTopics: Topic[]): string {
  return [
    'Today is the day of the event. Write the event-day card the grown-up shows the child in the morning.',
    `steps: exactly three short "first, then" steps (each at most 60 characters) of what will really happen, in order, based on: ${template.steps.join('; ')}.`,
    `The team's default steps are: ${template.ritual.join(' | ')}. Keep them concrete, calm and honest; no promises about pain.`,
    `The child's biggest worries: ${topTopics.length ? topTopics.map((t) => TOPIC_LABEL[t]).join('; ') : 'none recorded'}.`,
    `techniqueId: one id from this list: ${allowedTechniques(template, ctx).map((t) => `${t.id} (${t.label})`).join(', ')}.`,
    ctx.helpedBefore.length ? `Prefer one that helped before: ${ctx.helpedBefore.join(', ')}.` : '',
    ctx.avoid.length ? `Never choose: ${ctx.avoid.join(', ')}.` : '',
    'Return JSON only: { steps: [three strings], techniqueId }.',
  ]
    .filter(Boolean)
    .join('\n');
}
