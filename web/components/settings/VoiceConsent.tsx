'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { deviceStatus, hasRecognition, installDeviceSpeech, speechVendor, type ListenMode } from '@/lib/speech/listener';
import { deleteRecordings, listRecordingKeys } from '@/lib/speech/recordings';

/**
 * Voice options (SPEC 4.15, 11.6): consent for voice questions and management of the parent's
 * recordings. On the tap the browser is asked whether recognition can stay on the device; if not,
 * the browser's own speech service is used, and the consent text names the company that hears it.
 * `onChange(undefined)` withdraws consent.
 */
const noop = () => () => {};
const getUA = () => navigator.userAgent;

export function VoiceConsent({
  consentOn, mode, onChange, workspace,
}: {
  consentOn: string | undefined;
  mode?: ListenMode;
  onChange: (consentOn: string | undefined, mode?: ListenMode) => void;
  workspace: string;
}) {
  // Only whether the API exists: asking the browser for on-device support waits for a tap (it can crash some builds).
  const supported = useSyncExternalStore(noop, hasRecognition, () => false);
  const vendor = speechVendor(useSyncExternalStore(noop, getUA, () => ''));
  const [count, setCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const prefix = `${workspace}:`;

  useEffect(() => {
    let live = true;
    listRecordingKeys(prefix).then((k) => live && setCount(k.length)).catch(() => live && setCount(0));
    return () => { live = false; };
  }, [prefix]);

  const today = () => new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-4">
      {supported && (
        <div className="grid gap-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-6 w-6 accent-primary" checked={!!consentOn}
              disabled={checking}
              onChange={async (e) => {
                if (!e.target.checked) return onChange(undefined);
                setChecking(true);
                const status = await deviceStatus();
                setChecking(false);
                setCanDownload(status === 'downloadable');
                onChange(today(), status === 'available' ? 'device' : 'browser');
              }} />
            <span>
              <span className="block font-bold text-ink">Ask questions by voice</span>
              <span className="text-sm text-ink-soft">
                You, or your child next to you, can say the question. A grown-up checks the words before they are sent. Where your device can, speech is turned into
                text on the device. Otherwise {vendor === 'your browser maker' ? 'your browser maker' : vendor}&apos;s speech service hears the
                audio to turn it into text, as with keyboard dictation. We never record, store or send the audio ourselves.
              </span>
            </span>
          </label>
          {consentOn && (
            <p role="status" className="text-sm font-bold text-ink-soft">
              {mode === 'device' ? 'Speech stays on this device.' : `Uses ${vendor}'s speech service.`}
            </p>
          )}
          {consentOn && mode === 'browser' && canDownload && (
            <Button variant="secondary" className="justify-self-start" disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                const ok = await installDeviceSpeech();
                setDownloading(false);
                if (ok && (await deviceStatus()) === 'available') {
                  setCanDownload(false);
                  onChange(consentOn, 'device');
                }
              }}>
              {downloading ? 'Downloading…' : 'Keep speech on this device (download English pack)'}
            </Button>
          )}
        </div>
      )}
      {!supported && (
        <p className="text-sm text-ink-soft">Asking by voice is not available in this browser. You can type the question, or use the microphone on your keyboard.</p>
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
