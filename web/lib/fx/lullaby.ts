'use client';
/**
 * Quiet music-box lullaby for cartoon mode, played by the Web Audio API: no audio files, no
 * licences. A slow pentatonic tune over a soft two-note pad, looped, at a low volume so the
 * storyteller stays clear. It ducks while the voice speaks and fades in and out.
 */

// C major pentatonic, two phrases of eight beats (semitones above C5; null = rest).
const TUNE: (number | null)[] = [
  4, 7, 9, 7, 4, 2, 0, null,
  2, 4, 7, 4, 2, 0, -3, null,
  4, 7, 9, 12, 9, 7, 4, null,
  2, 4, 2, 0, -3, 0, 0, null,
];
const PAD = [[-12, -5], [-15, -8], [-12, -5], [-17, -10]]; // C, A minor, C, G (one per phrase)
const BEAT = 0.62; // seconds
const C5 = 523.25;

const freq = (semi: number) => C5 * Math.pow(2, semi / 12);

export class Lullaby {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private next = 0;
  private step = 0;
  private level = 0.07;

  start(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
    } catch {
      return;
    }
    void this.ctx.resume?.().catch(() => {});
    this.master = this.ctx.createGain();
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.level, this.ctx.currentTime + 2);
    this.master.connect(this.ctx.destination);
    this.next = this.ctx.currentTime + 0.2;
    this.step = 0;
    // Schedule a little ahead so the tune never stutters when the page is busy.
    this.timer = window.setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  /** Softer while the storyteller speaks. */
  duck(on: boolean): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? this.level * 0.45 : this.level, t, 0.4);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const ctx = this.ctx;
    const master = this.master;
    this.ctx = null;
    this.master = null;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(0, t, 0.3);
    window.setTimeout(() => void ctx.close().catch(() => {}), 1500);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    while (this.next < ctx.currentTime + 1) {
      const i = this.step % TUNE.length;
      if (i % 8 === 0) for (const p of PAD[(i / 8) % PAD.length]) this.pad(ctx, master, freq(p), this.next, BEAT * 8);
      const n = TUNE[i];
      if (n !== null) this.bell(ctx, master, freq(n), this.next);
      this.next += BEAT;
      this.step++;
    }
  }

  /** One music-box note: a sine with a quiet overtone and a quick fade. */
  private bell(ctx: AudioContext, out: AudioNode, f: number, at: number): void {
    for (const [mult, vol] of [[1, 0.5], [3, 0.06]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + 1.7);
    }
  }

  /** A soft held note under the tune. */
  private pad(ctx: AudioContext, out: AudioNode, f: number, at: number, len: number): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.12, at + 1.2);
    g.gain.linearRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + len + 0.05);
  }
}
