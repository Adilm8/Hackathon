/** Random ids for events, questions and pages (crypto.randomUUID with a fallback for old Safari). */
export function newId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  c?.getRandomValues?.(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
