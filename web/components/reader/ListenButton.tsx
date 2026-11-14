'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons';
import { narrator } from '@/lib/speech/narrator';
import { Button } from '@/components/ui/Button';

/** Listen: speaks the page sentence by sentence; started only by a tap; hidden without speech synthesis (11.6). */
const noop = () => () => {};

/** Render with `key={page.id}`: a new page unmounts the button, which stops the voice. */
export function ListenButton({ sentences, onSentence }: { sentences: string[]; onSentence: (i: number | null) => void }) {
  const available = useSyncExternalStore(noop, () => narrator.available(), () => false);
  const [playing, setPlaying] = useState(false);
  useEffect(
    () => () => {
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
          narrator.stop();
          setPlaying(false);
          onSentence(null);
          return;
        }
        setPlaying(true);
        narrator.speak(sentences, {
          onSentence: (i) => onSentence(i),
          onEnd: () => {
            setPlaying(false);
            onSentence(null);
          },
        });
      }}
    >
      <Icon name="volume-2" size={20} /> {playing ? 'Stop' : 'Listen'}
    </Button>
  );
}
