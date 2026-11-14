/**
 * F17: the parent's voice. `PageRecorder` records one take with MediaRecorder; `RecordedNarrator`
 * plays a stored take. Browser APIs only, nothing is uploaded (docs/SPEC.md 11.6).
 */
import { getRecording } from './recordings';
import type { Narrator } from './types';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];

export function pickMimeType(isSupported: (t: string) => boolean): string | undefined {
  return MIME_CANDIDATES.find(isSupported);
}

export function recordingAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export type RecorderError = 'unsupported' | 'denied' | 'failed';

export class PageRecorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  /** Starts a take. Rejects with a RecorderError string. */
  async start(): Promise<void> {
    if (!recordingAvailable()) throw 'unsupported' satisfies RecorderError;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      throw 'denied' satisfies RecorderError;
    }
    try {
      const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
      this.chunks = [];
      this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      this.rec.ondataavailable = (e) => e.data.size > 0 && this.chunks.push(e.data);
      this.rec.start();
    } catch {
      this.release();
      throw 'failed' satisfies RecorderError;
    }
  }

  /** Stops and returns the take; the microphone is released. */
  stop(): Promise<Blob> {
    const rec = this.rec;
    if (!rec) return Promise.reject('failed' satisfies RecorderError);
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
        this.release();
        resolve(blob);
      };
      if (rec.state === 'inactive') rec.onstop?.(new Event('stop'));
      else rec.stop();
    });
  }

  cancel(): void {
    try {
      if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    } catch {
      /* already stopped */
    }
    this.release();
  }

  private release(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
    this.chunks = [];
  }
}

/**
 * Plays the parent's recording of one page. The take is one file per page, so `onSentence(0)`
 * fires at the start (no per-sentence highlight) and `onEnd` at the end.
 */
export class RecordedNarrator implements Narrator {
  private audio: HTMLAudioElement | null = null;
  private url: string | null = null;
  private token = 0;

  constructor(private readonly key: string) {}

  available(): boolean {
    return typeof Audio !== 'undefined';
  }

  speak(_sentences: string[], opts: { onSentence(i: number): void; onEnd(): void; rate?: number }): void {
    this.stop();
    const token = ++this.token;
    void getRecording(this.key).then((blob) => {
      if (token !== this.token) return;
      if (!blob) return opts.onEnd();
      this.url = URL.createObjectURL(blob);
      const a = (this.audio = new Audio(this.url));
      if (opts.rate) a.playbackRate = opts.rate;
      a.onended = a.onerror = () => {
        if (token !== this.token) return;
        this.cleanup();
        opts.onEnd();
      };
      opts.onSentence(0);
      void a.play().catch(() => {
        this.cleanup();
        opts.onEnd();
      });
    });
  }
  pause(): void { this.audio?.pause(); }
  resume(): void { void this.audio?.play(); }
  stop(): void {
    this.token++;
    this.audio?.pause();
    this.cleanup();
  }
  private cleanup(): void {
    this.audio = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}
