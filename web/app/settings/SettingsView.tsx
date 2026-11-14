'use client';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SubscriptionCard } from '@/components/paywall/SubscriptionCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, TextInput } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Toggle';
import { toast } from '@/components/ui/Toast';
import { CharacterBuilder } from '@/components/ui/CharacterBuilder';
import { clock } from '@/lib/engine/clock';
import { FamilyDocSchema } from '@/lib/engine/schemas';
import type { FamilyDoc, Pronoun } from '@/lib/engine/types';
import { isOn } from '@/lib/flags';
import { useChild } from '@/lib/store/child';
import { useEntitlements } from '@/lib/store/entitlement';
import { getFamilyDoc, replaceFamilyDoc, wipeAllBrowserKeys } from '@/lib/store/family';
import { useSettings } from '@/lib/store/settings';
import { exitSample } from '@/lib/store/sample';
import { getWorkspace } from '@/lib/store/workspace';
import { api } from '@/lib/sync/api';

const FAMILY_WORDS = ['Mom', 'Dad', 'Mama', 'Papa', 'Mommy', 'Daddy', 'Grandma', 'Grandpa', 'Nana', 'Stepmom', 'Stepdad', 'Aunt', 'Uncle'];
const NAME_RE = /^[\p{L}][\p{L}'’-]{0,19}$/u;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsView() {
  const child = useChild((s) => s.child);
  const updateChild = useChild((s) => s.updateChild);
  const settings = useSettings();
  const ents = useEntitlements((s) => s.list);
  const router = useRouter();
  const sample = getWorkspace() === 'sample';
  const [name, setName] = useState(child?.name ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteAll = async () => {
    setDeleting(true);
    await Promise.all([api.deleteFamily('real'), api.deleteFamily('sample')]);
    wipeAllBrowserKeys();
    try {
      indexedDB.deleteDatabase('bds-photos');
      indexedDB.deleteDatabase('bds-recordings');
    } catch {
      /* not available */
    }
    // Full reload so every store starts empty.
    window.location.href = '/?landing=1';
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="font-display text-2xl font-extrabold">Settings</h1>
      {sample && (
        <div className="flex items-center justify-between gap-3 rounded-card border-2 border-accent p-4">
          <p className="text-sm font-bold">You are in the sample. Nothing here touches your own family.</p>
          <Button variant="secondary" onClick={exitSample}>Exit sample</Button>
        </div>
      )}

      {child ? (
        <>
          <Section title="Child">
            <Field id="s-name" label="First name or nickname" helper="Never a last name. Never sent to an AI provider." error={name && !NAME_RE.test(name.trim()) ? 'One word, letters only.' : ''}>
              <TextInput id="s-name" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => NAME_RE.test(name.trim()) && name.trim() !== child.name && updateChild({ name: name.trim() })} />
            </Field>
            <Field id="s-pron" label="How is it pronounced?">
              <TextInput id="s-pron" maxLength={30} defaultValue={child.pronunciation ?? ''} onBlur={(e) => updateChild({ pronunciation: e.target.value.trim() || undefined })} />
            </Field>
            <div>
              <p className="mb-2 text-sm font-bold">Age</p>
              <div className="flex flex-wrap gap-2">
                {([3, 4, 5, 6, 7, 8] as const).map((a) => <Chip key={a} selected={child.age === a} onToggle={() => updateChild({ age: a })}>{a}</Chip>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Word the story uses</p>
              <div className="flex flex-wrap gap-2">
                {(['he', 'she', 'they'] as Pronoun[]).map((p) => <Chip key={p} selected={child.pronoun === p} onToggle={() => updateChild({ pronoun: child.pronoun === p ? undefined : p })}>{p}</Chip>)}
              </div>
            </div>
          </Section>

          <Section title="Story friend">
            <CharacterBuilder value={child.character} onChange={(character) => updateChild({ character })} />
          </Section>

          <Section title="Family values">
            <div className="flex flex-wrap gap-2">
              <Chip selected={child.values.tone === 'secular'} onToggle={() => updateChild({ values: { ...child.values, tone: 'secular' } })}>Secular</Chip>
              <Chip selected={child.values.tone === 'religious'} onToggle={() => updateChild({ values: { ...child.values, tone: 'religious' } })}>Religious</Chip>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip selected={child.values.bodyWords === 'anatomical'} onToggle={() => updateChild({ values: { ...child.values, bodyWords: 'anatomical' } })}>Anatomical words</Chip>
              <Chip selected={child.values.bodyWords === 'family'} onToggle={() => updateChild({ values: { ...child.values, bodyWords: 'family' } })}>Our family words</Chip>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Who is at home</p>
              <div className="flex flex-wrap gap-2">
                {FAMILY_WORDS.map((w) => {
                  const on = child.values.family.includes(w);
                  return <Chip key={w} selected={on} onToggle={() => updateChild({ values: { ...child.values, family: on ? child.values.family.filter((x) => x !== w) : [...child.values.family, w] } })}>{w}</Chip>;
                })}
              </div>
            </div>
            {isOn('socialStyle') && (
              <Toggle id="s-social" label="Social story style" hint="Literal, first person, the same text on every reading." checked={child.styleMode === 'social'} onChange={(v) => updateChild({ styleMode: v ? 'social' : 'story' })} />
            )}
          </Section>
        </>
      ) : (
        <EmptyState title="No child profile yet" text="Start a plan to set up the profile." action={<ButtonLink href="/start">Start</ButtonLink>} />
      )}

      <Section title="Reading">
        <div>
          <p className="mb-2 text-sm font-bold">Text size</p>
          <div className="flex gap-2">
            {(['m', 'l', 'xl'] as const).map((s) => <Chip key={s} selected={settings.textSize === s} onToggle={() => settings.setTextSize(s)}>{s === 'm' ? 'Medium' : s === 'l' ? 'Large' : 'Extra large'}</Chip>)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold">Night colours in the reader</p>
          <div className="flex gap-2">
            {(['auto', 'on', 'off'] as const).map((m) => <Chip key={m} selected={settings.nightMode === m} onToggle={() => settings.setNightMode(m)}>{m === 'auto' ? 'After 7 pm' : m === 'on' ? 'Always' : 'Never'}</Chip>)}
          </div>
        </div>
        {isOn('voiceQuestion') && (
          <Toggle id="s-voice" label="Voice questions" hint="Only where recognition runs on this device. No audio is kept or sent by us." checked={!!settings.voiceQuestionConsentOn} onChange={(v) => settings.setVoiceConsent(v ? clock.today() : undefined)} />
        )}
      </Section>

      {!sample && isOn('restoreLink') && child && <AnotherDevice />}
      {isOn('exportImport') && child && <Backup onImported={() => router.push('/home')} />}

      <Section title="Subscription">
        <SubscriptionCard workspace={getWorkspace()} entitlements={ents} />
      </Section>

      <Section title="Delete all data">
        <p className="text-sm text-ink-soft">
          Deletes the plan, questions, check-ins and paid-access records on our server and everything stored in this browser, for your family and the sample.
        </p>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete all data</Button>
      </Section>

      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete everything?" description="This cannot be undone.">
        <div className="flex flex-col gap-3">
          <Button variant="danger" size="l" onClick={deleteAll} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, delete all data'}</Button>
          <Button variant="secondary" size="l" onClick={() => setConfirmDelete(false)}>Keep my data</Button>
        </div>
      </Sheet>
    </div>
  );
}

function AnotherDevice() {
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (link && canvas.current) void QRCode.toCanvas(canvas.current, link, { width: 200, margin: 1 });
  }, [link]);
  const make = async () => {
    setBusy(true);
    const code = await api.createRestoreCode();
    setBusy(false);
    if (!code) return toast('Could not create the link. Are you online?');
    setLink(`${window.location.origin}/restore#${code}`);
  };
  return (
    <Section title="Use on another device">
      <p className="text-sm text-ink-soft">A private link that opens this family in another browser. Anyone with the link can open it, so share it only with family. Making a new link cancels the old one.</p>
      {link && (
        <div className="flex flex-col items-start gap-3">
          <canvas ref={canvas} className="rounded-field bg-white p-2" aria-label="QR code of the private link" />
          <code className="break-all rounded-field bg-surface-2 p-2 text-xs">{link}</code>
          <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(link).then(() => toast('Link copied'))}>Copy link</Button>
        </div>
      )}
      <Button onClick={make} disabled={busy}>{link ? 'Make a new link' : 'Show my private link'}</Button>
    </Section>
  );
}

function Backup({ onImported }: { onImported: () => void }) {
  const [pending, setPending] = useState<FamilyDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportNow = () => {
    const doc = getFamilyDoc();
    const data = { schemaVersion: doc.schemaVersion, exportedOn: clock.today(), child: doc.child, events: doc.events };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `big-day-stories-backup-${clock.today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Section title="Backup">
      <p className="text-sm text-ink-soft">A file with the plan, questions and check-ins. Photos and recordings stay on this device and are not included.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={exportNow}>Export backup</Button>
        <label className="inline-flex min-h-btn-m cursor-pointer items-center rounded-pill border-2 border-line px-6 font-extrabold">
          Import backup
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              setError(null);
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const raw = JSON.parse(await f.text());
                const ok = FamilyDocSchema.safeParse({ schemaVersion: raw.schemaVersion, child: raw.child, events: raw.events, updatedAt: Date.now() });
                if (!ok.success) throw new Error('bad');
                setPending(ok.data as FamilyDoc);
              } catch {
                setError('This file is not a Big Day Stories backup.');
              }
            }}
          />
        </label>
      </div>
      {error && <p role="alert" className="text-sm font-bold text-danger">{error}</p>}
      <Sheet open={!!pending} onOpenChange={(v) => !v && setPending(null)} title="Replace this family with the backup?" description="The current plan in this browser and on our server is replaced.">
        <div className="flex flex-col gap-3">
          <Button size="l" onClick={() => { replaceFamilyDoc(pending!); useChild.getState().updateChild({}); setPending(null); onImported(); }}>Replace</Button>
          <Button size="l" variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
        </div>
      </Sheet>
    </Section>
  );
}
