'use client';
import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Field, TextInput } from '@/components/ui/Field';
import { Segmented } from '@/components/settings/Segmented';
import {
  AFTER_IDEAS, COMFORT_OPTIONS, EXPERIENCE_OPTIONS, INTEREST_OPTIONS, LENGTH_OPTIONS,
  MAX_AVOID_WORDS, MAX_COMPANIONS, MAX_INTERESTS, MAX_MOMENTS,
} from '@/lib/engine/storyPrefs';
import type { ComfortKind, EventTemplate, StoryPrefs } from '@/lib/engine/types';

/**
 * Parent's story options for one event (docs/story-customization.md): length, evenings, moments,
 * who comes along, comfort object, favourite things, been before, something nice after, words to avoid.
 * Everything is optional; the genre has its own step (GenrePicker).
 */
export function StoryOptions({
  value, onChange, template, maxEvenings, family, canChangeEvenings = true,
}: {
  value: StoryPrefs;
  onChange: (v: StoryPrefs) => void;
  template: EventTemplate;
  /** Most evenings the date allows (1-5). */
  maxEvenings: number;
  /** Family chips from the values profile, offered for "who comes along". */
  family: string[];
  canChangeEvenings?: boolean;
}) {
  const set = (patch: Partial<StoryPrefs>) => onChange({ ...value, ...patch });
  const toggleIn = <T,>(list: T[] | undefined, x: T, max: number): T[] => {
    const l = list ?? [];
    return l.includes(x) ? l.filter((y) => y !== x) : l.length < max ? [...l, x] : l;
  };
  const skip = value.skipSteps ?? [];
  const chosenSteps = template.steps.length - skip.length;
  const moments = value.moments ?? [];
  const avoid = value.avoidWords ?? [];
  const people = family.length ? family : ['Mom', 'Dad', 'Grandma', 'Grandpa'];

  return (
    <div className="flex flex-col gap-6">
      <Segmented
        label="Chapter length"
        value={value.length ?? 'standard'}
        onChange={(length) => set({ length })}
        options={LENGTH_OPTIONS.map((o) => ({ value: o.id, label: o.label, hint: o.hint }))}
      />

      {maxEvenings > 1 && (
        <fieldset className="grid gap-2" disabled={!canChangeEvenings}>
          <legend className="mb-1 text-sm font-bold text-ink">Evenings before the big day</legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={!value.chapters} onToggle={canChangeEvenings ? () => set({ chapters: undefined }) : undefined}>Every evening ({maxEvenings})</Chip>
            {Array.from({ length: maxEvenings - 1 }, (_, i) => i + 1).map((n) => (
              <Chip key={n} selected={value.chapters === n} onToggle={canChangeEvenings ? () => set({ chapters: n }) : undefined}>
                {n} {n === 1 ? 'evening' : 'evenings'}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-ink-soft">
            {canChangeEvenings ? 'Fewer evenings put more into each chapter.' : 'The plan has started, so the number of evenings stays as it is.'}
          </p>
        </fieldset>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">What will happen</legend>
        <p className="-mt-1 text-xs text-ink-soft">Turn off anything that will not happen this time. The story then leaves it out.</p>
        <div className="flex flex-col gap-2">
          {template.steps.map((step) => {
            const on = !skip.includes(step);
            const locked = on && chosenSteps <= 2;
            return (
              <label key={step} className={`flex min-h-tap items-center gap-3 rounded-card border-2 bg-surface px-3 py-2 text-sm ${on ? 'border-primary/50' : 'border-line text-ink-soft line-through'}`}>
                <input
                  type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={on} disabled={locked}
                  onChange={() => set({ skipSteps: on ? [...skip, step] : skip.filter((s) => s !== step) })}
                />
                <span>{step}</span>
              </label>
            );
          })}
        </div>
        <OwnList
          id="moment" label={`Add your own moment (up to ${MAX_MOMENTS})`} placeholder="e.g. We ride the bus there" max={MAX_MOMENTS} maxLength={60}
          items={moments} onChange={(m) => set({ moments: m })}
        />
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Who comes along</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <Chip key={p} selected={(value.companions ?? []).includes(p)} onToggle={() => set({ companions: toggleIn(value.companions, p, MAX_COMPANIONS) })}>{p}</Chip>
          ))}
        </div>
        <p className="text-xs text-ink-soft">Up to {MAX_COMPANIONS}. None chosen: the story says &ldquo;your grown-up&rdquo;.</p>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Comfort object</legend>
        <div className="flex flex-wrap gap-2">
          <Chip selected={!value.comfort} onToggle={() => set({ comfort: undefined })}>None</Chip>
          {COMFORT_OPTIONS.map((c) => (
            <Chip key={c.id} selected={value.comfort?.kind === c.id} onToggle={() => set({ comfort: { kind: c.id as ComfortKind, nickname: value.comfort?.nickname } })}>{c.label}</Chip>
          ))}
        </div>
        {value.comfort && (
          <Field id="comfort-name" label="Its name (optional)">
            <TextInput
              id="comfort-name" maxLength={24} placeholder="e.g. Mr. Floppy" value={value.comfort.nickname ?? ''}
              onChange={(e) => set({ comfort: { kind: value.comfort!.kind, nickname: e.target.value || undefined } })}
            />
          </Field>
        )}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Favorite things</legend>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((i) => (
            <Chip key={i.id} selected={(value.interests ?? []).includes(i.id)} onToggle={() => set({ interests: toggleIn(value.interests, i.id, MAX_INTERESTS) })}>{i.label}</Chip>
          ))}
        </div>
        <p className="text-xs text-ink-soft">Up to {MAX_INTERESTS}. The story uses small details from them.</p>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Has your child done this before?</legend>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_OPTIONS.map((e) => (
            <Chip key={e.id} selected={value.experience === e.id} onToggle={() => set({ experience: value.experience === e.id ? undefined : e.id })}>{e.label}</Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold text-ink">Something nice after</legend>
        <div className="flex flex-wrap gap-2">
          {AFTER_IDEAS.map((a) => (
            <Chip key={a} selected={value.after === a} onToggle={() => set({ after: value.after === a ? undefined : a })}>{a}</Chip>
          ))}
        </div>
        <Field id="after" label="Or write your own (optional)">
          <TextInput id="after" maxLength={60} value={value.after ?? ''} onChange={(e) => set({ after: e.target.value || undefined })} />
        </Field>
        <p className="text-xs text-ink-soft">The last chapter looks forward to it. It is never a reward for &ldquo;being good&rdquo;.</p>
      </fieldset>

      <OwnList
        id="avoid" label="Words to avoid (optional)" placeholder="e.g. needle" max={MAX_AVOID_WORDS} maxLength={24}
        items={avoid} onChange={(w) => set({ avoidWords: w })}
        hint="Words that upset your child. The story uses gentler words instead."
      />
    </div>
  );
}

/** A short list of the parent's own words: type, Add, remove. */
function OwnList({
  id, label, placeholder, max, maxLength, items, onChange, hint,
}: {
  id: string; label: string; placeholder: string; max: number; maxLength: number;
  items: string[]; onChange: (items: string[]) => void; hint?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.replace(/\s+/g, ' ').trim();
    if (!t || items.length >= max || items.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...items, t.slice(0, maxLength)]);
    setDraft('');
  };
  return (
    <div className="grid gap-2">
      <Field id={id} label={label} helper={hint}>
        <div className="flex gap-2">
          <TextInput
            id={id} maxLength={maxLength} placeholder={placeholder} value={draft} disabled={items.length >= max}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <button type="button" onClick={add} disabled={!draft.trim() || items.length >= max} className="min-h-tap shrink-0 rounded-pill border-2 border-line bg-surface px-4 text-sm font-bold disabled:opacity-50">
            Add
          </button>
        </div>
      </Field>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {items.map((x) => (
            <li key={x}>
              <button type="button" onClick={() => onChange(items.filter((y) => y !== x))} className="inline-flex min-h-tap items-center gap-1 rounded-pill border-2 border-primary bg-surface-2 px-4 text-sm font-bold" aria-label={`Remove ${x}`}>
                {x} <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
