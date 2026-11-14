/**
 * F18: the child's question by voice, only where recognition runs on the device (docs/SPEC.md 11.6).
 * Chrome's default SpeechRecognition sends audio to a server, so it is NOT used unless the browser
 * confirms on-device support (`processLocally`). No audio is stored or sent by us.
 */
import type { Listener } from './types';

interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = { new (): Recognition; available?(o: { langs: string[]; processLocally: boolean }): Promise<string> | string };

function ctor(): RecognitionCtor | null {
  const g = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

const LANG = 'en-US';

export class BrowserListener implements Listener {
  async available(): Promise<boolean> {
    const C = ctor();
    if (!C || typeof C.available !== 'function') return false; // cannot prove it stays on the device
    try {
      return (await C.available({ langs: [LANG], processLocally: true })) === 'available';
    } catch {
      return false;
    }
  }

  listenOnce(): Promise<string> {
    const C = ctor();
    if (!C) return Promise.reject(new Error('unsupported'));
    return new Promise((resolve, reject) => {
      const r = new C();
      r.lang = LANG;
      r.continuous = false;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.processLocally = true;
      let text = '';
      r.onresult = (e) => {
        text = Array.from(e.results).map((x) => x[0]?.transcript ?? '').join(' ').trim();
      };
      r.onerror = (e) => reject(new Error(e.error));
      r.onend = () => (text ? resolve(text) : reject(new Error('no_speech')));
      try {
        r.start();
      } catch (err) {
        reject(err);
      }
    });
  }
}
