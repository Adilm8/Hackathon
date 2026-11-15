'use client';
/**
 * Premium story voice in the browser (docs/voice-options.md): each sentence comes from /api/tts as
 * mp3 and plays in order, the next one fetched while the current one plays. One audio element is
 * unlocked inside the Listen tap, because iPhone Safari plays audio only from an element a tap started.
 * If the first sentence cannot be fetched the device voice reads instead, so Listen never goes silent.
 */
import { getWorkspace } from '../store/workspace';
import { narrator as deviceNarrator } from './narrator';
import type { Narrator, SpeakOptions } from './types';

/** `gold`: a Gold-only voice (Moon Storyteller, SPEC 10.1). */
export type StoryVoice = { id: string; label: string; gold?: boolean };
let status: Promise<StoryVoice[]> | null = null;
let known: boolean | null = null;
/** Character voices the server offers; empty = the premium voice is off. Asked once per page load. */
export function premiumVoices(): Promise<StoryVoice[]> {
  status ??= fetch('/api/tts', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .then((j: { enabled?: boolean; voices?: StoryVoice[] }) => (j.enabled ? j.voices ?? [] : []))
    .catch(() => []);
  void status.then((v) => (known = v.length > 0));
  return status;
}
/** Whether the premium voice is on, once the server has said so; null before (no wait in a tap). */
export const premiumVoiceKnown = (): boolean | null => known;
export const premiumVoiceEnabled = () => premiumVoices().then((v) => v.length > 0);

/** The voice id to send: a Gold voice or a family voice without Gold becomes the default storyteller. */
export function allowedVoice(id: string | null | undefined, voices: StoryVoice[], gold: { premium: boolean; clone: boolean }): string | null {
  if (!id) return null;
  if (id.startsWith('parent')) return gold.clone ? id : null;
  const v = voices.find((x) => x.id === id);
  return v?.gold && !gold.premium ? null : id;
}

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
    p = fetch('/api/tts', {
      method: 'POST',
      // The server picks the family (own or sample) by this header, like every other API call.
      headers: { 'Content-Type': 'application/json', 'x-bds-workspace': getWorkspace() }, body: JSON.stringify(voice ? { text, voice } : { text }) })
      .then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : null))
      .catch(() => null);
    p.then((u) => u === null && memo.delete(key));
    memo.set(key, p);
    if (memo.size > 200) memo.delete(memo.keys().next().value as string);
  }
  return p;
}

/** Loads sentences ahead (the next page while Auto turns pages), so the voice goes on without a gap. */
export function prefetchSpeech(texts: string[], voice?: string | null): void {
  if (known !== true) return;
  for (const t of texts.slice(0, 2)) if (t.trim()) void audioUrl(t, voice);
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
    // No premium audio for sentence i (network, budget, provider): the device voice reads the rest
    // of the page, so Listen never goes silent halfway (docs/reliability.md).
    const toDevice = (i: number): void => {
      if (token !== this.token) return;
      if (!deviceNarrator.available()) return opts.onEnd();
      this.fallback = true;
      deviceNarrator.speak(sentences.slice(i), {
        ...opts,
        onSentence: (k) => opts.onSentence(i + k),
        ...(opts.onWord ? { onWord: (k: number, c: number) => opts.onWord!(i + k, c) } : {}),
      });
    };
    const playAt = async (i: number): Promise<void> => {
      if (token !== this.token) return;
      if (i >= sentences.length) return opts.onEnd();
      const url = await audioUrl(sentences[i], opts.voiceURI);
      if (token !== this.token) return;
      if (!url) return toDevice(i);
      // The next two sentences load while this one plays, so there is no gap between them.
      for (const k of [i + 1, i + 2]) if (k < sentences.length) void audioUrl(sentences[k], opts.voiceURI);
      el.src = url;
      el.playbackRate = opts.rate ? opts.rate / 0.92 : 1; // 0.92 is "Normal" for the device voice
      el.onended = () => void playAt(i + 1);
      el.onerror = () => toDevice(i);
      opts.onSentence(i);
      if (i === 0) this.mediaSession();
      await el.play().catch(() => toDevice(i));
    };
    void playAt(0);
  }
  /** Lock-screen and headphone controls (Media Session API) while the story voice plays. */
  private mediaSession(): void {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms || typeof MediaMetadata === 'undefined') return;
    try {
      ms.metadata = new MediaMetadata({ title: 'Bedtime story', artist: 'Big Day Stories', artwork: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] });
      ms.setActionHandler('play', () => this.resume());
      ms.setActionHandler('pause', () => this.pause());
    } catch {
      /* not supported here */
    }
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
