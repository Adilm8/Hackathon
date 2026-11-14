'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PaidScreen } from '@/components/paywall/PaidScreen';
import { currentWorkspace } from '@/components/paywall/workspace';
import { AppShell } from '@/components/ui/AppShell';

/** Return from Stripe: `/paid?session_id=…` (docs/SPEC.md 4.2, 10.2). */
function Paid() {
  const search = useSearchParams();
  const ws = currentWorkspace(search);
  return (
    <AppShell room="parent" isSample={ws === 'sample'}>
      <PaidScreen sessionId={search.get('session_id')} workspace={ws} />
    </AppShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Paid />
    </Suspense>
  );
}
