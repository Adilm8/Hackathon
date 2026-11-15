'use client';
import { useEffect } from 'react';
import { usePrefs } from '@/lib/store/prefs';

/** Loads device preferences once and keeps <html data-font> in step with "Easy-read letters". */
export function PrefsSync() {
  const easyRead = usePrefs((s) => s.easyRead);
  useEffect(() => {
    void usePrefs.persist.rehydrate();
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (easyRead) root.dataset.font = 'easy';
    else delete root.dataset.font;
  }, [easyRead]);
  return null;
}
