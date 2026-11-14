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

/**
 * Whether the browser could offer on-device recognition at all, WITHOUT asking it. Safe on render:
 * only checks that the API exists. Calling `available()` is left to a tap, because in some
 * Chromium builds the on-device check itself crashes the tab (usability pass, Chromium 153).
 */
export function mayListenOnDevice(): boolean {
  try {
    const C = ctor();
    return !!C && typeof C.available === 'function';
  } catch {
    return false;
  }
}

export class BrowserListener implements Listener {
  /** Asks the browser for on-device support. Call it only after a tap; it gives up after `timeoutMs`. */
  async available(timeoutMs = 3000): Promise<boolean> {
    if (!mayListenOnDevice()) return false; // cannot prove it stays on the device
    const C = ctor() as RecognitionCtor;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const check = Promise.resolve(C.available!({ langs: [LANG], processLocally: true })).then((v) => v === 'available');
      const late = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      });
      return await Promise.race([check, late]);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
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
