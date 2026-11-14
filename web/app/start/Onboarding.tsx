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
import { PhotoPicker, type DraftPhoto } from '@/components/photos/PhotoPicker';
import { photoKey, putPhoto } from '@/lib/photos';
import { addDays, clock, dateLabel, diffDays } from '@/lib/engine/clock';
import type { Character as CharacterT, ChildProfile, EventType, Pronoun, Topic, ValuesProfile } from '@/lib/engine/types';
import { isOn } from '@/lib/flags';
import { speakOnce } from '@/lib/speech/narrator';
import { useChild } from '@/lib/store/child';
import { useEvents } from '@/lib/store/events';
import { useSettings } from '@/lib/store/settings';
import { createEvent, EVENT_TYPES, FEAR_OPTIONS, getTemplate, isQuickPrep, validateEventDate } from '@/lib/store/engine';
import { api } from '@/lib/sync/api';
import { getWorkspace } from '@/lib/store/workspace';
import { newId } from '@/lib/store/id';

const NAME_RE = /^[\p{L}][\p{L}'’-]{0,19}$/u;
const FAMILY_WORDS = ['Mom', 'Dad', 'Mama', 'Papa', 'Mommy', 'Daddy', 'Grandma', 'Grandpa', 'Nana', 'Stepmom', 'Stepdad', 'Aunt', 'Uncle'];
const EVENT_CAPTION: Record<EventType, string> = {
  dentist: 'Check-up or cleaning', school: 'Preschool, kindergarten, school', flight: 'Airport and plane',
  sibling: 'A baby is coming', haircut: 'Salon or barbershop', shot: 'Vaccine at the doctor', other: 'Something else',
};

type StepId = 'gate' | 'name' | 'age' | 'event' | 'date' | 'fears' | 'character' | 'values';
const GROUP: Record<StepId, 1 | 2 | 3> = { gate: 1, name: 1, age: 1, event: 2, date: 2, fears: 2, character: 3, values: 3 };

interface Draft {
  name: string; pronunciation: string; age?: number; pronoun?: Pronoun;
  type?: EventType; customLabel: string; date: string; fears: Topic[]; customFear: string;
  character: CharacterT; values: ValuesProfile; social: boolean; photos: DraftPhoto[];
}

export function Onboarding() {
  const router = useRouter();
  const again = useSearchParams().get('again') === '1';
  const existing = useChild((s) => s.child);
  const gateOn = useSettings((s) => s.parentGateAcceptedOn);
  const acceptGate = useSettings((s) => s.acceptParentGate);
  const today = clock.today();

  const prefill = again && existing;
  // Fixed for this visit: accepting the gate must not shift the step list under the user.
  const [steps] = useState<StepId[]>(() => {
    const all: StepId[] = ['gate', 'name', 'age', 'event', 'date', 'fears', 'character', 'values'];
    return gateOn ? all.filter((s) => s !== 'gate') : all;
  });
  const [i, setI] = useState(() => (prefill ? Math.max(0, steps.indexOf('event')) : 0));
  const step = steps[Math.min(i, steps.length - 1)];

  const [d, setD] = useState<Draft>(() => ({
    name: existing?.name ?? '', pronunciation: existing?.pronunciation ?? '', age: existing?.age, pronoun: existing?.pronoun,
    type: undefined, customLabel: '', date: '', fears: [], customFear: '',
    character: existing?.character ?? { animal: 'bunny', color: 'blue', accessory: 'cap' },
    values: existing?.values ?? { tone: 'secular', bodyWords: 'anatomical', family: [] },
    social: existing?.styleMode === 'social',
    photos: [],
  }));
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState(false);
  const [gateTick, setGateTick] = useState(false);

  const nameErr = !d.name ? 'Please enter a first name or nickname.' : !NAME_RE.test(d.name.trim()) ? 'One word, letters only (a hyphen or apostrophe is fine).' : '';
  const dateCheck = d.date ? validateEventDate(d.date, today) : null;
  const dateErr = !d.date ? 'Please pick the date.' : dateCheck === 'past' ? 'This date has passed. Pick today or a later day.' : dateCheck === 'too_far' ? 'Pick a date within the next 60 days.' : '';

  const valid: Record<StepId, boolean> = {
    gate: gateTick,
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
      if (getWorkspace() === 'real') void api.createFamily();
    }
    if (i < steps.length - 1) setI(i + 1);
    else finish();
  };
  const back = () => (i > 0 ? setI(i - 1) : router.push(existing ? '/home' : '/?landing=1'));

  const finish = () => {
    const childId = existing?.id ?? newId();
    const child: ChildProfile = {
      id: childId,
      name: d.name.trim(),
      pronunciation: d.pronunciation.trim() || undefined,
      age: d.age as ChildProfile['age'],
      pronoun: d.pronoun,
      character: d.character,
      values: d.values,
      styleMode: d.social && isOn('socialStyle') ? 'social' : 'story',
      techniques: existing?.techniques ?? [],
      badges: existing?.badges ?? [],
      createdOn: existing?.createdOn ?? today,
    };
    useChild.getState().setChild(child);
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
            <Field id="date" label="Date" error={touched ? dateErr : ''}>
              <TextInput id="date" type="date" min={today} max={addDays(today, 60)} value={d.date} onChange={(e) => set({ date: e.target.value })} aria-invalid={touched && !!dateErr} />
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
            <Segmented label="Tone" value={d.values.tone} options={[['secular', 'Secular'], ['religious', 'Religious']]} onChange={(tone) => set({ values: { ...d.values, tone } })} />
            <Segmented label="Words for the body" value={d.values.bodyWords} options={[['anatomical', 'Anatomical words'], ['family', 'Our family words']]} onChange={(bodyWords) => set({ values: { ...d.values, bodyWords } })} />
            <div>
              <p className="mb-1 text-sm font-bold">Who is at home?</p>
              <p className="mb-2 text-xs text-ink-soft">The story mentions only the people you pick. Nobody picked: it says &quot;your grown-up&quot;.</p>
              <div className="flex flex-wrap gap-2">
                {FAMILY_WORDS.map((w) => {
                  const on = d.values.family.includes(w);
                  return (
                    <Chip key={w} selected={on} onToggle={() => set({ values: { ...d.values, family: on ? d.values.family.filter((x) => x !== w) : [...d.values.family, w] } })}>{w}</Chip>
                  );
                })}
              </div>
            </div>
            {isOn('socialStyle') && (
              <Toggle id="social" label="Social story style" hint="Literal, first person, the same text every time. Helpful for many autistic kids." checked={d.social} onChange={(social) => set({ social })} />
            )}
            {isOn('placePhotos') && <PhotoPicker value={d.photos} onChange={(photos) => set({ photos })} />}
            <p className="text-xs text-ink-soft">All optional. You can change these later in Settings.</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 py-4">
        <Button size="l" onClick={next} aria-disabled={!valid[step]} className={!valid[step] ? 'opacity-60' : ''}>
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

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="mb-2 text-sm font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <Chip key={v} selected={value === v} onToggle={() => onChange(v)}>{l}</Chip>
        ))}
      </div>
    </div>
  );
}
