'use client';
import { useId } from 'react';
import { Chip } from '@/components/ui/Chip';
import type { Settings } from '@/lib/engine/types';
import { PALETTES, type Mode, type PaletteId } from '@/lib/theme';

/**
 * Settings > Colours: one palette for the whole app, and when night colours turn on.
 * Each card previews its palette by carrying data-palette itself, so the swatches come from the
 * same CSS variables as the app (app/globals.css), never from copied hex values.
 */
export function PalettePicker({
  palette, nightMode, mode, onPalette, onNightMode,
}: {
  palette: PaletteId; nightMode: Settings['nightMode']; mode: Mode;
  onPalette: (p: PaletteId) => void; onNightMode: (m: Settings['nightMode']) => void;
}) {
  const name = useId();
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Colour palette</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PALETTES.map((p) => {
            const on = p.id === palette;
            return (
              <label
                key={p.id}
                data-palette={p.id}
                data-mode={mode}
                className={`flex cursor-pointer flex-col gap-2 rounded-card border-2 bg-bg p-3 text-ink shadow-step has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-focus ${on ? 'border-primary' : 'border-line'}`}
              >
                <input type="radio" name={name} className="sr-only" checked={on} onChange={() => onPalette(p.id)} />
                <span aria-hidden className="flex h-10 items-end gap-1.5 rounded-field bg-surface-2 p-2">
                  <span className="h-full flex-1 rounded-md bg-primary" />
                  <span className="h-3/4 flex-1 rounded-md bg-accent" />
                  <span className="h-1/2 flex-1 rounded-md bg-success" />
                  <span className="h-1/3 flex-1 rounded-md bg-surface ring-1 ring-line" />
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold">{p.label}</span>
                  {on && <span className="rounded-pill bg-primary px-2 text-xs font-extrabold text-primary-ink">On</span>}
                </span>
                <span className="text-xs text-ink-soft">{p.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div>
        <p className="mb-2 text-sm font-bold">Night colours</p>
        <div className="flex flex-wrap gap-2">
          {(['auto', 'on', 'off'] as const).map((m) => (
            <Chip key={m} selected={nightMode === m} onToggle={() => onNightMode(m)}>
              {m === 'auto' ? 'After 7 pm' : m === 'on' ? 'Always' : 'Never'}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">Night colours are softer for bedtime reading. They apply to every screen, with the palette you picked.</p>
      </div>
    </div>
  );
}
