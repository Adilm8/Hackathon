'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { markAt, timeFor, type ChapterTake } from '@/lib/speech/chapterTake';

/**
 * Listen for a chapter recorded in one take: starts at the sentence on screen and turns the pages
 * by itself at the saved time marks. A tap on Next/Back while it plays jumps the voice there.
 * Not keyed by the page: turning pages must not stop the take.
 */
export function TakeListenButton({
  take, pageId, step, navTick, voiceName, onFollow, autoStart = false,
}: {
  take: ChapterTake;
  pageId: string;
  step: number;
  /** Changes on every tap on Next/Back (not on turns made by the take itself). */
  navTick: number;
  voiceName?: string;
  /** The take moved on: show this page and sentence. */
  onFollow: (pageId: string, step: number) => void;
  autoStart?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const at = useRef({ pageId, step });
  const follow = useRef(onFollow);
  const marks = useRef(take.marks);
  useEffect(() => {
    at.current = { pageId, step };
    follow.current = onFollow;
    marks.current = take.marks;
  });

  useEffect(() => {
    const url = URL.createObjectURL(take.blob);
    const a = new Audio(url);
    a.preload = 'auto';
    audio.current = a;
    a.ontimeupdate = () => {
      const m = markAt(marks.current, a.currentTime);
      if (m && (m.pageId !== at.current.pageId || m.step !== at.current.step)) {
        at.current = { pageId: m.pageId, step: m.step };
        follow.current(m.pageId, m.step);
      }
    };
    a.onended = a.onpause = () => setPlaying(!a.paused && !a.ended);
    a.onplay = () => setPlaying(true);
    return () => {
      a.pause();
      a.ontimeupdate = a.onended = a.onpause = a.onplay = null;
      audio.current = null;
      URL.revokeObjectURL(url);
    };
  }, [take]);

  const seek = (t: number) => {
    const a = audio.current;
    if (!a) return;
    if (a.readyState >= 1) a.currentTime = t;
    else a.addEventListener('loadedmetadata', () => { a.currentTime = t; }, { once: true });
  };

  // A tap on Next/Back while playing: the voice jumps to that sentence.
  const lastTick = useRef(navTick);
  useEffect(() => {
    if (navTick === lastTick.current) return;
    lastTick.current = navTick;
    if (audio.current && !audio.current.paused) seek(timeFor(marks.current, pageId, step));
  }, [navTick, pageId, step]);

  const play = () => {
    const a = audio.current;
    if (!a) return;
    // play() first, inside the tap (iOS), then the seek.
    void a.play().catch(() => setPlaying(false));
    seek(timeFor(marks.current, at.current.pageId, at.current.step));
  };
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });
  useEffect(() => {
    if (!autoStart) return;
    const t = window.setTimeout(() => playRef.current(), 350);
    return () => window.clearTimeout(t);
  }, [autoStart]);

  return (
    <Button
      variant="secondary"
      aria-pressed={playing}
      aria-label={playing ? 'Stop reading aloud' : undefined}
      className="px-4 sm:px-6"
      data-take-listen
      onClick={() => (playing ? audio.current?.pause() : play())}
    >
      <Icon name="volume-2" size={20} />
      <span className={playing ? '' : 'max-sm:sr-only'}>
        {playing ? 'Stop' : `Listen to ${voiceName ? `${voiceName}'s` : 'your'} voice`}
      </span>
    </Button>
  );
}
