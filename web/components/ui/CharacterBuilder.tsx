'use client';
import { useId, useState, type ReactNode } from 'react';
import { Character, CLOTHES } from '@/components/character';
import { layerSrc } from '@/components/character/Character';
import {
  ACCESSORIES,
  ACCESSORY_NAME,
  ANIMAL_NAME,
  ANIMALS,
  CHARACTER_SIZES,
  CHARACTER_COLORS,
  COLOR_NAME,
  COMPANION_NAME,
  COMPANIONS,
  FUR_NAME,
  FUR_VARIANTS,
  HEADWEAR,
  HEADWEAR_NAME,
  normalizeCharacter,
  OUTFIT_NAME,
  OUTFITS,
  resolveCharacter,
  SIZE_NAME,
  SIZE_SCALE,
  type ResolvedCharacter,
} from '@/lib/engine/character';
import type { Character as CharacterT } from '@/lib/engine/types';

/**
 * Story friend builder (docs/SPEC.md 4.5 step 3, docs/design/avatar-prompts.md):
 * species, fur, outfit colour, outfit, headwear, accessory and companion, with a live preview.
 * Old saved friends open with their values translated (accessory "cap" shows as the cap hat).
 */
type Tab = 'friend' | 'colours' | 'clothes' | 'hats' | 'extras' | 'buddy';
const TABS: { id: Tab; label: string }[] = [
  { id: 'friend', label: 'Friend' },
  { id: 'colours', label: 'Colours' },
  { id: 'clothes', label: 'Clothes' },
  { id: 'hats', label: 'Hats' },
  { id: 'extras', label: 'Extras' },
  { id: 'buddy', label: 'Buddy' },
];

const BACKDROP = layerSrc('backdrop', 'moon-meadow');

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function CharacterBuilder({ value, onChange }: { value: CharacterT; onChange: (c: CharacterT) => void }): ReactNode {
  const r = resolveCharacter(value);
  const [tab, setTab] = useState<Tab>('friend');
  const base = useId();
  const set = (patch: Partial<ResolvedCharacter>) => onChange(normalizeCharacter({ ...r, ...patch }));
  const surprise = () =>
    onChange(
      normalizeCharacter({
        animal: pick(ANIMALS),
        fur: pick(FUR_VARIANTS),
        color: pick(CHARACTER_COLORS),
        outfit: pick(OUTFITS),
        headwear: pick(HEADWEAR),
        accessory: pick(ACCESSORIES),
        companion: pick(COMPANIONS),
        size: r.size,
      }),
    );

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(150px,200px)_1fr] sm:items-start">
      <div className="mx-auto flex w-40 flex-col items-center gap-2 sm:sticky sm:top-4 sm:w-full">
        <div
          className="relative w-full overflow-hidden rounded-card border-2 border-line bg-surface-2"
          style={{ aspectRatio: '4 / 5' }}
          aria-live="polite"
        >
          {BACKDROP && (
            // eslint-disable-next-line @next/next/no-img-element -- small static WebP behind the preview
            <img src={BACKDROP} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} loading="lazy" />
          )}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 transition-[height] duration-base" style={{ height: `${SIZE_SCALE[r.size] * 100}%` }}>
            <Character character={value} mood="happy" className="h-full w-auto" />
          </div>
        </div>
        <p className="text-center text-sm font-bold">{ANIMAL_NAME[r.animal]}</p>
        <div role="radiogroup" aria-label="Size in the story" className="flex gap-1 rounded-pill bg-surface-2 p-1">
          {CHARACTER_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={r.size === s}
              aria-label={`${SIZE_NAME[s]} in the story`}
              title={SIZE_NAME[s]}
              onClick={() => set({ size: s })}
              className={`min-h-tap min-w-tap rounded-pill px-3 text-sm font-extrabold ${r.size === s ? 'bg-primary text-primary-ink' : 'hover:bg-line'}`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={surprise}
          className="min-h-tap rounded-pill border-2 border-line bg-surface px-4 text-sm font-bold hover:border-ink-soft/40"
        >
          Surprise me
        </button>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div role="tablist" aria-label="Story friend parts" className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${base}-panel`}
              onClick={() => setTab(t.id)}
              className={`min-h-tap shrink-0 rounded-pill px-4 text-sm font-bold transition-colors duration-fast ${
                tab === t.id ? 'bg-primary text-primary-ink' : 'bg-surface-2 hover:bg-line'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab}`} className="flex flex-col gap-4">
          {tab === 'friend' && (
            <Tiles label="Friend" items={ANIMALS} selected={r.animal} name={(a) => ANIMAL_NAME[a]}
              preview={(a) => ({ ...r, animal: a })} onPick={(animal) => set({ animal })} />
          )}
          {tab === 'colours' && (
            <>
              <Tiles label="Fur" items={FUR_VARIANTS} selected={r.fur} name={(f) => FUR_NAME[f]} framing="head"
                preview={(fur) => ({ ...r, fur })} onPick={(fur) => set({ fur })} />
              <div>
                <p className="mb-2 text-sm font-bold">Clothes colour</p>
                <div role="radiogroup" aria-label="Clothes colour" className="flex flex-wrap gap-2">
                  {CHARACTER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={r.color === c}
                      aria-label={COLOR_NAME[c]}
                      onClick={() => set({ color: c })}
                      className={`size-tap rounded-pill border-4 ${r.color === c ? 'border-ink' : 'border-surface'}`}
                      style={{ background: CLOTHES[c] }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === 'clothes' && (
            <Tiles label="Clothes" items={OUTFITS} selected={r.outfit} name={(o) => OUTFIT_NAME[o]}
              preview={(outfit) => ({ ...r, outfit, accessory: 'none', companion: 'none' })} onPick={(outfit) => set({ outfit })} />
          )}
          {tab === 'hats' && (
            <Tiles label="Hats" items={HEADWEAR} selected={r.headwear} name={(h) => HEADWEAR_NAME[h]} framing="head"
              preview={(headwear) => ({ ...r, headwear })} onPick={(headwear) => set({ headwear })} />
          )}
          {tab === 'extras' && (
            <Tiles label="Extras" items={ACCESSORIES} selected={r.accessory} name={(a) => ACCESSORY_NAME[a]}
              preview={(accessory) => ({ ...r, accessory, companion: 'none' })} onPick={(accessory) => set({ accessory })} />
          )}
          {tab === 'buddy' && (
            <Tiles label="Buddy" items={COMPANIONS} selected={r.companion} name={(c) => COMPANION_NAME[c]}
              preview={(companion) => ({ ...r, companion })} onPick={(companion) => set({ companion })} />
          )}
        </div>
      </div>
    </div>
  );
}

function Tiles<T extends string>({
  label, items, selected, name, preview, onPick, framing = 'full',
}: {
  label: string;
  items: readonly T[];
  selected: T;
  name: (v: T) => string;
  preview: (v: T) => CharacterT;
  onPick: (v: T) => void;
  framing?: 'full' | 'head';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={selected === v}
          onClick={() => onPick(v)}
          className={`flex flex-col items-center gap-1 rounded-card border-2 p-1.5 text-xs font-bold transition-colors duration-fast ${
            selected === v ? 'border-primary bg-primary/10' : 'border-line bg-surface hover:border-ink-soft/40'
          }`}
        >
          <Character character={preview(v)} mood="happy" framing={framing} className="w-full" decorative />
          <span className="leading-tight">{name(v)}</span>
        </button>
      ))}
    </div>
  );
}
