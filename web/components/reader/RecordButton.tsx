'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { PageRecorder, recordingAvailable } from '@/lib/speech/recorder';
import { deleteRecording, saveRecording } from '@/lib/speech/recordings';

/** Parent's voice for this page (F17): record, re-record, delete. One take per page, kept on this device. */
export function RecordButton({ recKey, has, onChange, compact = false }: { recKey: string; has: boolean; onChange: () => void; compact?: boolean }) {
  const [rec, setRec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<PageRecorder | null>(null);
  useEffect(() => () => recorder.current?.cancel(), []);
  if (!recordingAvailable()) return null;

  async function toggle() {
    setError(null);
    if (rec) {
      const blob = await recorder.current!.stop();
      recorder.current = null;
      setRec(false);
      await saveRecording(recKey, blob);
      return onChange();
    }
    recorder.current = new PageRecorder();
    try {
      await recorder.current.start();
      setRec(true);
    } catch (e) {
      recorder.current = null;
      setError(e === 'denied' ? 'Allow the microphone to record your voice.' : 'Recording is not available here.');
    }
  }

  const iconBtn = 'inline-flex size-tap shrink-0 items-center justify-center rounded-pill hover:bg-surface-2';
  if (compact)
    return (
      <div className="relative flex items-center">
        <button
          type="button"
          aria-pressed={rec}
          onClick={toggle}
          aria-label={rec ? 'Stop recording' : has ? 'Record my voice again' : 'Record my voice for this page'}
          title={rec ? 'Stop recording' : has ? 'Record again' : 'Record my voice'}
          className={`${iconBtn} ${rec ? 'bg-danger text-danger-ink hover:bg-danger' : ''}`}
        >
          <Icon name={rec ? 'mic-off' : 'mic'} size={22} />
        </button>
        {has && !rec && (
          <button
            type="button"
            aria-label="Delete my recording of this page"
            title="Delete recording"
            onClick={async () => { await deleteRecording(recKey); onChange(); }}
            className={`${iconBtn} text-lg font-extrabold text-ink-soft`}
          >
            <span aria-hidden>×</span>
          </button>
        )}
        {(rec || error) && (
          <span role={error ? 'alert' : 'status'} className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-pill bg-surface px-3 py-1 text-xs font-bold text-danger shadow-pop">
            {error ?? 'Recording… read this page aloud'}
          </span>
        )}
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" aria-pressed={rec} onClick={toggle}>
        {rec ? 'Stop recording' : has ? 'Record again' : 'Record my voice'}
      </Button>
      {has && !rec && (
        <Button variant="ghost" onClick={async () => { await deleteRecording(recKey); onChange(); }}>Delete recording</Button>
      )}
      {rec && <span role="status" className="text-sm font-bold text-danger">Recording… read this page aloud</span>}
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
    </div>
  );
}
