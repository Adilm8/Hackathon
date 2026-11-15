'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { NarrationSettings } from '@/components/settings/NarrationSettings';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Sheet } from '@/components/ui/Sheet';

/**
 * Voice choice inside the reader: the same options as Settings > Reading (story voice, character
 * voice, device voice, speed, Read on), so a parent can switch the storyteller mid-story.
 * The next tap on Listen reads with the new voice.
 */
export function VoicePicker({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Choose the reading voice" title="Reading voice" className={className}>
        <Icon name="ear" size={22} />
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Reading voice" description="Pick who reads the story. The next Listen uses it.">
        <ErrorBoundary fallback={<p className="text-sm text-ink-soft">Read-aloud options are not available in this browser.</p>}>
          <NarrationSettings />
        </ErrorBoundary>
      </Sheet>
    </>
  );
}
