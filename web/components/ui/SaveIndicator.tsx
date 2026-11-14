'use client';
import { useEffect, useState } from 'react';
import { onSyncStatus, type SyncStatus } from '@/lib/sync';

/** "Saved" / "Saving…" / "Offline, saved on this device" in the header (docs/SPEC.md 6.2). */
export function SaveIndicator() {
  const [s, setS] = useState<SyncStatus>('idle');
  useEffect(() => onSyncStatus(setS), []);
  const text = s === 'saving' ? 'Saving…' : s === 'offline' ? 'Offline, saved on this device' : s === 'saved' ? 'Saved' : '';
  if (!text) return null;
  return (
    <span aria-live="polite" className="hidden text-xs font-bold text-ink-soft sm:inline">
      {text}
    </span>
  );
}
