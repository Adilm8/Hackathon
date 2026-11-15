'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Full-screen reading: the child sees only the story. It hides the app header and the Demo bar
 * (html[data-immersive], app/globals.css) and asks the browser for real full screen where the
 * Fullscreen API exists. iPhone Safari has no Fullscreen API for pages, so there the reader
 * fills the whole viewport without the app's chrome (and fully, when the app is added to the
 * Home Screen). Leaving the browser's full screen (Esc, a swipe) leaves this mode too.
 */
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: (o?: FullscreenOptions) => Promise<void> | void };

const fsElement = () => {
  const d = document as FsDoc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
};

/** True when the browser can put the page into real full screen (not iPhone Safari). */
export function canFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as FsEl;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen) && document.fullscreenEnabled !== false;
}

function quiet(p: unknown) {
  if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
}

export function useImmersive() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.dataset.immersive = '1';
    else delete root.dataset.immersive;
  }, [on]);

  useEffect(() => {
    const sync = () => {
      if (!fsElement()) setOn(false);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      // Leaving the reader always gives the app its header back.
      delete document.documentElement.dataset.immersive;
      if (fsElement()) exitNative();
    };
  }, []);

  const enter = useCallback(() => {
    setOn(true);
    if (!canFullscreen() || fsElement()) return;
    const el = document.documentElement as FsEl;
    try {
      quiet(el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.());
    } catch {
      /* the fallback (no app chrome) still applies */
    }
  }, []);

  const exit = useCallback(() => {
    setOn(false);
    if (fsElement()) exitNative();
  }, []);

  return { on, enter, exit, toggle: on ? exit : enter };
}

function exitNative() {
  const d = document as FsDoc;
  try {
    quiet(d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
  } catch {
    /* ignore */
  }
}
