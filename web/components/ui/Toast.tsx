'use client';
import { create } from 'zustand';
import { useEffect } from 'react';

/** Small polite toast (aria-live). */
const useToast = create<{ text: string | null; show(t: string): void; hide(): void }>((set) => ({
  text: null,
  show: (text) => set({ text }),
  hide: () => set({ text: null }),
}));

export const toast = (t: string) => useToast.getState().show(t);

export function Toaster() {
  const { text, hide } = useToast();
  useEffect(() => {
    if (!text) return;
    const h = setTimeout(hide, 3200);
    return () => clearTimeout(h);
  }, [text, hide]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      {text && <div className="rounded-pill bg-ink px-5 py-3 text-sm font-bold text-bg shadow-pop">{text}</div>}
    </div>
  );
}
