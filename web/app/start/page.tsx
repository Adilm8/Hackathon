'use client';
import { Suspense } from 'react';
import { Screen } from '@/components/ui/Screen';
import { Onboarding } from './Onboarding';

/** Parent gate + onboarding (docs/SPEC.md 4.5); `?again=1` for the next event. */
export default function StartPage() {
  return (
    <Screen>
      <Suspense>
        <Onboarding />
      </Suspense>
    </Screen>
  );
}
