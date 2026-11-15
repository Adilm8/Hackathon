'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageRecorder, recordingAvailable } from '@/lib/speech/recorder';
import { MicLevel } from './MicLevel';

/**
 * Record the chapter in one take (F17): tap, then read aloud and turn the pages as usual; the reader
 * saves a time mark at every turn. Tap again to stop. The take stays on this device.
 */
export function ChapterRecordButton({
  has, onStart, onStop, onDelete, className = '',
}: {
  has: boolean;
  onStart: (rec: PageRecorder) => void;
  onStop: (blob: Blob) => Promise<void>;
  onDelete: () => void;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'rec' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<PageRecorder | null>(null);
  useEffect(() => () => recorder.current?.cancel(), []);
  if (!recordingAvailable()) return null;

  async function toggle() {
    setError(null);
    if (state === 'saving') return;
    if (state === 'rec') {
      const r = recorder.current!;
      recorder.current = null;
      setState('saving');
      try {
        await onStop(await r.stop());
      } catch {
        setError('Could not save the recording. Try again.');
      }
      return setState('idle');
    }
    const r = new PageRecorder();
    try {
      await r.start();
    } catch (e) {
      return setError(e === 'denied' ? 'Allow the microphone to record your voice.' : 'Recording is not available here.');
    }
    recorder.current = r;
    onStart(r);
    setState('rec');
  }

  const rec = state === 'rec';
  return (
    <div className="relative flex items-center">
      <button
        type="button"
        aria-pressed={rec}
        onClick={toggle}
        disabled={state === 'saving'}
        aria-label={rec ? 'Stop recording' : has ? 'Record this chapter again in my voice' : 'Record this chapter in my voice'}
        title={rec ? 'Stop recording' : has ? 'Record again' : 'Record my voice'}
        className={`${className} ${rec ? 'bg-danger text-danger-ink hover:bg-danger' : ''}`}
      >
        <Icon name={rec ? 'mic-off' : 'mic'} size={22} />
      </button>
      {has && state === 'idle' && (
        <button
          type="button"
          aria-label="Delete my recording of this chapter"
          title="Delete recording"
          onClick={onDelete}
          className={`${className} text-lg font-extrabold text-ink-soft`}
        >
          <span aria-hidden>×</span>
        </button>
      )}
      {(state !== 'idle' || error) && (
        <span role={error ? 'alert' : 'status'} className="absolute right-0 top-full z-10 mt-1 grid max-w-[80vw] gap-1 rounded-card bg-surface px-3 py-2 text-xs font-bold shadow-pop">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : state === 'saving' ? (
            <span className="text-ink-soft">Saving your recording…</span>
          ) : (
            <>
              <MicLevel level={() => recorder.current?.level() ?? 0} elapsed={() => recorder.current?.elapsed() ?? 0} />
              <span className="text-ink-soft">Read aloud and turn the pages as usual. Tap the mic to finish.</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
