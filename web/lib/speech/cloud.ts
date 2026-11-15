'use client';
/**
 * Premium story voice in the browser (docs/voice-options.md): each sentence comes from /api/tts as
 * mp3 and plays in order, the next one fetched while the current one plays. One audio element is
 * unlocked inside the Listen tap, because iPhone Safari plays audio only from an element a tap started.
 * If the first sentence cannot be fetched the device voice reads instead, so Listen never goes silent.
 */
import { narrator as deviceNarrator } from './narrator';
import type { Narrator, SpeakOptions } from './types';

export type StoryVoice = { id: string; label: string };
let status: Promise<StoryVoice[]> | null = null;
/** Character voices the server offers; empty = the premium voice is off. Asked once per page load. */
export function premiumVoices(): Promise<StoryVoice[]> {
  status ??= fetch('/api/tts', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((j: { enabled?: boolean; voices?: StoryVoice[] }) => (j.enabled ? j.voices ?? [] : []))
    .catch(() => []);
  return status;
}
export const premiumVoiceEnabled = () => premiumVoices().then((v) => v.length > 0);

/** A WAV file of 0.1 s of silence; playing it inside the tap unlocks the element on iOS. */
export function silentWav(samples = 800): string {
  const bytes = new Uint8Array(44 + samples * 2);
  const v = new DataView(bytes.buffer);
  const tag = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  tag(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, samples * 2, true);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}
let silence: string | null = null;

const memo = new Map<string, Promise<string | null>>();
function audioUrl(text: string, voice?: string | null): Promise<string | null> {
  const key = `${voice ?? ''}\n${text}`;
  let p = memo.get(key);
  if (!p) {
    p = fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(voice ? { text, voice } : { text }) })
      .then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : null))
      .catch(() => null);
    p.then((u) => u === null && memo.delete(key));
    memo.set(key, p);
    if (memo.size > 200) memo.delete(memo.keys().next().value as string);
  }
  return p;
}

export class CloudNarrator implements Narrator {
  private el: HTMLAudioElement | null = null;
  private token = 0;
  private fallback = false;

  available(): boolean {
    return typeof Audio !== 'undefined';
  }

  speak(sentences: string[], opts: SpeakOptions): void {
    this.stop();
    const token = ++this.token;
    const el = (this.el ??= new Audio());
    el.src = silence ??= silentWav();
    void el.play().catch(() => {});
    const playAt = async (i: number): Promise<void> => {
      if (token !== this.token) return;
      if (i >= sentences.length) return opts.onEnd();
      const url = await audioUrl(sentences[i], opts.voiceURI);
      if (token !== this.token) return;
      if (!url) {
        if (i === 0) {
          // No premium audio: the device voice reads the whole page.
          this.fallback = true;
          return deviceNarrator.speak(sentences, opts);
        }
        return opts.onEnd();
      }
      if (i + 1 < sentences.length) void audioUrl(sentences[i + 1], opts.voiceURI);
      el.src = url;
      el.playbackRate = opts.rate ? opts.rate / 0.92 : 1; // 0.92 is "Normal" for the device voice
      el.onended = () => void playAt(i + 1);
      el.onerror = () => token === this.token && opts.onEnd();
      opts.onSentence(i);
      await el.play().catch(() => token === this.token && opts.onEnd());
    };
    void playAt(0);
  }
  pause(): void {
    if (this.fallback) return deviceNarrator.pause();
    this.el?.pause();
  }
  resume(): void {
    if (this.fallback) return deviceNarrator.resume();
    void this.el?.play();
  }
  stop(): void {
    this.token++;
    if (this.fallback) deviceNarrator.stop();
    this.fallback = false;
    if (this.el) {
      this.el.onended = this.el.onerror = null;
      this.el.pause();
    }
  }
}

export const cloudNarrator = new CloudNarrator();
