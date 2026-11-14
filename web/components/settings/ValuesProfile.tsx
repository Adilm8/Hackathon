'use client';
import type { ValuesProfile as Values } from '@/lib/engine/types';
import { Segmented } from './Segmented';

export const FAMILY_CHIPS = [
  'Mom', 'Dad', 'Mama', 'Papa', 'Mommy', 'Daddy', 'Grandma', 'Grandpa', 'Nana', 'Stepmom', 'Stepdad', 'Aunt', 'Uncle',
] as const;

/** Values profile (docs/SPEC.md 4.15, onboarding step 3): tone, body words, who is at home. */
export function ValuesProfile({ value, onChange }: { value: Values; onChange: (v: Values) => void }) {
  const toggle = (chip: string) =>
    onChange({
      ...value,
      family: value.family.includes(chip) ? value.family.filter((c) => c !== chip) : [...value.family, chip],
    });
  return (
    <div className="grid gap-5">
      <Segmented
        label="Tone of the stories"
        value={value.tone}
        onChange={(tone) => onChange({ ...value, tone })}
        options={[
          { value: 'secular', label: 'Everyday', hint: 'No religious wording.' },
          { value: 'religious', label: 'Faith-friendly', hint: 'Gentle wording such as "we can say a little prayer".' },
        ]}
      />
      <Segmented
        label="Words for the body"
        value={value.bodyWords}
        onChange={(bodyWords) => onChange({ ...value, bodyWords })}
        options={[
          { value: 'anatomical', label: 'Real names', hint: 'Uses the proper names for body parts.' },
          { value: 'family', label: 'Our family words', hint: 'Soft, everyday words instead of clinical ones.' },
        ]}
      />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-bold text-ink mb-1">Who is at home</legend>
        <div className="flex flex-wrap gap-2">
          {FAMILY_CHIPS.map((chip) => {
            const on = value.family.includes(chip);
            return (
              <button
                key={chip} type="button" aria-pressed={on} onClick={() => toggle(chip)}
                className={`min-h-tap rounded-pill border-2 px-4 font-bold ${
                  on ? 'border-primary bg-surface-2 text-ink' : 'border-line bg-surface text-ink-soft'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-soft">Stories then name them. Choose none and they say &ldquo;your grown-up&rdquo;.</p>
      </fieldset>
    </div>
  );
}
