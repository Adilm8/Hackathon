'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Paywall } from '@/components/paywall/Paywall';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import type { Entitlement } from '@/lib/engine/types';
import { setEntitlements } from '@/lib/store/entitlement';
import { useEventCtx } from '@/lib/store/hooks';
import { getWorkspace } from '@/lib/store/workspace';
import { planHref } from '@/lib/home/path';

/** Paywall screen (docs/SPEC.md 4.2, 4.11), read from the browser store (local-first). */
export default function Page() {
  return (
    <Screen room="parent">
      {() => (
        <Suspense>
          <PaywallScreen />
        </Suspense>
      )}
    </Screen>
  );
}

function PaywallScreen() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const eventId = decodeURIComponent(params.id);
  const ctx = useEventCtx(eventId);
  const ws = getWorkspace();
  const backHref = planHref(eventId);
  if (!ctx) return <PlanNotFound />;
  if (ctx.hasAccess)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <h1 className="font-display text-xl font-extrabold">This big day is already unlocked</h1>
        <ButtonLink href={backHref}>Back to the plan</ButtonLink>
      </div>
    );
  return (
    <Paywall
      workspace={ws}
      eventId={eventId}
      childName={ctx.child.name}
      questionsAsked={ctx.event.questions.filter((q) => q.chapter === 1).length}
      chaptersTotal={ctx.event.chapters.length}
      canceled={search.get('canceled') === '1'}
      backHref={backHref}
      demoSlot={ws === 'sample' ? <DemoSkip backHref={backHref} /> : undefined}
    />
  );
}

/** Jury demo mode (4.3, 10.4a): one tap grants the sample family server-side demo access. */
function DemoSkip({ backHref }: { backHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="l"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch('/api/sample/access', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'content-type': 'application/json', 'x-bds-workspace': 'sample' },
              body: JSON.stringify({ action: 'grant' }),
            });
            const body = (await res.json().catch(() => null)) as { entitlements?: Entitlement[] } | null;
            if (res.ok && body?.entitlements) {
              setEntitlements(body.entitlements);
              router.push(backHref);
              return;
            }
          } catch {
            /* fall through */
          }
          setError('Demo access is not available right now.');
          setBusy(false);
        }}
      >
        Skip payment (demo access)
      </Button>
      {error && <p role="alert" className="text-sm font-bold text-danger">{error}</p>}
    </div>
  );
}
