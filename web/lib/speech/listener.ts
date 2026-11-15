/**
 * F18: a grown-up asks the child's question by voice (docs/SPEC.md 11.6).
 *
 * Two modes, both behind the parent's consent in Settings:
 * - 'device': recognition that the browser confirms runs on the device (`processLocally`, recent
 *   Chrome). If the language pack is only downloadable, the parent can install it first.
 * - 'browser': the browser's own speech service (Safari on iPhone and Mac: Apple; Chrome: Google;
 *   Edge: Microsoft). The audio goes to that company, not to us; the consent text says so.
 *   Chosen by Lida on 15 Nov 2026 so voice questions work on iPhone without a paid service.
 * We never record, store or send the audio ourselves. The words go into the question field for
 * the grown-up to check before anything is sent.
 */
import type { Listener } from './types';

interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((e: { resultIndex?: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable';
type Opts = { langs: string[]; processLocally: boolean };
type RecognitionCtor = {
  new (): Recognition;
  available?(o: Opts): Promise<Availability | string> | string;
  install?(o: Opts): Promise<boolean> | boolean;
};

export type ListenMode = 'device' | 'browser';
export type ListenError = 'denied' | 'unheard' | 'unavailable' | 'dictation_off';

function ctor(): RecognitionCtor | null {
  const g = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

const LANG = 'en-US';
const LOCAL: Opts = { langs: [LANG], processLocally: true };

/** Whether the browser has speech recognition at all. Safe on render: only checks the API exists. */
export function hasRecognition(): boolean {
  try {
    return !!ctor();
  } catch {
    return false;
  }
}

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

/** Maps a recognition error code to what the screen says. */
export function classifyError(code: string): ListenError {
  if (code === 'not-allowed') return 'denied';
  // Safari says this when Siri and Dictation are switched off in the iPhone settings.
  if (code === 'service-not-allowed') return 'dictation_off';
  if (code === 'no-speech' || code === 'aborted' || code === 'no_speech' || code === 'audio-capture') return 'unheard';
  return 'unavailable';
}

/** Which company's speech service hears the audio in 'browser' mode, for the consent text. */
export function speechVendor(ua: string): 'Apple' | 'Google' | 'Microsoft' | 'your browser maker' {
  if (/Edg\//.test(ua)) return 'Microsoft';
  if (/CriOS|Chrome\//.test(ua) && !/iPhone|iPad|iPod/.test(ua)) return 'Google';
  if (/iPhone|iPad|iPod|Macintosh/.test(ua) && /Safari|AppleWebKit/.test(ua)) return 'Apple';
  return 'your browser maker';
}

/** Joins recognition results into one line of text. */
export function joinResults(results: ArrayLike<ArrayLike<{ transcript: string }>>): string {
  return Array.from(results).map((x) => x[0]?.transcript ?? '').join(' ').replace(/\s+/g, ' ').trim();
}

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([p, late]);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** On-device support, asked from the browser. Call it only after a tap; gives up after `timeoutMs`. */
export async function deviceStatus(timeoutMs = 3000): Promise<Availability> {
  if (!mayListenOnDevice()) return 'unavailable';
  const C = ctor() as RecognitionCtor;
  const v = await withTimeout(Promise.resolve(C.available!(LOCAL)), timeoutMs, 'unavailable' as string);
  return (['available', 'downloadable', 'downloading'].includes(v) ? v : 'unavailable') as Availability;
}

/** Downloads the on-device English speech pack where the browser offers it (Chrome). */
export async function installDeviceSpeech(timeoutMs = 120_000): Promise<boolean> {
  const C = ctor();
  if (!C || typeof C.install !== 'function') return false;
  return withTimeout(Promise.resolve(C.install(LOCAL)).then(Boolean), timeoutMs, false);
}

export class BrowserListener implements Listener {
  private rec: Recognition | null = null;
  constructor(private readonly mode: ListenMode = 'device') {}

  async available(timeoutMs = 3000): Promise<boolean> {
    if (this.mode === 'browser') return hasRecognition();
    return (await deviceStatus(timeoutMs)) === 'available';
  }

  /** Rejects with a ListenError string. Stops on its own after a pause in speech or after `maxMs`. */
  listenOnce({ onInterim, maxMs = 10_000 }: { onInterim?(text: string): void; maxMs?: number } = {}): Promise<string> {
    const C = ctor();
    if (!C) return Promise.reject('unavailable' satisfies ListenError);
    return new Promise((resolve, reject) => {
      const r = (this.rec = new C());
      r.lang = LANG;
      r.continuous = false;
      r.interimResults = !!onInterim;
      r.maxAlternatives = 1;
      if (this.mode === 'device') r.processLocally = true;
      let text = '';
      let failed: ListenError | null = null;
      const cap = setTimeout(() => this.stop(), maxMs);
      r.onresult = (e) => {
        text = joinResults(e.results);
        onInterim?.(text);
      };
      r.onerror = (e) => {
        failed = classifyError(e.error);
      };
      r.onend = () => {
        clearTimeout(cap);
        this.rec = null;
        if (text) resolve(text);
        else reject(failed ?? ('unheard' satisfies ListenError));
      };
      try {
        r.start();
      } catch {
        clearTimeout(cap);
        this.rec = null;
        reject('unavailable' satisfies ListenError);
      }
    });
  }

  stop(): void {
    try {
      this.rec?.stop();
    } catch {
      /* already ended */
    }
  }
}
