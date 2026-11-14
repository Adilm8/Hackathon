'use client';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { SubscriptionCard } from '@/components/paywall/SubscriptionCard';
import { ExportImport, RestoreLink, StyleToggle, ValuesProfile, VoiceConsent } from '@/components/settings';
import { clearDeviceData } from '@/lib/storage/clear';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, TextInput } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { CharacterBuilder } from '@/components/ui/CharacterBuilder';
import type { Pronoun } from '@/lib/engine/types';
import { isOn } from '@/lib/flags';
import { useChild } from '@/lib/store/child';
import { useEntitlements } from '@/lib/store/entitlement';
import { getFamilyDoc, replaceFamilyDoc, wipeAllBrowserKeys } from '@/lib/store/family';
import { useSettings } from '@/lib/store/settings';
import { exitSample } from '@/lib/store/sample';
import { getWorkspace } from '@/lib/store/workspace';
import { api } from '@/lib/sync/api';

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
    await clearDeviceData();
    wipeAllBrowserKeys();
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
            <ValuesProfile value={child.values} onChange={(values) => updateChild({ values })} />
            {isOn('socialStyle') && <StyleToggle value={child.styleMode} onChange={(styleMode) => updateChild({ styleMode })} />}
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
          <ErrorBoundary fallback={<p className="text-sm text-ink-soft">Voice options are not available in this browser. You can always type the question.</p>}>
            <VoiceConsent consentOn={settings.voiceQuestionConsentOn} onChange={settings.setVoiceConsent} workspace={getWorkspace()} />
          </ErrorBoundary>
        )}
      </Section>

      {!sample && isOn('restoreLink') && child && (
        <Section title="Use on another device">
          <RestoreLink />
        </Section>
      )}
      {isOn('exportImport') && child && (
        <Section title="Backup">
          <ExportImport
            getDoc={getFamilyDoc}
            onImport={(doc) => {
              replaceFamilyDoc(doc);
              useChild.getState().updateChild({}); // marks the family changed so sync pushes it
              router.push('/home');
            }}
          />
        </Section>
      )}

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
