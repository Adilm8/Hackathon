'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PageRecorder, recordingAvailable } from '@/lib/speech/recorder';
import { recordingToWav, toBase64 } from '@/lib/speech/wav';
import { getWorkspace } from '@/lib/store/workspace';
import { MicLevel } from '@/components/reader/MicLevel';

/**
 * "Family voices as the storyteller" (demo, Lida 15 Nov 2026). Each adult reads a short text once;
 * the story can then be read in a voice like theirs. Several voices per family (Mom, Dad, Grandma…).
 * A voice is biometric data: explicit consent for each, delete at any time, removed after 30 days at the latest.
 */
export type FamilyVoice = { id: string; name: string };
type Status = { voices: FamilyVoice[]; max: number; transcript: string } | null;
/** The voice id the TTS route takes for a saved family voice. */
export const familyVoiceId = (v: FamilyVoice) => `parent:${v.id}`;

const headers = () => ({ 'content-type': 'application/json', 'x-bds-workspace': getWorkspace() });

export async function fetchVoiceSample(): Promise<Status> {
  try {
    const r = await fetch('/api/voice-sample', { headers: headers(), cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { enabled: boolean; voices?: FamilyVoice[]; max?: number; transcript: string };
    return j.enabled ? { voices: (j.voices ?? []).map(({ id, name }) => ({ id, name })), max: j.max ?? 1, transcript: j.transcript } : null;
  } catch {
    return null;
  }
}

export function ParentVoiceClone({ onChange }: { onChange: (voices: FamilyVoice[], added?: FamilyVoice) => void }) {
  const [status, setStatus] = useState<Status>(null);
  const [consent, setConsent] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
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
      if (s) report.current(s.voices);
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
        body: JSON.stringify({ audio: toBase64(wav), consentOn: new Date().toISOString().slice(0, 10), name: name.trim() || undefined }),
      });
      const j = (await r.json().catch(() => null)) as { voice?: FamilyVoice; error?: { message?: string } } | null;
      if (!r.ok || !j?.voice) throw new Error(j?.error?.message ?? 'failed');
      const added = { id: j.voice.id, name: j.voice.name };
      const voices = [...status!.voices, added];
      setStatus({ ...status!, voices });
      setTake(null);
      setPhase('idle');
      setAdding(false);
      setConsent(false);
      setName('');
      onChange(voices, added);
    } catch (e) {
      setPhase('review');
      setError(e instanceof Error && e.message !== 'failed' ? e.message : 'Could not save the voice. Try again.');
    }
  }
  async function remove(id: string) {
    await fetch(`/api/voice-sample?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() }).catch(() => {});
    const voices = status!.voices.filter((v) => v.id !== id);
    setStatus({ ...status!, voices });
    onChange(voices);
  }
  const showForm = status.voices.length === 0 || adding;

  return (
    <div className="grid gap-3 rounded-card border border-line p-4">
      <p className="font-bold">Family voices as the storyteller <span className="text-xs font-bold text-ink-soft">(beta)</span></p>
      {status.voices.length > 0 && (
        <>
          <p className="text-sm text-ink-soft">Pick a family voice above to hear the story read in a voice like theirs.</p>
          <ul className="grid gap-2">
            {status.voices.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface-2 px-3 py-2">
                <span className="font-bold">{v.name}</span>
                <Button variant="ghost" onClick={() => remove(v.id)} aria-label={`Delete the voice ${v.name}`}>Delete voice</Button>
              </li>
            ))}
          </ul>
          {!adding && status.voices.length < status.max && (
            <Button variant="secondary" className="justify-self-start" onClick={() => setAdding(true)}>Add another voice</Button>
          )}
          {status.voices.length >= status.max && <p className="text-xs text-ink-soft">Up to {status.max} voices. Delete one to add another.</p>}
        </>
      )}
      {showForm && (
        <>
          <label className="grid gap-1 text-sm font-bold">
            Whose voice is it?
            <input
              className="min-h-tap rounded-card border border-line bg-surface px-3 text-base font-normal"
              value={name} maxLength={24} placeholder="Mom, Dad, Grandma…" onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-6 w-6 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-sm text-ink-soft">
              The person recording is an adult, it is their own voice and they agree: a short recording of their voice is stored by
              Big Day Stories and sent to our voice service (through OpenRouter) to read stories in a voice like theirs. A voice is
              biometric data: it is never used for anything else, never used for training, and it is deleted when you tap
              &quot;Delete voice&quot;, delete all data, or after 30 days.
            </span>
          </label>
          {consent && (
            <>
              <p className="text-sm font-bold">Read this aloud, calmly, in a quiet room (about 25 seconds):</p>
              <blockquote className="rounded-card bg-surface-2 p-3 text-base leading-relaxed">{status.transcript}</blockquote>
              <div className="flex flex-wrap items-center gap-2">
                {phase === 'recording' ? (
                  <>
                    <Button onClick={stop} aria-pressed>Stop ({seconds} s)</Button>
                    <MicLevel level={() => rec.current?.level() ?? 0} />
                  </>
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
          {adding && phase === 'idle' && !take && (
            <Button variant="ghost" className="justify-self-start" onClick={() => { setAdding(false); setConsent(false); }}>Cancel</Button>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
