import type { ReactNode } from 'react';

/** The guide character with a speech bubble (style guide: Guide bubble). */
export function GuideBubble({ guide, children }: { guide: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-end gap-3">
      <div className="shrink-0">{guide}</div>
      <div className="relative rounded-card border-2 border-line bg-surface px-4 py-3 text-base font-bold shadow-step">
        {children}
        <span aria-hidden className="absolute -left-2 bottom-4 size-4 rotate-45 border-b-2 border-l-2 border-line bg-surface" />
      </div>
    </div>
  );
}
