'use client';
/**
 * Speech layer (docs/SPEC.md 11.6). Screens depend on the Narrator interface only, so a
 * premium voice (ElevenLabs, 17.1) is a new implementation, not a rewrite.
 * BrowserNarrator: speechSynthesis, one utterance per sentence (A5), highlight on utterance
 * start, started only by a tap, best available en-US voice.
 */
import type { Narrator } from './types';

export type { Narrator };

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

let chosen: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  if (chosen) return chosen;
  const voices = s.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('en-us'));
  const score = (v: SpeechSynthesisVoice) =>
    (/(natural|neural|premium|enhanced)/i.test(v.name) ? 4 : 0) + (/(samantha|ava|allison|google us)/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  chosen = voices.sort((a, b) => score(b) - score(a))[0] ?? null;
  return chosen;
}
if (typeof window !== 'undefined' && synth()) {
  synth()!.addEventListener?.('voiceschanged', () => {
    chosen = null;
    pickVoice();
  });
}

export class BrowserNarrator implements Narrator {
  private token = 0;
  available(): boolean {
    return synth() !== null;
  }
  speak(sentences: string[], opts: { onSentence(i: number): void; onEnd(): void; rate?: number }): void {
    const s = synth();
    if (!s) return opts.onEnd();
    this.stop();
    const token = ++this.token;
    const voice = pickVoice();
    sentences.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      u.rate = opts.rate ?? 0.92;
      u.onstart = () => token === this.token && opts.onSentence(i);
      if (i === sentences.length - 1) u.onend = () => token === this.token && opts.onEnd();
      u.onerror = () => {
        if (token === this.token && i === sentences.length - 1) opts.onEnd();
      };
      s.speak(u);
    });
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

/** Speaks one short text (the "Hear it" button for the name). */
export function speakOnce(text: string): void {
  narrator.speak([text], { onSentence: () => {}, onEnd: () => {} });
}
