'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons';
import { narrator } from '@/lib/speech/narrator';
import { RecordedNarrator } from '@/lib/speech/recorder';
import type { Narrator } from '@/lib/speech/types';
import { Button } from '@/components/ui/Button';

/** Listen: speaks the page sentence by sentence; started only by a tap; hidden without speech synthesis (11.6). */
const noop = () => () => {};

/** Render with `key={page.id}`: a new page unmounts the button, which stops the voice. */
export function ListenButton({
  sentences, onSentence, recordingKey, hasRecording = false, voiceName,
}: {
  sentences: string[]; onSentence: (i: number | null) => void;
  /** F17: when the parent recorded this page, the recording is played instead of the synthetic voice. */
  recordingKey?: string; hasRecording?: boolean; voiceName?: string;
}) {
  const synthOk = useSyncExternalStore(noop, () => narrator.available(), () => false);
  const useRecording = hasRecording && !!recordingKey;
  const available = synthOk || useRecording;
  const [playing, setPlaying] = useState(false);
  const player = useRef<Narrator>(narrator);
  useEffect(() => {
    player.current = useRecording ? new RecordedNarrator(recordingKey!) : narrator;
  }, [useRecording, recordingKey]);
  useEffect(
    () => () => {
      player.current.stop();
      narrator.stop();
      onSentence(null);
    },
    [onSentence],
  );
  if (!available) return null;
  return (
    <Button
      variant="secondary"
      aria-pressed={playing}
      onClick={() => {
        if (playing) {
          player.current.stop();
          setPlaying(false);
          onSentence(null);
          return;
        }
        setPlaying(true);
        player.current.speak(sentences, {
          onSentence: (i) => onSentence(i),
          onEnd: () => {
            setPlaying(false);
            onSentence(null);
          },
        });
      }}
    >
      <Icon name="volume-2" size={20} /> {playing ? 'Stop' : useRecording ? `Listen to ${voiceName ?? 'your'}${voiceName ? "'s" : ''} voice` : 'Listen'}
    </Button>
  );
}
