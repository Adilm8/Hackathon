'use client';
/**
 * End-of-chapter and badge celebrations: a short confetti burst and a soft chime.
 * No library and no audio files: the confetti is a few CSS-animated dots, the chime is three
 * sine notes from the Web Audio API. Confetti is skipped when the system asks for reduced
 * motion; the chime only plays when "Sounds" is on.
 */
import { usePrefs } from '@/lib/store/prefs';

const COLORS = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--danger)'];

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function confetti(count = 60): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'confetti-layer';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-bit';
    const dx = (Math.random() - 0.5) * 2;
    p.style.setProperty('--x', `${Math.round(Math.random() * 100)}vw`);
    p.style.setProperty('--dx', `${Math.round(dx * 160)}px`);
    p.style.setProperty('--r', `${Math.round(Math.random() * 720 - 360)}deg`);
    p.style.setProperty('--d', `${(1.2 + Math.random() * 0.9).toFixed(2)}s`);
    p.style.setProperty('--delay', `${(Math.random() * 0.25).toFixed(2)}s`);
    p.style.background = COLORS[i % COLORS.length];
    if (i % 3 === 0) p.style.borderRadius = '999px';
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 2600);
}

let ctx: AudioContext | null = null;

/** Three soft rising notes (C, E, G), quiet enough for bedtime. */
export function chime(): void {
  if (typeof window === 'undefined' || !usePrefs.getState().sound) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    void ctx.resume?.();
    const t0 = ctx.currentTime + 0.02;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = t0 + i * 0.14;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.75);
    });
  } catch {
    /* no audio here: the confetti is enough */
  }
}

export function celebrate(): void {
  confetti();
  chime();
}

/** Celebrate once per key in this tab (a badge page reloaded does not celebrate again). */
export function celebrateOnce(key: string): void {
  try {
    const k = `bds:celebrated:${key}`;
    if (window.sessionStorage.getItem(k)) return;
    window.sessionStorage.setItem(k, '1');
  } catch {
    /* private mode: celebrate anyway */
  }
  celebrate();
}
