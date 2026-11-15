'use client';
import { useState } from 'react';

/**
 * The scene picture with a fallback chain (docs/reliability.md): if the file fails to load
 * (missing night variant, offline before it was cached, a generated picture gone), try the
 * next source; when none loads, the image hides and the page's own colour shows through.
 */
export function SceneImage({ sources, alt, className }: { sources: string[]; alt: string; className: string }) {
  const [i, setI] = useState(0);
  if (i >= sources.length) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing to optimise
    <img key={sources[i]} src={sources[i]} alt={alt} className={className} draggable={false} onError={() => setI((n) => n + 1)} />
  );
}
