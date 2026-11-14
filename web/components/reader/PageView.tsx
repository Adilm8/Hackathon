'use client';
import type { CSSProperties, ReactNode } from 'react';
import { Character, Scene } from '@/components/character';
import type { Character as CharacterT, Page, Settings } from '@/lib/engine/types';
import { splitWords } from '@/lib/speech/words';
import type { ReadPosition } from './ListenButton';
import { UpdatedChip } from './UpdatedChip';

const SIZE: Record<Settings['textSize'], string> = { m: 'text-sentence-m', l: 'text-sentence-l', xl: 'text-sentence-xl' };

/**
 * One story or answer page (4.7). The text leads: one sentence at a time, in large type, with a
 * small scene beside it (above it on phones). It fills the height it is given and never makes
 * the page scroll.
 *
 * Read-along: each sentence floats in word by word when it appears. While the voice reads, the
 * spoken word is marked, the words already read stay dark and the rest wait in a softer colour.
 * With reduced motion the words appear at once and only the colours change.
 */
export function PageView({
  page, character, render, textSize, night, step, position, updatedText, extra,
}: {
  page: Page; character: CharacterT; render: (t: string) => string; textSize: Settings['textSize'];
  night: boolean;
  /** The sentence on screen. */
  step: number;
  position: ReadPosition | null; updatedText?: string; extra?: ReactNode;
}) {
  const si = Math.min(step, page.sentences.length - 1);
  const sentence = page.sentences[si];
  const words = sentence ? splitWords(render(sentence.text)) : [];
  const reading = position !== null && position.word !== null && position.sentence === si;
  const count = page.sentences.length;
  return (
    <article className="flex h-full min-h-0 flex-col gap-3 lg:gap-4">
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 lg:gap-5">
      <div className="relative h-[30%] min-h-[76px] max-h-60 shrink-[4] overflow-hidden rounded-card border border-line bg-surface-2 max-[700px]:h-[22%] max-[700px]:min-h-[76px] lg:aspect-[16/10] lg:h-[38%] lg:max-h-72 lg:min-h-[140px] lg:w-auto lg:self-center">
        <Scene id={page.background} night={night} />
        <div className="absolute bottom-0 left-1/2 h-[82%] -translate-x-1/2">
          <Character character={character} mood={page.mood} className="h-full w-auto" />
        </div>
        {page.kind === 'answer' && (
          <span className="absolute left-3 top-3 rounded-pill bg-surface/95 px-3 py-1 text-xs font-bold text-ink">Answer</span>
        )}
      </div>
      <div className="story-scroll flex min-h-0 flex-col gap-3 overflow-y-auto">
        {updatedText && si === 0 && <UpdatedChip text={updatedText} />}
        <div className="flex flex-1 items-center lg:justify-center">
          {/* The key restarts the entrance animation for every new sentence. */}
          <p key={`${page.id}:${si}`} aria-live="polite" className={`${SIZE[textSize]} font-bold lg:max-w-4xl lg:text-center`}>
            {words.map((w, wi) => {
              const state = !reading ? '' : wi < position.word! ? 'word-read' : wi === position.word ? 'word-now' : 'word-next';
              return (
                <span key={wi}>
                  <span className={`word word-in ${state}`} style={{ '--i': Math.min(wi, 30) } as CSSProperties}>
                    {w.text}
                  </span>{' '}
                </span>
              );
            })}
          </p>
        </div>
        {extra}
      </div>
      </div>
        <div className="flex shrink-0 items-center justify-between gap-3">
          {count > 1 ? (
            <div aria-label={`Sentence ${si + 1} of ${count}`} role="img" className="flex gap-1.5">
              {Array.from({ length: count }, (_, i) => (
                <span key={i} className={`h-2 rounded-pill transition-all duration-base ${i === si ? 'w-6 bg-primary' : i < si ? 'w-2 bg-primary/50' : 'w-2 bg-line'}`} />
              ))}
            </div>
          ) : <span />}
          <p className="text-xs text-ink-soft">{page.source === 'fallback' ? 'Story text written by our team' : 'AI-generated story'}</p>
        </div>
    </article>
  );
}
