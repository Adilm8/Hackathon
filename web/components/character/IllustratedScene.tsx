'use client';
import { useState } from 'react';
import { Scene, type SceneProps } from './backgrounds';

/**
 * A painted scene (lib/illustrations) over the drawn SVG scene. The SVG shows first and stays if the
 * picture is missing or fails to load, so the page never shows an empty box. At night the picture is
 * dimmed and cooled with a filter instead of a second set of pictures.
 */
export function IllustratedScene({ src, ...scene }: SceneProps & { src: string | null }) {
  const [state, setState] = useState<{ src: string | null; status: 'loading' | 'ready' | 'failed' }>({ src, status: 'loading' });
  // A new page brings a new picture: start over without an effect.
  const status = state.src === src ? state.status : 'loading';
  if (state.src !== src) setState({ src, status: 'loading' });
  return (
    <>
      {status !== 'ready' && <Scene {...scene} />}
      {src && status !== 'failed' && (
        // eslint-disable-next-line @next/next/no-img-element -- static webp, already sized
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          onLoad={() => setState({ src, status: 'ready' })}
          onError={() => setState({ src, status: 'failed' })}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-base ${status === 'ready' ? 'opacity-100' : 'opacity-0'} ${scene.night ? 'brightness-[.62] saturate-[.8] hue-rotate-[12deg]' : ''}`}
        />
      )}
    </>
  );
}
