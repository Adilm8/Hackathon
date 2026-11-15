'use client';
import { useEffect, type ReactNode } from 'react';
import { bootApp } from '@/lib/store/boot';
import { useChild } from '@/lib/store/child';
import { useHydrated } from '@/lib/store/hydration';
import { exitSample } from '@/lib/store/sample';
import { getWorkspace, workspaceHasData } from '@/lib/store/workspace';
import { DemoAccessBadge, DemoBar } from '@/components/eventday/DemoBar';
import { AppShell } from './AppShell';
import { HeaderCreateStory } from './CreateStoryButton';
import { SaveIndicator } from './SaveIndicator';
import { ScreenSkeleton } from './Skeleton';
import { Toaster } from './Toast';
import { WorkspaceSwitch } from './WorkspaceSwitch';

/**
 * Client frame of every family screen: starts the stores and sync, waits for hydration
 * (skeleton until then, docs/SPEC.md 6.2) and fills the AppShell header from the stores.
 */
export function Screen({
  children, room = 'child', bottomBar, wide = false, fit = false, childMode = false,
}: {
  children: ReactNode | (() => ReactNode);
  room?: 'child' | 'parent';
  bottomBar?: ReactNode;
  wide?: boolean;
  /** One screen without page scroll (see AppShell). */
  fit?: boolean;
  /** The reader: header without settings or links out (see AppShell). */
  childMode?: boolean;
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
      headerExtra={ready ? (
        <>
          <DemoAccessBadge workspace={ws} />
          {!childMode && <HeaderCreateStory workspace={ws} />}
        </>
      ) : null}
      saveIndicator={ready ? <SaveIndicator /> : null}
      bottomBar={
        ready ? (
          <>
            {/* Jury demo mode (SPEC 5.1): sample workspace, or ?demo=1 for the time group only. */}
            {bottomBar ? (
              // One sticky stack, so a screen's own bar (home tab bar) sits under the Demo bar instead of behind it.
              <div className="sticky bottom-0 z-30">
                <DemoBar workspace={ws} />
                {bottomBar}
              </div>
            ) : (
              <DemoBar workspace={ws} />
            )}
          </>
        ) : null
      }
      wide={wide}
      fit={fit}
      childMode={childMode}
      homeHref={ready && workspaceHasData(ws) ? '/home' : '/?landing=1'}
      onExitSample={exitSample}
      workspaceSwitch={ready ? <WorkspaceSwitch workspace={ws} locked={childMode} /> : undefined}
    >
      {ready ? (typeof children === 'function' ? children() : children) : <ScreenSkeleton />}
      <Toaster />
    </AppShell>
  );
}
