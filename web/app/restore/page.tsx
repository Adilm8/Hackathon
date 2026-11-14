'use client';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppShell } from '@/components/ui/AppShell';
import { ScreenSkeleton } from '@/components/ui/Skeleton';
import { seedWorkspace } from '@/lib/store/seed';
import { switchWorkspace } from '@/lib/store/workspace';
import { api } from '@/lib/sync/api';

/** Opens a family on another device from its private link `/restore#<code>` (docs/SPEC.md 4.15, 6.3). */
export default function RestorePage() {
  const [state, setState] = useState<'working' | 'bad'>('working');
  useEffect(() => {
    const code = window.location.hash.slice(1);
    // The code is a secret: drop it from the address bar and history at once.
    history.replaceState(null, '', '/restore');
    if (code.length < 16) {
      queueMicrotask(() => setState('bad'));
      return;
    }
    void api.restoreFromCode(code).then((s) => {
      if (!s) return setState('bad');
      seedWorkspace('real', s.doc, s.entitlements, s.version);
      switchWorkspace('real', '/home');
    });
  }, []);
  return (
    <AppShell>
      {state === 'working' ? (
        <ScreenSkeleton />
      ) : (
        <EmptyState
          title="This link doesn't work any more"
          text="It may have been replaced by a newer link. Make a new one in Settings on the other device."
          action={<ButtonLink href="/?landing=1">Go to the start page</ButtonLink>}
        />
      )}
    </AppShell>
  );
}
