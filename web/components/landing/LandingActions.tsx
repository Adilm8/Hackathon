'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { startSample } from '@/lib/store/sample';
import { getWorkspace, workspaceHasData } from '@/lib/store/workspace';

/** Q6: a returning family goes straight to /home unless ?landing=1. */
export function RedirectIfData() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (params.get('landing') === '1') return;
    if (workspaceHasData(getWorkspace())) router.replace('/home');
  }, [params, router]);
  return null;
}

export function LandingActions() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3 min-[480px]:flex-row">
      <ButtonLink href="/start" size="l" className="whitespace-nowrap min-[480px]:w-auto min-[480px]:flex-1 min-[480px]:px-6">Start for free</ButtonLink>
      <Button
        variant="secondary"
        size="l"
        className="whitespace-nowrap min-[480px]:w-auto min-[480px]:flex-1 min-[480px]:px-6"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await startSample();
        }}
      >
        {busy ? 'Opening the sample…' : 'Try a sample'}
      </Button>
    </div>
  );
}
