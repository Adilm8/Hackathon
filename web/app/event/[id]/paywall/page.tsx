'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Paywall } from '@/components/paywall/Paywall';
import { currentWorkspace } from '@/components/paywall/workspace';
import { AppShell } from '@/components/ui/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import type { Entitlement, FamilyDoc, Workspace } from '@/lib/engine/types';
import { hasCapability } from '@/lib/payments/plans';
import { api } from '@/lib/sync';

type Loaded = { doc: FamilyDoc; entitlements: Entitlement[] } | null;

/**
 * Paywall screen (docs/SPEC.md 4.2, 4.11). Reads the family from the server copy, so it
 * works on a fresh return from Stripe; the screens stream may switch it to the browser store.
 */
function PaywallScreen() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const eventId = decodeURIComponent(params.id);
  const ws: Workspace = currentWorkspace(search);
  const [data, setData] = useState<Loaded | 'loading'>('loading');

  useEffect(() => {
    let alive = true;
    void api.getState(ws).then((r) => {
      if (alive) setData(r.kind === 'ok' ? { doc: r.doc, entitlements: r.entitlements } : null);
    });
    return () => {
      alive = false;
    };
  }, [ws]);

  const doc = data && data !== 'loading' ? data.doc : null;
  const event = doc?.events.find((e) => e.id === eventId);
  const unlocked = data && data !== 'loading' && hasCapability(data.entitlements, 'chapters.all', eventId);
  const backHref = `/event/${encodeURIComponent(eventId)}`;

  return (
    <AppShell room="parent" childName={doc?.child?.name} isSample={ws === 'sample'}>
      {data === 'loading' ? (
        <p role="status" className="py-16 text-center text-ink-soft">
          Loading…
        </p>
      ) : unlocked ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <h1 className="font-display text-xl font-extrabold">This big day is already unlocked</h1>
          <ButtonLink href={backHref}>Back to the plan</ButtonLink>
        </div>
      ) : (
        <Paywall
          workspace={ws}
          eventId={eventId}
          childName={doc?.child?.name}
          questionsAsked={event?.questions.filter((q) => q.chapter === 1).length ?? 0}
          chaptersTotal={event?.chapters.length}
          canceled={search.get('canceled') === '1'}
          backHref={backHref}
        />
      )}
    </AppShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PaywallScreen />
    </Suspense>
  );
}
