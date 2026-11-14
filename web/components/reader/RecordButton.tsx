'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PageRecorder, recordingAvailable } from '@/lib/speech/recorder';
import { deleteRecording, saveRecording } from '@/lib/speech/recordings';

/** Parent's voice for this page (F17): record, re-record, delete. One take per page, kept on this device. */
export function RecordButton({ recKey, has, onChange }: { recKey: string; has: boolean; onChange: () => void }) {
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
