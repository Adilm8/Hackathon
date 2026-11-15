'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons';
import { narrator } from '@/lib/speech/narrator';
import { RecordedNarrator } from '@/lib/speech/recorder';
import { allowedVoice, cloudNarrator, premiumVoices, type StoryVoice } from '@/lib/speech/cloud';
import { useGoldExtra } from '@/lib/store/hooks';
import type { Narrator } from '@/lib/speech/types';
import { estimateWordStarts, mapWordIndex, splitWords, wordAtChar, wordAtTime } from '@/lib/speech/words';
import { Button } from '@/components/ui/Button';
import { RATES } from '@/lib/speech/voices';
import { usePrefs } from '@/lib/store/prefs';

/** Where the voice is: sentence and word of the shown text. `word` is null for a parent's recording (one take per page). */
export type ReadPosition = { sentence: number; word: number | null };

const noop = () => () => {};

/**
 * Listen: speaks the page sentence by sentence; started only by a tap; hidden without speech
 * synthesis (11.6). Reports the spoken word for the read-along highlight: from the voice's word
 * boundaries when it gives them, else from a time estimate (lib/speech/words.ts).
 * Render with `key={page.id}`: a new page unmounts the button, which stops the voice.
 */
export function ListenButton({
  sentences, shown, from = 0, onProgress, recordingKey, hasRecording = false, voiceName, autoStart = false, onFinished, night = false,
}: {
  /** Night scenes: the voice reads about 10% slower, for winding down (SPEC 17.1 adaptation). */
  night?: boolean;
  /** Read on: start speaking as soon as the button mounts (the page was turned by the voice). */
  autoStart?: boolean;
  /** The voice reached the end of the page by itself (not stopped by a tap). */
  onFinished?: () => void;
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
  const voiceURI = usePrefs((p) => p.voiceURI);
  const RATE = (RATES[usePrefs((p) => p.speechRate)] ?? RATES.normal) * (night ? 0.9 : 1);
  const finished = useRef(onFinished);
  const play = useRef<() => void>(() => {});
  useEffect(() => {
    report.current = onProgress;
    finished.current = onFinished;
  }, [onProgress, onFinished]);

  const stopTimer = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };

  const wantPremium = usePrefs((p) => p.storyVoice) === 'premium';
  const characterVoice = usePrefs((p) => p.characterVoice);
  const [offered, setOffered] = useState<StoryVoice[]>([]);
  const premium = offered.length > 0;
  useEffect(() => {
    let live = true;
    if (wantPremium) void premiumVoices().then((v) => live && setOffered(v));
    return () => { live = false; };
  }, [wantPremium]);
  // Gold extras (SPEC 10.1): without Gold the Moon Storyteller and family voices fall back to the default storyteller.
  const goldVoice = useGoldExtra('voice.premium');
  const goldClone = useGoldExtra('voice.clone');
  const storyVoiceId = allowedVoice(characterVoice, offered, { premium: goldVoice, clone: goldClone });
  const usePremium = wantPremium && premium && !useRecording;
  useEffect(() => {
    player.current = useRecording ? new RecordedNarrator(recordingKey!) : usePremium ? cloudNarrator : narrator;
  }, [useRecording, recordingKey, usePremium]);
  useEffect(() => {
    if (!autoStart) return;
    const t = window.setTimeout(() => play.current(), 350); // a short breath between pages
    return () => window.clearTimeout(t);
  }, [autoStart]);
  useEffect(
    () => () => {
      stopTimer();
      player.current.stop();
      narrator.stop();
      cloudNarrator.stop();
      report.current(null);
    },
    [],
  );

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

  const playNow = () => {
    setPlaying(true);
    // A parent's recording is one take for the whole page, so it always starts at the top.
    start.current = useRecording ? 0 : Math.min(from, sentences.length - 1);
    const t0 = performance.now();
    player.current.speak(sentences.slice(start.current), {
      rate: useRecording ? undefined : RATE,
      // For the premium voice this carries the character voice id.
      voiceURI: useRecording ? undefined : usePremium ? storyVoiceId : voiceURI,
      onSentence,
      onWord: useRecording ? undefined : onWord,
      onEnd: () => {
        stopTimer();
        setPlaying(false);
        report.current(null);
        // An end within a second is a failure (blocked autoplay, no voice), not a read page: do not chain.
        if (performance.now() - t0 > 1000) finished.current?.();
      },
    });
  };

  useEffect(() => {
    play.current = playNow;
  });
  if (!available) return null;
  return (
    <Button
      variant="secondary"
      aria-pressed={playing}
      aria-label={playing ? 'Stop reading aloud' : undefined}
      className="px-4 sm:px-6"
      onClick={() => {
        if (playing) return stop();
        playNow();
      }}
    >
      <Icon name="volume-2" size={20} />
      <span className={playing ? '' : 'max-sm:sr-only'}>
        {playing ? 'Stop' : useRecording ? `Listen to ${voiceName ?? 'your'}${voiceName ? "'s" : ''} voice` : 'Listen'}
      </span>
    </Button>
  );
}
