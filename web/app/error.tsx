'use client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

/** Last line of defence for any screen: a calm message and a way back instead of a blank page. */
export default function ScreenError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4">
      <EmptyState
        title="Something went wrong on this screen"
        text="Your plan and stories are safe on this device. Try again, or go back home."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/home" variant="secondary">Back home</ButtonLink>
          </div>
        }
      />
    </main>
  );
}
