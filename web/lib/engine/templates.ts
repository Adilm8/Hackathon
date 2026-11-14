/**
 * Event templates (docs/SPEC.md 7). Imported by the server and the browser.
 * Stream A adds the other six files here as they are written; until then
 * getTemplate() falls back to dentist so screens never crash.
 */
import dentist from '@/content/events/dentist.json';
import type { EventTemplate, EventType } from './types';

const registry: Partial<Record<EventType, EventTemplate>> = {
  dentist: dentist as EventTemplate,
};

export function hasTemplate(type: EventType): boolean {
  return type in registry;
}

export function getTemplate(type: EventType): EventTemplate {
  return registry[type] ?? (registry.dentist as EventTemplate);
}

export function allTemplates(): EventTemplate[] {
  return Object.values(registry) as EventTemplate[];
}
