'use client';
import { useEffect, useRef, useState } from 'react';

const BARS = 5;

/**
 * Live microphone meter while recording: a red "REC" dot, a timer and bars that move with the
 * voice, so the grown-up sees the sound is coming in. Says so when nothing is heard for a while.
 */
export function MicLevel({ level, elapsed, className = '' }: { level: () => number; elapsed?: () => number; className?: string }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const [quiet, setQuiet] = useState(false);
  const [secs, setSecs] = useState(0);
  const src = useRef({ level, elapsed });
  useEffect(() => {
    src.current = { level, elapsed };
  }, [level, elapsed]);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    let lastLoud = performance.now();
    let lastSec = -1;
    const tick = () => {
      const v = src.current.level();
      smooth = Math.max(v, smooth * 0.85);
      const now = performance.now();
      if (v > 0.12) lastLoud = now;
      setQuiet(now - lastLoud > 4000);
      bars.current.forEach((b, i) => {
        if (!b) return;
        const need = (i + 1) / (BARS + 1);
        const h = Math.max(0.18, Math.min(1, smooth * 1.4 - need * 0.4 + 0.15));
        b.style.transform = `scaleY(${h})`;
        b.style.opacity = smooth >= need * 0.7 ? '1' : '0.35';
      });
      const s = Math.floor(src.current.elapsed?.() ?? 0);
      if (s !== lastSec) setSecs((lastSec = s));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-danger" />
      <span className="text-xs font-extrabold text-danger">REC {elapsed ? mm : ''}</span>
      <span aria-hidden className="flex h-4 items-end gap-0.5" data-mic-level>
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} ref={(el) => { bars.current[i] = el; }} className="h-full w-1 origin-bottom rounded-full bg-danger transition-transform duration-75" style={{ transform: 'scaleY(0.18)' }} />
        ))}
      </span>
      <span className="sr-only">Recording. </span>
      {quiet && <span className="text-xs font-bold text-ink-soft">No sound yet: check the microphone</span>}
    </span>
  );
}
