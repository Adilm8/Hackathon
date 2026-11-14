'use client';
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/** Bottom sheet on phones, centred dialog on wide screens (Radix Dialog, MIT): focus trap, Esc, labelled. */
export function Sheet({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-card border border-line bg-surface p-5 pb-8 text-ink shadow-pop
            sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,30rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card"
        >
          <Dialog.Title className="font-display text-xl font-extrabold">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1 text-sm text-ink-soft">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
