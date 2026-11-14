'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { BrowserListener, mayListenOnDevice } from '@/lib/speech/listener';
import { deleteRecordings, listRecordingKeys } from '@/lib/speech/recordings';

/**
 * Voice options (SPEC 4.15, 11.6): consent for voice questions (shown only where recognition runs on the
 * device) and management of the parent's recordings. `onChange(undefined)` withdraws consent.
 */
const noop = () => () => {};

export function VoiceConsent({
  consentOn, onChange, workspace,
}: {
  consentOn: string | undefined;
  onChange: (consentOn: string | undefined) => void;
  workspace: string;
}) {
  // Only whether the API exists: asking the browser for on-device support waits for a tap (it can crash some builds).
  const mayListen = useSyncExternalStore(noop, mayListenOnDevice, () => false);
  const [refused, setRefused] = useState(false);
  const supported = mayListen && !refused;
  const [count, setCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const prefix = `${workspace}:`;

  useEffect(() => {
    let live = true;
    listRecordingKeys(prefix).then((k) => live && setCount(k.length)).catch(() => live && setCount(0));
    return () => { live = false; };
  }, [prefix]);

  return (
    <div className="grid gap-4">
      {supported && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-6 w-6 accent-primary" checked={!!consentOn}
            disabled={checking}
            onChange={async (e) => {
              if (!e.target.checked) return onChange(undefined);
              setChecking(true);
              const ok = await new BrowserListener().available();
              setChecking(false);
              if (ok) onChange(new Date().toISOString().slice(0, 10));
              else setRefused(true);
            }} />
          <span>
            <span className="font-bold text-ink block">Let a grown-up ask questions by voice</span>
            <span className="text-sm text-ink-soft">
              Your device turns speech into text, and you check the words before they are sent. We never store or send the audio.
            </span>
          </span>
        </label>
      )}
      {!supported && (
        <p className="text-sm text-ink-soft">Asking by voice is not available on this device or browser. You can always type the question.</p>
      )}
      <div className="grid gap-2">
        <p className="font-bold text-ink">Your voice recordings</p>
        <p className="text-sm text-ink-soft">Recordings stay on this device only.{count !== null && ` ${count === 0 ? 'None saved yet.' : `${count} saved.`}`}</p>
        {!!count && (
          <Button variant="secondary" className="justify-self-start"
            onClick={async () => { await deleteRecordings(prefix); setCount(0); }}>
            Delete all recordings
          </Button>
        )}
      </div>
    </div>
  );
}
