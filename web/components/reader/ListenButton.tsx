'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons';
import { narrator } from '@/lib/speech/narrator';
import { RecordedNarrator } from '@/lib/speech/recorder';
import type { Narrator } from '@/lib/speech/types';
import { estimateWordStarts, mapWordIndex, splitWords, wordAtChar, wordAtTime } from '@/lib/speech/words';
import { Button } from '@/components/ui/Button';

/** Where the voice is: sentence and word of the shown text. `word` is null for a parent's recording (one take per page). */
export type ReadPosition = { sentence: number; word: number | null };

const RATE = 0.92;
const noop = () => () => {};

/**
 * Listen: speaks the page sentence by sentence; started only by a tap; hidden without speech
 * synthesis (11.6). Reports the spoken word for the read-along highlight: from the voice's word
 * boundaries when it gives them, else from a time estimate (lib/speech/words.ts).
 * Render with `key={page.id}`: a new page unmounts the button, which stops the voice.
 */
export function ListenButton({
  sentences, shown, from = 0, onProgress, recordingKey, hasRecording = false, voiceName,
}: {
  /** The voice starts at this sentence (the one on screen). */
  from?: number;
  /** Text for the voice (names by their pronunciation). */
  sentences: string[];
  /** Text on the page, one entry per sentence. */
  shown: string[];
  onProgress: (p: ReadPosition | null) => void;
  /** F17: when the parent recorded this page, the recording is played instead of the synthetic voice. */
  recordingKey?: string; hasRecording?: boolean; voiceName?: string;
}) {
  const synthOk = useSyncExternalStore(noop, () => narrator.available(), () => false);
  const useRecording = hasRecording && !!recordingKey;
  const available = synthOk || useRecording;
  const [playing, setPlaying] = useState(false);
  const player = useRef<Narrator>(narrator);
  const timer = useRef<number | null>(null);
  const boundaries = useRef(false);
  const report = useRef(onProgress);
  const start = useRef(0);
  useEffect(() => {
    report.current = onProgress;
  }, [onProgress]);

  const stopTimer = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    player.current = useRecording ? new RecordedNarrator(recordingKey!) : narrator;
  }, [useRecording, recordingKey]);
  useEffect(
    () => () => {
      stopTimer();
      player.current.stop();
      narrator.stop();
      report.current(null);
    },
    [],
  );
  if (!available) return null;

  const shownCount = (i: number) => splitWords(shown[i] ?? '').length;

  const onSentence = (i: number) => {
    stopTimer();
    i += start.current;
    if (useRecording) return report.current({ sentence: i, word: null });
    report.current({ sentence: i, word: 0 });
    if (boundaries.current) return;
    // No boundary events seen yet on this voice: move the highlight by the estimate until one arrives.
    const spoken = splitWords(sentences[i] ?? '');
    const starts = estimateWordStarts(spoken, RATE);
    const t0 = performance.now();
    let last = 0;
    timer.current = window.setInterval(() => {
      if (boundaries.current) return stopTimer();
      const w = mapWordIndex(wordAtTime(starts, performance.now() - t0), spoken.length, shownCount(i));
      if (w !== last) {
        last = w;
        report.current({ sentence: i, word: w });
      }
    }, 60);
  };

  const onWord = (i: number, charIndex: number) => {
    i += start.current;
    if (!boundaries.current) {
      boundaries.current = true;
      stopTimer();
    }
    const spoken = splitWords(sentences[i] ?? '');
    report.current({ sentence: i, word: mapWordIndex(wordAtChar(spoken, charIndex), spoken.length, shownCount(i)) });
  };

  const stop = () => {
    stopTimer();
    player.current.stop();
    setPlaying(false);
    report.current(null);
  };

  return (
    <Button
      variant="secondary"
      aria-pressed={playing}
      aria-label={playing ? 'Stop reading aloud' : undefined}
      className="px-4 sm:px-6"
      onClick={() => {
        if (playing) return stop();
        setPlaying(true);
        // A parent's recording is one take for the whole page, so it always starts at the top.
        start.current = useRecording ? 0 : Math.min(from, sentences.length - 1);
        player.current.speak(sentences.slice(start.current), {
          rate: useRecording ? undefined : RATE,
          onSentence,
          onWord: useRecording ? undefined : onWord,
          onEnd: () => {
            stopTimer();
            setPlaying(false);
            report.current(null);
          },
        });
      }}
    >
      <Icon name="volume-2" size={20} />
      <span className={playing ? '' : 'max-sm:sr-only'}>
        {playing ? 'Stop' : useRecording ? `Listen to ${voiceName ?? 'your'}${voiceName ? "'s" : ''} voice` : 'Listen'}
      </span>
    </Button>
  );
}
