'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { backgroundForEvent, Character } from '@/components/character';
import { IllustratedScene } from '@/components/character/IllustratedScene';
import { Icon } from '@/components/icons';
import type { Beat, ChildProfile, EventType, Page } from '@/lib/engine/types';
import { beatForPage, illustrationKey, illustrationSrc } from '@/lib/illustrations';
import { framesEnabled, prefetchFrames } from '@/lib/frames/client';
import { Lullaby } from '@/lib/fx/lullaby';
import { usePrefs } from '@/lib/store/prefs';
import { narrator } from '@/lib/speech/narrator';
import { splitWords } from '@/lib/speech/words';
import { renderText } from '@/lib/store/engine';
import { ListenButton, type ReadPosition } from './ListenButton';

const noop = () => () => {};
/** Slow camera moves, one per page in turn (app/globals.css .cartoon-cam-*). */
const MOVES = ['in-left', 'in-right', 'out-center', 'pan-right', 'pan-left'] as const;

/**
 * Cartoon mode: the chapter as a narrated full-screen slideshow. Each page fills the screen with
 * its painted scene and a slow camera move; the Story friend stands in front and moves gently;
 * the storyteller voice (premium, device or the parent's recording, same as Listen) reads the page
 * with the spoken word lit in the subtitle, then the next page fades in by itself. Without a voice
 * the pages turn on a reading-time timer. Questions and the parent panel stay in the normal
 * reader; this is for watching.
 */
export function CartoonPlayer({
  pages, child, eventType, beats, night, start = 0, onClose, recordingKeyFor,
}: {
  pages: Page[];
  child: ChildProfile;
  eventType: EventType;
  beats: Beat[];
  night: boolean;
  start?: number;
  onClose: (lastPage: number) => void;
  /** The parent's recording for a page, when there is one (same as the reader). */
  recordingKeyFor?: (pageId: string) => { key: string; has: boolean } | undefined;
}) {
  const [idx, setIdx] = useState(Math.min(start, pages.length - 1));
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [position, setPosition] = useState<ReadPosition | null>(null);
  const [ended, setEnded] = useState(false);
  const [run, setRun] = useState(0);
  const voice = useSyncExternalStore(noop, () => narrator.available(), () => false);
  const page = pages[idx];
  const render = useCallback((t: string) => renderText(t, child), [child]);
  // Story frames: pictures drawn for each page's words, from the current page on (lib/frames).
  const [frames, setFrames] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    void framesEnabled().then((on) => {
      if (!on || !live) return;
      const order = [...pages.slice(idx), ...pages.slice(0, idx)];
      void prefetchFrames(order.map((p) => ({ id: p.id, sentences: p.sentences.map((s) => s.text) })), eventType,
        (id, url) => setFrames((f) => ({ ...f, [id]: url })), () => live);
    });
    return () => { live = false; };
    // Only when the player opens: page turns must not restart the downloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, eventType]);
  // A quiet lullaby, softer while the storyteller speaks.
  const music = usePrefs((p) => p.cartoonMusic);
  const setMusic = usePrefs((p) => p.setCartoonMusic);
  const lullaby = useRef<Lullaby | null>(null);
  useEffect(() => {
    if (!music) return;
    const l = new Lullaby();
    lullaby.current = l;
    l.start();
    return () => { l.stop(); lullaby.current = null; };
  }, [music]);
  const speaking = position !== null;
  useEffect(() => { lullaby.current?.duck(speaking); }, [speaking]);

  const go = useCallback((i: number, keepPlaying: boolean) => {
    if (i < 0) return;
    if (i >= pages.length) {
      setEnded(true);
      setAuto(false);
      return;
    }
    setPrevIdx(idx);
    setIdx(i);
    setPosition(null);
    setAuto(keepPlaying);
    setRun((n) => n + 1);
  }, [idx, pages.length]);

  // Escape leaves; arrows turn pages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(idx);
      if (e.key === 'ArrowRight') go(idx + 1, false);
      if (e.key === 'ArrowLeft') go(idx - 1, false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, idx, onClose]);

  // Without any voice the pages turn after a gentle reading time.
  const rec = page ? recordingKeyFor?.(page.id) : undefined;
  const silent = !voice && !rec?.has;
  useEffect(() => {
    if (!silent || !auto || ended || !page) return;
    const words = page.sentences.reduce((n, s) => n + splitWords(s.text).length, 0);
    const t = window.setTimeout(() => go(idx + 1, true), 2500 + words * 380);
    return () => window.clearTimeout(t);
  }, [silent, auto, ended, page, idx, go]);

  // The old picture fades out under the new one.
  useEffect(() => {
    if (prevIdx === null) return;
    const t = window.setTimeout(() => setPrevIdx(null), 1300);
    return () => window.clearTimeout(t);
  }, [prevIdx]);

  if (!page) return null;
  const sentenceIdx = position?.sentence ?? 0;
  const sentence = page.sentences[Math.min(sentenceIdx, page.sentences.length - 1)];
  const words = sentence ? splitWords(render(sentence.text)) : [];
  const layer = (i: number, fresh: boolean) => {
    const p = pages[i];
    const src = illustrationSrc(illustrationKey(eventType, p.background, backgroundForEvent(eventType), beatForPage(beats, i, pages.length)));
    return (
      <div key={`${p.id}:${i}`} className={`absolute inset-0 overflow-hidden ${fresh ? 'cartoon-fade-in' : ''}`}>
        <div className={`cartoon-cam cartoon-cam-${MOVES[i % MOVES.length]} absolute inset-0`}>
          <IllustratedScene id={p.background} night={night} src={src} />
          {frames[p.id] && (
            // eslint-disable-next-line @next/next/no-img-element -- a picture drawn for this page (object URL)
            <img src={frames[p.id]} alt="" aria-hidden draggable={false}
              className={`cartoon-fade-in absolute inset-0 h-full w-full object-cover ${night ? 'brightness-[.62] saturate-[.8] hue-rotate-[12deg]' : ''}`} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Cartoon" className="fixed inset-0 z-[60] flex flex-col bg-[#0E1020] text-white">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {prevIdx !== null && prevIdx !== idx && layer(prevIdx, false)}
        {layer(idx, prevIdx !== null)}
        <div key={`friend:${page.id}`} className="cartoon-friend absolute bottom-[4%] left-1/2 h-[58%] max-[700px]:h-[46%]">
          <Character character={child.character} mood={page.mood} className="h-full w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,.25)]" />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/45 to-transparent p-3 sm:p-4">
          <span className="rounded-pill bg-black/35 px-3 py-1 text-sm font-bold">{idx + 1} / {pages.length}</span>
          <button type="button" onClick={() => setMusic(!music)} aria-pressed={music} aria-label={music ? 'Music off' : 'Music on'}
            className={`ml-auto grid size-11 place-items-center rounded-full hover:bg-black/55 ${music ? 'bg-black/35' : 'bg-black/35 opacity-60'}`}>
            <Icon name="music" size={20} />
          </button>
          <button type="button" onClick={() => onClose(idx)} aria-label="Leave cartoon" className="grid size-11 place-items-center rounded-full bg-black/35 hover:bg-black/55">
            <Icon name="x" size={22} />
          </button>
        </div>
        {ended && (
          <div className="absolute inset-0 grid place-items-center bg-black/50">
            <div className="flex flex-col items-center gap-4 rounded-card bg-surface p-6 text-ink shadow-lg">
              <p className="font-display text-2xl font-extrabold">The end</p>
              <div className="flex gap-3">
                <button type="button" className="flex min-h-tap items-center gap-2 rounded-pill border border-line px-5 font-bold"
                  onClick={() => { setEnded(false); go(0, true); }}>
                  <Icon name="rotate-ccw" size={20} /> Watch again
                </button>
                <button type="button" className="min-h-tap rounded-pill bg-primary px-5 font-bold text-primary-ink" onClick={() => onClose(pages.length - 1)}>
                  Back to the book
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 bg-[#0E1020] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
        <p key={`${page.id}:${sentenceIdx}`} aria-live="polite" className="mx-auto min-h-[3.2em] max-w-4xl text-center text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">
          {words.map((w, wi) => {
            const reading = position?.word !== null && position?.word !== undefined;
            const state = !reading ? '' : wi < position!.word! ? 'cartoon-word-read' : wi === position!.word ? 'word-now' : 'cartoon-word-next';
            return (
              <span key={wi}>
                <span className={`word word-in ${state}`} style={{ '--i': Math.min(wi, 30) } as CSSProperties}>{w.text}</span>{' '}
              </span>
            );
          })}
        </p>
        <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-3 [&_button]:!border-white/30 [&_button]:!bg-white/10 [&_button]:!text-white">
          <button type="button" onClick={() => go(idx - 1, false)} disabled={idx === 0} aria-label="Previous picture"
            className="grid size-12 place-items-center rounded-full border disabled:opacity-40">
            <Icon name="chevron-left" size={24} />
          </button>
          {silent ? (
            <button type="button" onClick={() => setAuto((a) => !a)} aria-label={auto ? 'Pause' : 'Play'}
              className="grid size-14 place-items-center rounded-full border">
              <Icon name={auto ? 'pause' : 'play'} size={26} />
            </button>
          ) : (
            <ListenButton
              key={`${page.id}:${run}`}
              sentences={page.sentences.map((s) => renderText(s.text, child, { speak: true, pronunciation: child.pronunciation }))}
              shown={page.sentences.map((s) => render(s.text))}
              onProgress={setPosition}
              recordingKey={rec?.key} hasRecording={!!rec?.has} voiceName={child.values.family[0]}
              autoStart={auto && !ended}
              onFinished={() => go(idx + 1, true)}
              night={night}
            />
          )}
          <button type="button" onClick={() => go(idx + 1, false)} aria-label="Next picture"
            className="grid size-12 place-items-center rounded-full border">
            <Icon name="chevron-right" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ref-free helper for tests: which camera move a page gets. */
export function cameraMove(i: number): (typeof MOVES)[number] {
  return MOVES[i % MOVES.length];
}

