'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/icons';
import { Sheet } from '@/components/ui/Sheet';
import { GATE_HOLD_MS, gateNeeded, openGate } from '@/lib/reader/gate';
import { getWorkspace } from '@/lib/store/workspace';

/**
 * `guard(action)` runs the action at once when no gate is needed (sample workspace, or a grown-up
 * passed a few minutes ago); otherwise it opens a sheet where a grown-up holds a button for 1.5 s.
 */
export function useParentGate() {
  const [pending, setPending] = useState<(() => void) | null>(null);
  const guard = useCallback((action: () => void) => {
    if (!gateNeeded(getWorkspace())) return action();
    setPending(() => action);
  }, []);
  const gate = (
    <Sheet
      open={!!pending}
      onOpenChange={(v) => !v && setPending(null)}
      title="Grown-ups only"
      description="Hold the button to leave the story or open the parent tools."
    >
      <HoldButton
        onDone={() => {
          openGate();
          const run = pending;
          setPending(null);
          run?.();
        }}
      />
    </Sheet>
  );
  return { guard, gate };
}

function HoldButton({ onDone }: { onDone: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onDone();
    }, GATE_HOLD_MS);
  };
  useEffect(() => stop, []);
  const key = (e: KeyboardEvent, down: boolean) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (down) start();
    else stop();
  };
  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => key(e, true)}
      onKeyUp={(e) => key(e, false)}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex min-h-btn-l w-full select-none items-center justify-center gap-2 overflow-hidden rounded-pill border-2 border-primary bg-surface font-extrabold text-primary-text"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-primary/25 ease-linear"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${GATE_HOLD_MS}ms linear` : 'none' }}
      />
      <span className="relative inline-flex items-center gap-2">
        <Icon name="hand-heart" size={20} /> {holding ? 'Keep holding…' : 'Hold for a moment'}
      </span>
    </button>
  );
}
