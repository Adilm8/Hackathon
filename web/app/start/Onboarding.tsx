'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Character } from '@/components/character';
import { CharacterBuilder } from '@/components/ui/CharacterBuilder';
import { EventIcon, Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { Field, TextInput } from '@/components/ui/Field';
import { GuideBubble } from '@/components/ui/GuideBubble';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toggle } from '@/components/ui/Toggle';
import { ValuesProfile } from '@/components/settings';
import { PhotoPicker, type DraftPhoto } from '@/components/photos/PhotoPicker';
import { photoKey, putPhoto } from '@/lib/photos';
import { addDays, clock, dateLabel, diffDays } from '@/lib/engine/clock';
import type { Character as CharacterT, ChildProfile, EventType, Pronoun, Topic, ValuesProfile as ValuesProfileT } from '@/lib/engine/types';
import { isOn } from '@/lib/flags';
import { speakOnce } from '@/lib/speech/narrator';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { useSettings } from '@/lib/store/settings';
import { createEvent, EVENT_TYPES, FEAR_OPTIONS, getTemplate, isQuickPrep, validateEventDate } from '@/lib/store/engine';
import { api } from '@/lib/sync/api';
import { startSyncNow } from '@/lib/store/boot';
import { getWorkspace } from '@/lib/store/workspace';
import { newId } from '@/lib/store/id';
import { firstNameOnly, loadProfiles, removeProfile, saveProfile, type SavedProfile } from '@/lib/store/profiles';

const NAME_RE = /^[\p{L}][\p{L}'’-]{0,19}$/u;
const EVENT_CAPTION: Record<EventType, string> = {
  dentist: 'Check-up or cleaning', school: 'Preschool, kindergarten, school', flight: 'Airport and plane',
  sibling: 'A baby is coming', haircut: 'Salon or barbershop', shot: 'Vaccine at the doctor',
  doctor: 'Yearly check-up', blood_test: 'Finger prick or arm', hospital: 'A night or more in hospital',
  moving: 'A new home', sleepover: 'A night at a friend\'s or grandma\'s', babysitter: 'A new sitter or nanny',
  swimming: 'Pool and swim teacher', party: 'A friend\'s party', other: 'Anything else: a new club, a trip…',
};

type StepId = 'gate' | 'who' | 'name' | 'age' | 'event' | 'date' | 'fears' | 'character' | 'values';
const GROUP: Record<StepId, 1 | 2 | 3> = { gate: 1, who: 1, name: 1, age: 1, event: 2, date: 2, fears: 2, character: 3, values: 3 };

interface Draft {
  name: string; pronunciation: string; age?: number; pronoun?: Pronoun;
  type?: EventType; customLabel: string; date: string; fears: Topic[]; customFear: string;
  character: CharacterT; values: ValuesProfileT; social: boolean; photos: DraftPhoto[];
}

export function Onboarding() {
  const router = useRouter();
  const search = useSearchParams();
  const again = search.get('again') === '1';
  // "Plan the next big day" on the badge screen can preselect a suggested event (4.14).
  const suggestedType = EVENT_TYPES.find((t) => t === search.get('type'));
  const existing = useChild((s) => s.child);
  const gateOn = useSettings((s) => s.parentGateAcceptedOn);
  const acceptGate = useSettings((s) => s.acceptParentGate);
  const today = clock.today();

  // Children this browser already knows: the one of this workspace first, then the saved ones.
  const [known, setKnown] = useState<SavedProfile[]>(() => knownChildren(existing));
  // With only this workspace's child known, "Plan another big day" goes straight to the event.
  const quick = again && !!existing && known.length === 1;
  // "Make a story for Leo" on the home page's Child section names a saved child.
  const preset = known.find((k) => k.childId === search.get('child')) ?? (quick ? known[0] : undefined);
  // Fixed for this visit: accepting the gate must not shift the step list under the user.
  const [base] = useState<StepId[]>(() => {
    const all: StepId[] = ['gate', 'who', 'name', 'age', 'event', 'date', 'fears', 'character', 'values'];
    return all.filter((s) => !(s === 'gate' && gateOn) && !(s === 'who' && (known.length === 0 || quick)));
  });
  // Steps already answered by a saved child are left out ("Change" brings them back).
  const [skip, setSkip] = useState<StepId[]>(() => (preset ? CHILD_STEPS : []));
  const steps = base.filter((s) => !skip.includes(s));
  const [step, setStep] = useState<StepId>(() => (preset && steps[0] === 'who' ? steps[1] : steps[0]));
  const i = Math.max(0, steps.indexOf(step));
  const [pickedId, setPickedId] = useState<string | null>(() => preset?.childId ?? null);

  const [d, setD] = useState<Draft>(() => ({
    ...childFields(preset),
    type: suggestedType, customLabel: '', date: '', fears: [], customFear: '',
    photos: [],
  }));
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const picked = known.find((k) => k.childId === pickedId);

  /** "Who is this story for?": a saved child fills and skips the child steps; edit keeps them. */
  const choose = (p: SavedProfile | null, edit = false) => {
    setPickedId(p?.childId ?? null);
    setD((x) => ({ ...x, ...childFields(p ?? undefined) }));
    const nextSkip = p && !edit ? CHILD_STEPS : [];
    setSkip(nextSkip);
    const visible = base.filter((s) => !nextSkip.includes(s));
    setStep(visible[visible.indexOf('who') + 1] ?? visible[0]);
    setTouched(false);
  };
  const changeChild = () => {
    setSkip([]);
    setStep(base.includes('who') ? 'who' : 'name');
  };
  const [touched, setTouched] = useState(false);
  const [gateTick, setGateTick] = useState(false);

  const nameErr = !d.name ? 'Please enter a first name or nickname.' : !NAME_RE.test(d.name.trim()) ? 'One word, letters only (a hyphen or apostrophe is fine).' : '';
  const dateCheck = d.date ? validateEventDate(d.date, today) : null;
  const dateErr = !d.date ? 'Please pick the date.' : dateCheck === 'past' ? 'This date has passed. Pick today or a later day.' : dateCheck === 'too_far' ? 'Pick a date within the next 60 days.' : '';

  const valid: Record<StepId, boolean> = {
    gate: gateTick,
    who: true,
    name: !nameErr,
    age: d.age !== undefined,
    event: !!d.type && (d.type !== 'other' || d.customLabel.trim().length > 0),
    date: !dateErr,
    fears: true,
    character: true,
    values: true,
  };

  const next = async () => {
    setTouched(true);
    if (!valid[step]) return;
    setTouched(false);
    if (step === 'gate') {
      acceptGate(today);
      if (getWorkspace() === 'real') void api.createFamily().then(() => startSyncNow());
    }
    if (i < steps.length - 1) setStep(steps[i + 1]);
    else finish();
  };
  const back = () => (i > 0 ? setStep(steps[i - 1]) : router.push(existing ? '/home' : '/?landing=1'));

  const finish = () => {
    // Same child as this workspace's (picked, or typed again by name): keep its id, badges and memory.
    const same = existing && (pickedId === existing.id || (!pickedId && firstNameOnly(existing.name).toLocaleLowerCase() === d.name.trim().toLocaleLowerCase()))
      ? existing : null;
    const childId = same?.id ?? picked?.childId ?? newId();
    const child: ChildProfile = {
      id: childId,
      name: d.name.trim(),
      pronunciation: d.pronunciation.trim() || undefined,
      age: d.age as ChildProfile['age'],
      pronoun: d.pronoun,
      character: d.character,
      values: d.values,
      styleMode: d.social && isOn('socialStyle') ? 'social' : 'story',
      techniques: same?.techniques ?? [],
      badges: same?.badges ?? [],
      createdOn: same?.createdOn ?? today,
    };
    useChild.getState().setChild(child);
    saveProfile(child);
    const eventId = newId();
    const photos = isOn('placePhotos')
      ? d.photos.slice(0, 3).map((p, n) => ({ key: photoKey(getWorkspace(), eventId, n), caption: p.caption.trim().slice(0, 60), blob: p.blob }))
      : [];
    photos.forEach((p) => void putPhoto(p.key, p.blob)); // device only, never uploaded
    const event = createEvent({
      id: eventId, childId, photos: photos.map(({ key, caption }) => ({ key, caption })), type: d.type!, date: d.date, today, fears: d.fears,
      customLabel: d.type === 'other' ? d.customLabel.trim() : undefined,
      customFear: d.customFear.trim() || undefined,
    });
    useEvents.getState().addEvent(event);
    router.push(`/event/${event.id}`);
  };

  const guide = <Character character={d.character} mood={step === 'fears' ? 'worried' : 'happy'} size={72} decorative />;
  const nm = d.name.trim() || 'your child';
  const titleOf: Record<StepId, string> = {
    gate: 'Hi! I help kids get ready for big days. First, a quick check.',
    who: 'Who is this story for?',
    name: "What's your child's name?",
    age: `How old is ${nm}?`,
    event: `What big day is coming up for ${nm}?`,
    date: 'When is the big day?',
    fears: `What might worry ${nm}? Pick up to 3.`,
    character: `Let's make ${nm}'s story friend.`,
    values: 'A few things about your family',
  };

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col gap-6">
      <ProgressBar value={i + 1} max={steps.length} label={`Step ${GROUP[step]} of 3`} onBack={back} />
      <p className="-mt-3 text-xs font-bold text-ink-soft">Step {GROUP[step]} of 3 · {['', 'Your child', 'The big day', 'Story friend and values'][GROUP[step]]}</p>
      <GuideBubble guide={guide}>
        <h1 className="text-lg font-extrabold">{titleOf[step]}</h1>
      </GuideBubble>

      <div className="flex flex-1 flex-col gap-5">
        {step === 'gate' && (
          <label className="flex min-h-tap cursor-pointer items-start gap-3 rounded-card border-2 border-line bg-surface p-4">
            <input type="checkbox" className="mt-1 size-6 accent-[var(--primary)]" checked={gateTick} onChange={(e) => setGateTick(e.target.checked)} />
            <span className="text-base font-bold">I&apos;m a parent or guardian (18+)</span>
          </label>
        )}

        {step === 'who' && (
          <>
            <div role="radiogroup" aria-label="Child" className="flex flex-col gap-3">
              {known.map((p) => (
                <div key={p.childId} className="flex items-stretch gap-2">
                  <ChoiceCard
                    className="flex-1"
                    selected={pickedId === p.childId}
                    onSelect={() => choose(p)}
                    icon={<Character character={p.character} mood="happy" size={40} decorative />}
                    title={p.name}
                    caption={`${p.age} years · saved on this device`}
                  />
                  <Button variant="secondary" onClick={() => choose(p, true)} aria-label={`Edit ${p.name}'s details`} className="!px-4">
                    <Icon name="pencil" size={20} />
                  </Button>
                  {p.childId !== existing?.id && (
                    <Button variant="ghost" onClick={() => setKnown(withoutSaved(removeProfile(p.childId), existing))} aria-label={`Forget ${p.name} on this device`} className="!px-3">
                      <span aria-hidden className="text-xl leading-none">×</span>
                    </Button>
                  )}
                </div>
              ))}
              <ChoiceCard
                selected={false}
                onSelect={() => choose(null)}
                icon={<Icon name="smile-plus" size={28} />}
                title="Someone new"
                caption="Type a new child's first name or nickname"
              />
            </div>
            <p className="text-xs text-ink-soft">Saved children stay in this browser only. Tap one to skip straight to the big day.</p>
          </>
        )}

        {(step === 'event' || step === 'date' || step === 'fears') && skip.includes('name') && (
          <p className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span>Story for <strong className="text-ink">{d.name}</strong>, {d.age} years.</span>
            <button type="button" onClick={changeChild} className="inline-flex min-h-tap items-center font-bold text-primary-text underline">Change</button>
          </p>
        )}

        {step === 'name' && (
          <>
            <Field id="name" label="First name or nickname" helper="A nickname works too. Please don't add a last name. The name stays on this device and in your family's private copy; it is never sent to an AI provider." error={touched ? nameErr : ''}>
              <TextInput id="name" autoComplete="off" autoCapitalize="words" maxLength={20} value={d.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={touched && !!nameErr} />
            </Field>
            <Field id="pron" label="How is it pronounced? (optional)" helper="Write it the way it sounds, for the read-aloud voice.">
              <div className="flex gap-2">
                <TextInput id="pron" maxLength={30} placeholder="e.g. MAY-ah" value={d.pronunciation} onChange={(e) => set({ pronunciation: e.target.value })} />
                <Button variant="secondary" onClick={() => speakOnce(d.pronunciation || d.name || 'Hello')} aria-label="Hear it">
                  <Icon name="volume-2" size={20} /> Hear it
                </Button>
              </div>
            </Field>
          </>
        )}

        {step === 'age' && (
          <>
            <div role="radiogroup" aria-label="Age" className="grid grid-cols-3 gap-3">
              {[3, 4, 5, 6, 7, 8].map((a) => (
                <ChoiceCard key={a} selected={d.age === a} onSelect={() => set({ age: a })} title={`${a}`} caption="years" className="justify-center" />
              ))}
            </div>
            {touched && !valid.age && <p role="alert" className="text-xs font-bold text-danger">Please choose an age.</p>}
            <div>
              <p className="mb-2 text-sm font-bold">Which word should the story use? (optional)</p>
              <div className="flex flex-wrap gap-2">
                {(['he', 'she', 'they'] as Pronoun[]).map((p) => (
                  <Chip key={p} selected={d.pronoun === p} onToggle={() => set({ pronoun: d.pronoun === p ? undefined : p })}>{p}</Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 'event' && (
          <>
            <div role="radiogroup" aria-label="Big day" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {EVENT_TYPES.map((t) => (
                <ChoiceCard key={t} selected={d.type === t} onSelect={() => set({ type: t })} icon={<EventIcon type={t} size={28} />} title={t === 'other' ? 'Something else' : getTemplate(t).label} caption={EVENT_CAPTION[t]} />
              ))}
            </div>
            {d.type === 'other' && (
              <Field id="olabel" label="What is the big day?" error={touched && !d.customLabel.trim() ? 'Please name the big day.' : ''}>
                <TextInput id="olabel" maxLength={40} placeholder="e.g. Swimming lesson" value={d.customLabel} onChange={(e) => set({ customLabel: e.target.value })} />
              </Field>
            )}
            {touched && !d.type && <p role="alert" className="text-xs font-bold text-danger">Please choose the big day.</p>}
          </>
        )}

        {step === 'date' && (
          <>
            <Field id="date" label="Date" error={touched || d.date ? dateErr : ''}>
              <TextInput id="date" type="date" min={today} max={addDays(today, 60)} value={d.date} onChange={(e) => set({ date: e.target.value })} aria-invalid={(touched || !!d.date) && !!dateErr} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {[['Today', 0], ['Tomorrow', 1], ['In 5 days', 5], ['In a week', 7]].map(([l, n]) => (
                <Chip key={l} selected={d.date === addDays(today, n as number)} onToggle={() => set({ date: addDays(today, n as number) })}>{l}</Chip>
              ))}
            </div>
            {d.date && !dateErr && <DatePreview date={d.date} today={today} />}
          </>
        )}

        {step === 'fears' && (
          <>
            <div className="flex flex-wrap gap-2">
              {FEAR_OPTIONS.map((f) => {
                const on = d.fears.includes(f.topic);
                return (
                  <Chip key={f.topic} selected={on} onToggle={() => set({ fears: on ? d.fears.filter((x) => x !== f.topic) : d.fears.length < 3 ? [...d.fears, f.topic] : d.fears })}>
                    {f.label}
                  </Chip>
                );
              })}
            </div>
            <p className="text-xs text-ink-soft" aria-live="polite">{d.fears.length} of 3 chosen. You can skip this.</p>
            <Field id="cfear" label="Something else (optional)">
              <TextInput id="cfear" maxLength={40} value={d.customFear} onChange={(e) => set({ customFear: e.target.value })} />
            </Field>
          </>
        )}

        {step === 'character' && <CharacterBuilder value={d.character} onChange={(character) => set({ character })} />}

        {step === 'values' && (
          <div className="flex flex-col gap-5">
            <ValuesProfile value={d.values} onChange={(values) => set({ values })} />
            {isOn('socialStyle') && (
              <Toggle id="social" label="Social story style" hint="Literal, first person, the same text every time. Helpful for many autistic kids." checked={d.social} onChange={(social) => set({ social })} />
            )}
            {isOn('placePhotos') && <PhotoPicker value={d.photos} onChange={(photos) => set({ photos })} />}
            <p className="text-xs text-ink-soft">All optional. You can change these later in Settings.</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 py-4">
        <Button size="l" onClick={next}>
          {i === steps.length - 1 ? 'Make the plan' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

function DatePreview({ date, today }: { date: string; today: string }) {
  const n = diffDays(today, date);
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-step">
      <p className="text-lg font-extrabold">
        {n === 0 ? 'Today is the big day' : n === 1 ? 'Tomorrow is the big day' : `${n} sleeps to go`}
      </p>
      <p className="text-sm text-ink-soft">{dateLabel(date, { weekday: true })}</p>
      {isQuickPrep(date, today) ? (
        <p className="mt-2 text-sm"><strong>Quick prep:</strong> one short chapter that covers everything, plus a card for the day.</p>
      ) : (
        <p className="mt-2 text-sm">{Math.min(5, n)} short chapters, one each evening, starting tonight.</p>
      )}
    </div>
  );
}


/** Name, age, story friend and values: the steps a saved child already answers. */
const CHILD_STEPS: StepId[] = ['name', 'age', 'character', 'values'];

function childFields(p?: SavedProfile): Pick<Draft, 'name' | 'pronunciation' | 'age' | 'pronoun' | 'character' | 'values' | 'social'> {
  return {
    name: p?.name ?? '', pronunciation: p?.pronunciation ?? '', age: p?.age, pronoun: p?.pronoun,
    character: p?.character ?? { animal: 'bunny', color: 'blue', accessory: 'cap' },
    values: p?.values ?? { tone: 'secular', bodyWords: 'anatomical', family: [] },
    social: p?.styleMode === 'social',
  };
}

function withoutSaved(saved: SavedProfile[], existing: ChildProfile | null): SavedProfile[] {
  if (!existing) return saved;
  const key = firstNameOnly(existing.name).toLocaleLowerCase();
  const own = saved.find((p) => p.childId === existing.id || p.name.toLocaleLowerCase() === key);
  // The workspace's own child is shown with its current details, keeping its id.
  const first: SavedProfile = { ...(own ?? { savedAt: 0 }), ...pickChild(existing), childId: existing.id, savedAt: own?.savedAt ?? 0 };
  return [first, ...saved.filter((p) => p !== own)];
}

function knownChildren(existing: ChildProfile | null): SavedProfile[] {
  return withoutSaved(loadProfiles(), existing);
}

function pickChild(c: ChildProfile) {
  return { name: firstNameOnly(c.name), pronunciation: c.pronunciation, age: c.age, pronoun: c.pronoun, character: c.character, values: c.values, styleMode: c.styleMode };
}
