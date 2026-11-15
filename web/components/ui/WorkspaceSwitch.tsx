'use client';
import { useState } from 'react';
import type { Workspace } from '@/lib/engine/types';
import { enterSample, exitSample } from '@/lib/store/sample';

/**
 * "My app | Demo" switch in the header of every screen (docs/SPEC.md 4.3). One tap moves between
 * the parent's own family and the sample family; each side opens on the screen it was left on,
 * and neither side's data is touched. Below 400 px only the way out is shown, as one chip.
 */
export function WorkspaceSwitch({ workspace, locked = false }: { workspace: Workspace; locked?: boolean }) {
  const [busy, setBusy] = useState(false);
  const sample = workspace === 'sample';

  // The reader is the child's screen: the demo is only labelled there, leaving goes through the parent gate.
  if (locked) {
    return sample ? (
      <span className="whitespace-nowrap rounded-pill bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">Demo</span>
    ) : null;
  }

  const go = async (to: Workspace) => {
    if (to === workspace || busy) return;
    setBusy(true);
    if (to === 'sample') await enterSample();
    else exitSample();
  };

  const seg = (on: boolean, accent: boolean) =>
    `inline-flex min-h-9 items-center whitespace-nowrap rounded-pill px-2.5 text-xs font-extrabold transition-colors ${
      on ? (accent ? 'bg-accent text-accent-ink' : 'bg-surface text-ink shadow-sm') : 'text-ink-soft hover:text-ink'
    }`;

  return (
    <>
      {/* Phones: one chip that says where it leads. */}
      <button
        type="button"
        disabled={busy}
        onClick={() => go(sample ? 'real' : 'sample')}
        aria-label={sample ? 'You are in the demo. Back to my app' : 'Open the demo with sample data'}
        className="inline-flex min-h-tap items-center min-[400px]:hidden"
      >
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-pill px-2 py-0.5 text-xs font-bold ${
            sample ? 'bg-accent text-accent-ink' : 'border border-line text-ink-soft'
          }`}
        >
          {busy ? '…' : sample ? 'Demo · Exit' : 'Demo'}
        </span>
      </button>
      {/* Wider screens: both sides visible, the active one filled. */}
      <div
        role="group"
        aria-label="Switch between your app and the demo"
        className="hidden items-center gap-0.5 rounded-pill border border-line bg-surface-2 p-0.5 min-[400px]:inline-flex"
      >
        <button type="button" aria-pressed={!sample} disabled={busy} onClick={() => go('real')} className={seg(!sample, false)}>
          My app
        </button>
        <button type="button" aria-pressed={sample} disabled={busy} onClick={() => go('sample')} className={seg(sample, true)}>
          {busy && !sample ? 'Opening…' : 'Demo'}
        </button>
      </div>
    </>
  );
}
