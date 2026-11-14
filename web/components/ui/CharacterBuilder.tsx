'use client';
import type { ReactNode } from 'react';
import { ACCESSORIES, ANIMALS, Character, CLOTHES } from '@/components/character';
import type { Accessory, Animal, Character as CharacterT, CharacterColor } from '@/lib/engine/types';
import { Chip } from './Chip';

const COLORS: CharacterColor[] = ['blue', 'green', 'yellow', 'red', 'purple', 'orange'];

/** Character builder with live preview (docs/SPEC.md 4.5 step 3): animal x colour x accessory. */
const ANIMAL_LABEL: Record<Animal, string> = { bunny: 'Bunny', bear: 'Bear', fox: 'Fox', kitten: 'Kitten' };
const ACC_LABEL: Record<Accessory, string> = { cap: 'Cap', scarf: 'Scarf', backpack: 'Backpack' };

export function CharacterBuilder({ value, onChange }: { value: CharacterT; onChange: (c: CharacterT) => void }): ReactNode {
  return (
    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
      <div className="mx-auto w-40 rounded-card bg-surface-2 p-3 sm:w-full" aria-live="polite">
        <Character character={value} mood="happy" />
      </div>
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Animal" className="flex flex-wrap gap-2">
          {ANIMALS.map((a) => (
            <Chip key={a} selected={value.animal === a} onToggle={() => onChange({ ...value, animal: a })}>{ANIMAL_LABEL[a]}</Chip>
          ))}
        </div>
        <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={value.color === c}
              aria-label={c}
              onClick={() => onChange({ ...value, color: c })}
              className={`size-tap rounded-pill border-4 ${value.color === c ? 'border-ink' : 'border-surface'}`}
              style={{ background: CLOTHES[c] }}
            />
          ))}
        </div>
        <div role="radiogroup" aria-label="Accessory" className="flex flex-wrap gap-2">
          {ACCESSORIES.map((a) => (
            <Chip key={a} selected={value.accessory === a} onToggle={() => onChange({ ...value, accessory: a })}>{ACC_LABEL[a]}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
