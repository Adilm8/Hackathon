'use client';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '@/components/icons';

/** The reader's keys, shown in the help card (? key or the keyboard button). */
export const READER_KEYS: { keys: string[]; what: string }[] = [
  { keys: ['→', 'Space'], what: 'Next sentence' },
  { keys: ['←'], what: 'Previous sentence' },
  { keys: ['L'], what: 'Listen / stop reading aloud' },
  { keys: ['F'], what: 'Full screen on / off' },
  { keys: ['Esc'], what: 'Leave full screen' },
  { keys: ['?'], what: 'Show these keys' },
];

/** Text fields and other controls that use the keys themselves. */
function typing(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

/**
 * Keyboard control of the reader. Keys are ignored while the child or parent types, while a
 * dialog (parent lock, panel drawer, this help) is open, and with Ctrl / Cmd / Alt held, so
 * browser shortcuts keep working. Leaving the reader is not on a key: the door button and its
 * parent lock stay the only way out.
 */
export function ReaderKeys({
  reading, onNext, onPrev, onListen, fullscreen, onFullscreen, onExitFullscreen, className,
}: {
  /** A story page is on screen (not the chapter end, a check or a loading page). */
  reading: boolean;
  onNext: () => void;
  onPrev: () => void;
  onListen: () => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  onExitFullscreen: () => void;
  className?: string;
}) {
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      // Holding an arrow may step on; holding any other key acts once.
      if (e.repeat && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (typing(e.target)) return;
      if (help || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const k = e.key;
      if (k === '?') {
        e.preventDefault();
        return setHelp(true);
      }
      if (k === 'f' || k === 'F') {
        e.preventDefault();
        return fullscreen ? onExitFullscreen() : onFullscreen();
      }
      if (k === 'Escape' && fullscreen) return onExitFullscreen();
      if (!reading) return;
      if (k === 'ArrowRight' || k === ' ' || k === 'Spacebar') {
        // Space on a focused button presses that button; don't turn the page as well.
        if (k !== 'ArrowRight' && e.target instanceof HTMLElement && e.target.closest('button, a, [role="button"]')) return;
        e.preventDefault();
        return onNext();
      }
      if (k === 'ArrowLeft') {
        e.preventDefault();
        return onPrev();
      }
      if (k === 'l' || k === 'L') {
        e.preventDefault();
        return onListen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [help, reading, fullscreen, onNext, onPrev, onListen, onFullscreen, onExitFullscreen]);

  return (
    <Dialog.Root open={help} onOpenChange={setHelp}>
      {/* Only where there is a keyboard and a mouse (not on phones and tablets). */}
      <span className="hidden pointer-fine:contents">
        <Dialog.Trigger aria-label="Keyboard keys" title="Keyboard keys (?)" aria-keyshortcuts="Shift+Slash" className={className}>
          <Icon name="keyboard" size={22} />
        </Dialog.Trigger>
      </span>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-bg p-5 text-ink shadow-pop">
          <Dialog.Title className="font-display text-xl font-extrabold">Keyboard keys</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-soft">Read the story without the mouse.</Dialog.Description>
          <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
            {READER_KEYS.map((r) => (
              <div key={r.what} className="contents">
                <dt className="flex gap-1">
                  {r.keys.map((k) => (
                    <kbd key={k} className="min-w-8 rounded-md border border-line bg-surface-2 px-2 py-0.5 text-center font-bold">{k}</kbd>
                  ))}
                </dt>
                <dd>{r.what}</dd>
              </div>
            ))}
          </dl>
          <Dialog.Close className="mt-5 inline-flex min-h-tap w-full items-center justify-center rounded-pill bg-primary font-bold text-primary-ink">Got it</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
