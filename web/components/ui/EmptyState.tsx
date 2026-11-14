import type { ReactNode } from 'react';

/** Empty state of the style guide: illustration, title, one sentence, one button. */
export function EmptyState({ art, title, text, action }: { art?: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
      {art}
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <p className="text-base text-ink-soft">{text}</p>
      {action}
    </div>
  );
}
