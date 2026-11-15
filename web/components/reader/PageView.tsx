'use client';
import type { CSSProperties, ReactNode } from 'react';
import { Character } from '@/components/character';
import { IllustratedScene } from '@/components/character/IllustratedScene';
import { Icon } from '@/components/icons';
import type { Character as CharacterT, Page, Settings } from '@/lib/engine/types';
import { resolveCharacter, SIZE_SCALE } from '@/lib/engine/character';
import { splitWords } from '@/lib/speech/words';
import type { ReadPosition } from './ListenButton';
import { UpdatedChip } from './UpdatedChip';

const SIZE: Record<Settings['textSize'], string> = { m: 'text-sentence-m', l: 'text-sentence-l', xl: 'text-sentence-xl' };

/**
 * One story or answer page (4.7). The text leads: one sentence at a time, in large type, under a
 * big scene picture (most of the height left after the text). It fills the height it is given and never makes
 * the page scroll.
 *
 * Read-along: each sentence floats in word by word when it appears. While the voice reads, the
 * spoken word is marked, the words already read stay dark and the rest wait in a softer colour.
 * With reduced motion the words appear at once and only the colours change.
 */
export function PageView({
  page, character, render, textSize, night, step, position, updatedText, extra, illustration = null, onCartoon,
}: {
  page: Page; character: CharacterT; render: (t: string) => string; textSize: Settings['textSize'];
  night: boolean;
  /** The sentence on screen. */
  step: number;
  position: ReadPosition | null; updatedText?: string; extra?: ReactNode;
  /** Painted scene for this page (lib/illustrations); null = the drawn scene. */
  illustration?: string | null;
  /** Opens cartoon mode (components/reader/CartoonPlayer.tsx). */
  onCartoon?: () => void;
}) {
  const si = Math.min(step, page.sentences.length - 1);
  const sentence = page.sentences[si];
  const words = sentence ? splitWords(render(sentence.text)) : [];
  const reading = position !== null && position.word !== null && position.sentence === si;
  const count = page.sentences.length;
  return (
    <article className="flex h-full min-h-0 flex-col gap-3 lg:gap-4">
      {/* Safe centring + scroll: on a short screen the sentence stays above the buttons instead of spilling over them. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto [justify-content:safe_center] lg:gap-5">
      <div className="scene-box relative h-[46%] min-h-[96px] max-h-[26rem] shrink-[4] overflow-hidden rounded-card border border-line bg-surface-2 max-[700px]:h-[34%] max-[700px]:min-h-[88px] lg:aspect-[16/10] lg:h-[58%] lg:max-h-[34rem] lg:min-h-[96px] lg:w-auto lg:self-center">
        <IllustratedScene id={page.background} night={night} src={illustration} />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 transition-[height] duration-base"
          style={{ height: `${SIZE_SCALE[resolveCharacter(character).size] * 100}%` }}
          data-character-size={resolveCharacter(character).size}
        >
          <Character character={character} mood={page.mood} className="h-full w-auto" />
        </div>
        {onCartoon && (
          <button type="button" onClick={onCartoon} aria-label="Watch as a cartoon"
            className="absolute right-2 top-2 inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-surface/95 px-3 text-sm font-bold text-ink shadow-sm hover:bg-surface">
            <Icon name="clapperboard" size={18} /> Cartoon
          </button>
        )}
        {page.kind === 'answer' && (
          <span className="absolute left-3 top-3 rounded-pill bg-surface/95 px-3 py-1 text-xs font-bold text-ink">Answer</span>
        )}
      </div>
      <div className="story-scroll flex min-h-[min(100%,8rem)] shrink-0 flex-col gap-3 overflow-y-auto">
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
                <span key={i} className={`h-2 rounded-pill transition-[width,background-color] duration-base ${i === si ? 'w-6 bg-primary' : i < si ? 'w-2 bg-primary/50' : 'w-2 bg-line'}`} />
              ))}
            </div>
          ) : <span />}
          <p className="text-xs text-ink-soft">{page.source === 'fallback' ? 'Story text written by our team' : 'AI-generated story'}</p>
        </div>
    </article>
  );
}
