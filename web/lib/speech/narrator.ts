'use client';
/**
 * Speech layer (docs/SPEC.md 11.6). Screens depend on the Narrator interface only, so a
 * premium voice (ElevenLabs, 17.1) is a new implementation, not a rewrite.
 * BrowserNarrator: speechSynthesis, one utterance per sentence (A5), highlight on utterance
 * start, started only by a tap, the parent's chosen voice or the best English one.
 */
import type { Narrator, SpeakOptions } from './types';
import { englishVoices, pickVoice } from './voices';

export type { Narrator, SpeakOptions };

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

let voices: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();
function loadVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  const next = s.getVoices();
  if (next.length !== voices.length) {
    voices = next;
    listeners.forEach((l) => l());
  }
  return voices;
}
if (typeof window !== 'undefined' && synth()) {
  synth()!.addEventListener?.('voiceschanged', () => loadVoices());
  loadVoices();
}

/** English voices of this browser, best first (Settings > Reading voice). Voices load late on some browsers. */
export function readingVoices(): SpeechSynthesisVoice[] {
  return englishVoices(loadVoices());
}
/** useSyncExternalStore subscription for the voice list. */
export function subscribeVoices(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export class BrowserNarrator implements Narrator {
  private token = 0;
  available(): boolean {
    return synth() !== null;
  }
  speak(sentences: string[], opts: SpeakOptions): void {
    const s = synth();
    if (!s) return opts.onEnd();
    const busy = s.speaking || s.pending;
    this.stop();
    const token = ++this.token;
    const voice = pickVoice(loadVoices(), opts.voiceURI);
    const queue = () => {
      if (token !== this.token) return;
      sentences.forEach((text, i) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = voice?.lang ?? 'en-US';
        if (voice) u.voice = voice;
        u.rate = opts.rate ?? 0.92;
        u.onstart = () => token === this.token && opts.onSentence(i);
        u.onboundary = (e) => {
          if (token === this.token && e.name === 'word') opts.onWord?.(i, e.charIndex);
        };
        if (i === sentences.length - 1) u.onend = () => token === this.token && opts.onEnd();
        u.onerror = (e) => {
          // 'interrupted' and 'canceled' come from our own stop(); anything else ends the reading.
          if (token !== this.token) return;
          if (i === sentences.length - 1 || !/interrupted|canceled/.test(e.error)) opts.onEnd();
        };
        s.speak(u);
      });
      // Safari and Chrome can stay paused after an earlier pause(); speaking again must be heard.
      if (s.paused) s.resume();
    };
    // Safari drops utterances queued in the same tick as cancel(). When nothing was speaking we
    // speak right away, inside the tap, which iOS needs to allow speech at all.
    if (busy) setTimeout(queue, 60);
    else queue();
  }
  pause(): void {
    synth()?.pause();
  }
  resume(): void {
    synth()?.resume();
  }
  stop(): void {
    this.token++;
    synth()?.cancel();
  }
}

export const narrator: Narrator = new BrowserNarrator();

/** Speaks one short text (the "Hear it" button for the name, the voice sample in Settings). */
export function speakOnce(text: string, opts: Pick<SpeakOptions, 'voiceURI' | 'rate'> = {}): void {
  narrator.speak([text], { ...opts, onSentence: () => {}, onEnd: () => {} });
}
