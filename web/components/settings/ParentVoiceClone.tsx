'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PageRecorder, recordingAvailable } from '@/lib/speech/recorder';
import { recordingToWav, toBase64 } from '@/lib/speech/wav';
import { getWorkspace } from '@/lib/store/workspace';

/**
 * "My voice as the storyteller" (demo, Lida 15 Nov 2026). The adult reads a short text once; the
 * story can then be read in a voice like theirs. A voice is biometric data: explicit consent first,
 * one sample per family, "Delete my voice" at any time, removed after 30 days at the latest.
 */
type Status = { has: boolean; transcript: string } | null;

const headers = () => ({ 'content-type': 'application/json', 'x-bds-workspace': getWorkspace() });

export async function fetchVoiceSample(): Promise<Status> {
  try {
    const r = await fetch('/api/voice-sample', { headers: headers(), cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { enabled: boolean; has: boolean; transcript: string };
    return j.enabled ? { has: j.has, transcript: j.transcript } : null;
  } catch {
    return null;
  }
}

export function ParentVoiceClone({ onChange }: { onChange: (has: boolean) => void }) {
  const [status, setStatus] = useState<Status>(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review' | 'saving'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<PageRecorder | null>(null);
  const timer = useRef<number | null>(null);
  const report = useRef(onChange);

  useEffect(() => {
    report.current = onChange;
  }, [onChange]);
  useEffect(() => {
    let live = true;
    void fetchVoiceSample().then((s) => {
      if (!live) return;
      setStatus(s);
      if (s) report.current(s.has);
    });
    return () => {
      live = false;
      rec.current?.cancel();
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);
  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url); }, [take]);

  if (!status || !recordingAvailable()) return null;

  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };
  async function start() {
    setError(null);
    rec.current = new PageRecorder();
    try {
      await rec.current.start();
    } catch (e) {
      rec.current = null;
      return setError(e === 'denied' ? 'Allow the microphone to record your voice.' : 'Recording is not available here.');
    }
    setSeconds(0);
    setPhase('recording');
    const t0 = Date.now();
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setSeconds(s);
      if (s >= 40) void stop();
    }, 250);
  }
  async function stop() {
    stopTimer();
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    const blob = await r.stop();
    setTake({ blob, url: URL.createObjectURL(blob) });
    setPhase('review');
  }
  async function save() {
    if (!take) return;
    setPhase('saving');
    setError(null);
    try {
      const { wav, seconds: len } = await recordingToWav(take.blob);
      if (len < 10) {
        setPhase('review');
        return setError('Please read the whole text: at least 10 seconds.');
      }
      const r = await fetch('/api/voice-sample', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ audio: toBase64(wav), consentOn: new Date().toISOString().slice(0, 10) }),
      });
      if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? 'failed');
      setStatus({ ...status!, has: true });
      setTake(null);
      setPhase('idle');
      onChange(true);
    } catch (e) {
      setPhase('review');
      setError(e instanceof Error && e.message !== 'failed' ? e.message : 'Could not save the voice. Try again.');
    }
  }
  async function remove() {
    await fetch('/api/voice-sample', { method: 'DELETE', headers: headers() }).catch(() => {});
    setStatus({ ...status!, has: false });
    setConsent(false);
    onChange(false);
  }

  return (
    <div className="grid gap-3 rounded-card border border-line p-4">
      <p className="font-bold">My voice as the storyteller <span className="text-xs font-bold text-ink-soft">(beta)</span></p>
      {status.has ? (
        <>
          <p className="text-sm text-ink-soft">Your voice is saved. Pick &quot;My voice&quot; above to hear the story read in a voice like yours.</p>
          <Button variant="secondary" className="justify-self-start" onClick={remove}>Delete my voice</Button>
        </>
      ) : (
        <>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-6 w-6 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-sm text-ink-soft">
              I am an adult and this is my own voice. I agree that a short recording of my voice is stored by Big Day Stories and
              sent to our voice service (through OpenRouter) to read stories in a voice like mine. A voice is biometric data: it is
              never used for anything else, never used for training, and it is deleted when I tap &quot;Delete my voice&quot;,
              delete all data, or after 30 days.
            </span>
          </label>
          {consent && (
            <>
              <p className="text-sm font-bold">Read this aloud, calmly, in a quiet room (about 25 seconds):</p>
              <blockquote className="rounded-card bg-surface-2 p-3 text-base leading-relaxed">{status.transcript}</blockquote>
              <div className="flex flex-wrap items-center gap-2">
                {phase === 'recording' ? (
                  <Button onClick={stop} aria-pressed>Stop ({seconds} s)</Button>
                ) : (
                  <Button variant={take ? 'secondary' : 'primary'} onClick={start} disabled={phase === 'saving'}>
                    {take ? 'Record again' : 'Start recording'}
                  </Button>
                )}
                {take && phase !== 'recording' && (
                  <>
                    <audio controls src={take.url} className="max-w-full" />
                    <Button onClick={save} disabled={phase === 'saving'}>{phase === 'saving' ? 'Saving…' : 'Use this voice'}</Button>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
