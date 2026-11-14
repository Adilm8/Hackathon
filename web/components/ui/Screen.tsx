'use client';
import { useEffect, type ReactNode } from 'react';
import { bootApp } from '@/lib/store/boot';
import { useChild } from '@/lib/store/child';
import { useHydrated } from '@/lib/store/hydration';
import { exitSample } from '@/lib/store/sample';
import { getWorkspace } from '@/lib/store/workspace';
import { DemoAccessBadge, DemoBar } from '@/components/eventday/DemoBar';
import { AppShell } from './AppShell';
import { SaveIndicator } from './SaveIndicator';
import { ScreenSkeleton } from './Skeleton';
import { Toaster } from './Toast';

/**
 * Client frame of every family screen: starts the stores and sync, waits for hydration
 * (skeleton until then, docs/SPEC.md 6.2) and fills the AppShell header from the stores.
 */
export function Screen({
  children, room = 'child', bottomBar, wide = false,
}: {
  children: ReactNode | (() => ReactNode);
  room?: 'child' | 'parent';
  bottomBar?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => bootApp(), []);
  const ready = useHydrated();
  const child = useChild((s) => s.child);
  const ws = ready ? getWorkspace() : 'real';
  return (
    <AppShell
      room={room}
      childName={ready ? child?.name : undefined}
      isSample={ready && ws === 'sample'}
      headerExtra={ready ? <DemoAccessBadge workspace={ws} /> : null}
      saveIndicator={ready ? <SaveIndicator /> : null}
      bottomBar={
        ready ? (
          <>
            {bottomBar}
            {/* Jury demo mode (SPEC 5.1): sample workspace, or ?demo=1 for the time group only. */}
            <DemoBar workspace={ws} />
          </>
        ) : null
      }
      wide={wide}
      onExitSample={exitSample}
    >
      {ready ? (typeof children === 'function' ? children() : children) : <ScreenSkeleton />}
      <Toaster />
    </AppShell>
  );
}
