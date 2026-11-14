'use client';
import { Character, Scene } from '@/components/character';
import type { Character as CharacterT, Page, Settings } from '@/lib/engine/types';
import { UpdatedChip } from './UpdatedChip';

const SIZE: Record<Settings['textSize'], string> = { m: 'text-story-m', l: 'text-story-l', xl: 'text-story-xl' };

/** One story or answer page: scene, the character in the page's mood, sentences with the spoken one highlighted (4.7). */
export function PageView({
  page, character, render, textSize, night, active, updatedText,
}: {
  page: Page; character: CharacterT; render: (t: string) => string; textSize: Settings['textSize'];
  night: boolean; active: number | null; updatedText?: string;
}) {
  return (
    <article aria-live="polite" className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-surface-2 sm:aspect-[16/9]">
        <Scene id={page.background} night={night} />
        <div className="absolute bottom-0 left-1/2 w-[38%] max-w-56 -translate-x-1/2 sm:w-[26%]">
          <Character character={character} mood={page.mood} />
        </div>
        {page.kind === 'answer' && (
          <span className="absolute left-3 top-3 rounded-pill bg-surface/95 px-3 py-1 text-xs font-bold">Answer</span>
        )}
      </div>
      {updatedText && <UpdatedChip text={updatedText} />}
      <p className={`${SIZE[textSize]} font-semibold leading-relaxed`}>
        {page.sentences.map((s, i) => (
          <span
            key={i}
            className={`rounded-md transition-colors duration-fast ${active === i ? 'bg-accent/40 text-ink' : ''}`}
          >
            {render(s.text)}{' '}
          </span>
        ))}
      </p>
      <p className="text-xs text-ink-soft">{page.source === 'fallback' ? 'Written by our team (the AI story writer was not available)' : 'AI-generated story'}</p>
    </article>
  );
}
