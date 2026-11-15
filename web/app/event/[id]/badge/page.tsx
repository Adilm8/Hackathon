'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { celebrateOnce } from '@/lib/fx/celebrate';
import { BadgeArt } from '@/components/badges';
import { ShareBadge } from '@/components/badges/ShareBadge';
import { Character } from '@/components/character';
import { EventIcon, Icon } from '@/components/icons';
import { UpgradeOffer } from '@/components/paywall/UpgradeOffer';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlanNotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { dateLabel } from '@/lib/engine/clock';
import { useEntitlements } from '@/lib/store/entitlement';
import { useEventsOfActiveChild } from '@/lib/store/children';
import { useEventCtx } from '@/lib/store/hooks';
import { exitSample } from '@/lib/store/sample';
import { getWorkspace } from '@/lib/store/workspace';
import { badgeCollection, getTemplate, skillsPractised, suggestNext } from '@/lib/store/engine';

/** Badge, collection and the next big day (docs/SPEC.md 4.14, 5.9, 10.3). */
export default function BadgePage() {
  const { id } = useParams<{ id: string }>();
  return <Screen>{() => <BadgeScreen id={decodeURIComponent(id)} />}</Screen>;
}

function BadgeScreen({ id }: { id: string }) {
  const ctx = useEventCtx(id);
  const events = useEventsOfActiveChild();
  const list = useEntitlements((s) => s.list);
  const ws = getWorkspace();
  if (!ctx) return <PlanNotFound />;
  const { event, child, template, today } = ctx;
  const badge = child.badges.find((b) => b.eventId === event.id);
  const base = `/event/${encodeURIComponent(event.id)}`;

  if (!badge)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <BadgeArt eventType={event.type} size={120} earned={false} label={template.badge.label} />
        <h1 className="font-display text-xl font-extrabold">The badge comes with the check-in</h1>
        <p className="text-ink-soft">Tell us how the big day went, it takes 30 seconds.</p>
        <ButtonLink href={`${base}/checkin`}>How did it go?</ButtonLink>
      </div>
    );

  const skills = skillsPractised(event).length;
  const collection = badgeCollection(child);
  const next = suggestNext(child, events, today, 3);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <CelebrateOnce id={`badge:${badge.eventId}`} />
      <section className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <BadgeArt eventType={badge.eventType} size={160} label={badge.label} />
          <span className="absolute -bottom-2 -right-6"><Character character={child.character} mood="happy" size={80} decorative /></span>
        </div>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{child.name} earned the {badge.label} badge!</h1>
        <p className="text-ink-soft">{dateLabel(badge.earnedOn, { weekday: true })}{skills > 0 ? ` · Skills you practised: ${skills}` : ''}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <ShareBadge label={badge.label} />
          <ButtonLink href={`${base}/checkin`} variant="ghost">Edit the check-in</ButtonLink>
        </div>
      </section>

      {collection.length > 1 && (
        <section aria-labelledby="col" className="flex flex-col gap-3">
          <h2 id="col" className="text-lg font-extrabold">{child.name}&apos;s badges</h2>
          <ul className="flex flex-wrap gap-4">
            {collection.map((b) => (
              <li key={b.eventId} className="flex w-24 flex-col items-center text-center text-xs font-bold">
                <BadgeArt eventType={b.eventType} size={72} label={b.label} />
                {b.label}
                <span className="font-normal text-ink-soft">{dateLabel(b.earnedOn)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="next" className="flex flex-col gap-3">
        <h2 id="next" className="text-lg font-extrabold">What&apos;s the next big day?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {next.map((t) => (
            <Link
              key={t}
              href={`/start?again=1&type=${t}`}
              className="flex min-h-tap items-center gap-3 rounded-card border border-line bg-surface p-3 font-bold shadow-step hover:border-ink-soft/40 sm:flex-col sm:text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-pill bg-surface-2"><EventIcon type={t} size={26} /></span>
              {getTemplate(t).label}
            </Link>
          ))}
        </div>
        <ButtonLink href="/start?again=1" size="l">
          <Icon name="smile-plus" size={22} /> Plan the next big day
        </ButtonLink>
        <p className="text-center text-xs text-ink-soft">{child.name}&apos;s details are filled in. The story remembers what helped.</p>
      </section>

      <UpgradeOffer workspace={ws} eventId={event.id} entitlements={list} />

      <HomeScreenHint />

      {ws === 'sample' && (
        <Card className="flex flex-col gap-2 text-center">
          <p className="font-bold">That&apos;s the whole product. Ready for your own big day?</p>
          <Button variant="secondary" onClick={exitSample}>Back to my app</Button>
        </Card>
      )}

      <ButtonLink href="/home" variant="ghost">Back to all big days</ButtonLink>
    </div>
  );
}

/** iOS Safari only, outside the installed app (FR-B1). */
function HomeScreenHint() {
  // Mounted only on the client (after Screen hydrated), so navigator is available.
  const [show] = useState(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return ios && safari && !standalone;
  });
  if (!show) return null;
  return (
    <p className="flex items-start gap-2 rounded-card border border-line bg-surface p-3 text-sm">
      <Icon name="sparkles" size={20} />
      Add Big Day Stories to your Home Screen so your plan stays on this phone: tap Share, then “Add to Home Screen”.
    </p>
  );
}

/** Confetti and the chime the first time the badge opens in this tab. */
function CelebrateOnce({ id }: { id: string }) {
  useEffect(() => celebrateOnce(id), [id]);
  return null;
}
