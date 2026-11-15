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
  const [busy, setBusy] = useState<false | 'plan' | 'home'>(false);
  const open = async (to: 'plan' | 'home') => {
    setBusy(to);
    await startSample(to);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 min-[480px]:flex-row">
      <ButtonLink href="/start" size="l" className="whitespace-nowrap min-[480px]:w-auto min-[480px]:flex-1 min-[480px]:px-6">Start for free</ButtonLink>
      <Button
        variant="secondary"
        size="l"
        className="whitespace-nowrap min-[480px]:w-auto min-[480px]:flex-1 min-[480px]:px-6"
        disabled={!!busy}
        onClick={() => open('plan')}
      >
        {busy === 'plan' ? 'Opening the sample…' : 'Try a sample'}
      </Button>
      </div>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => open('home')}
        className="inline-flex min-h-11 items-center self-center rounded-pill px-2 text-sm font-extrabold text-primary-text underline-offset-4 hover:underline disabled:opacity-60 min-[480px]:self-end"
      >
        {busy === 'home' ? 'Opening the sample…' : 'Or explore the whole app with sample data →'}
      </button>
    </div>
  );
}
