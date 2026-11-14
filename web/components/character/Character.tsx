import type { ReactElement } from 'react';
import type { Accessory, Animal, Character as CharacterSpec, Mood } from '@/lib/engine/types';
import { ANIMAL_LABEL, CLOTHES, COLOR_LABEL, FUR, INK, mix } from './palette';

/**
 * The guide character: one SVG built from parts (SPEC 11.4).
 * animal (ears, tail, muzzle) x colour (clothes, accessory) x accessory x mood
 * (eyes, brows, mouth, arm pose). The same drawing is used in the builder, the reader,
 * the day card, the badge and the PDF. Original artwork, simple flat vector shapes.
 */
export const MOODS: Mood[] = ['calm', 'worried', 'brave', 'happy'];
export const ANIMALS: Animal[] = ['bunny', 'bear', 'fox', 'kitten'];
export const ACCESSORIES: Accessory[] = ['cap', 'scarf', 'backpack'];

const VIEW = { w: 240, h: 300 };

export interface CharacterProps {
  character: CharacterSpec;
  mood?: Mood;
  /** Width in px; the height follows the 4:5 drawing. Omit to fill the parent's width. */
  size?: number;
  className?: string;
  /** True when the picture only decorates (nearby text already says it). */
  decorative?: boolean;
}

export function characterAlt(character: CharacterSpec, mood: Mood = 'calm'): string {
  const feel = { calm: 'calm', worried: 'a little worried', brave: 'brave', happy: 'happy' }[mood];
  const acc = { cap: 'a cap', scarf: 'a scarf', backpack: 'a backpack' }[character.accessory];
  return `A ${feel} ${ANIMAL_LABEL[character.animal]} in ${COLOR_LABEL[character.color]} clothes with ${acc}`;
}

export function Character({ character, mood = 'calm', size, className, decorative }: CharacterProps) {
  const fur = FUR[character.animal];
  const main = CLOTHES[character.color];
  const dark = mix(main, INK, 0.3);
  const edge = mix(fur.fur, INK, 0.28);
  const t = { fur, main, dark, edge };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      width={size}
      height={size ? Math.round((size * VIEW.h) / VIEW.w) : undefined}
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : characterAlt(character, mood)}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      data-animal={character.animal}
      data-mood={mood}
    >
      {tail(character.animal, t)}
      {character.accessory === 'backpack' && <Pack dark={dark} />}
      {ears(character.animal, t)}
      <Feet t={t} />
      <Body t={t} />
      {character.accessory === 'backpack' && <Straps dark={dark} />}
      <Arms mood={mood} t={t} />
      <Head animal={character.animal} mood={mood} t={t} />
      {character.accessory === 'scarf' && <Scarf main={main} dark={dark} />}
      {character.accessory === 'cap' && <Cap main={main} dark={dark} />}
    </svg>
  );
}

export default Character;

interface Theme {
  fur: (typeof FUR)[Animal];
  main: string;
  dark: string;
  edge: string;
}

const SW = 2.5;

function tail(animal: Animal, t: Theme): ReactElement {
  switch (animal) {
    case 'bunny':
      return <circle cx="176" cy="238" r="15" fill="#fff" stroke={t.edge} strokeWidth={SW} />;
    case 'bear':
      return <circle cx="172" cy="240" r="11" fill={t.fur.fur} stroke={t.edge} strokeWidth={SW} />;
    case 'fox':
      return (
        <g>
          <path d="M160 246 C196 252 216 220 206 190 C196 212 184 222 160 224 Z" fill={t.fur.fur} stroke={t.edge} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M206 190 C201 200 197 206 192 211 C202 214 210 204 206 190 Z" fill="#fff7ec" />
        </g>
      );
    case 'kitten':
      return <path d="M160 246 C196 252 210 226 200 196" fill="none" stroke={t.fur.fur} strokeWidth="14" strokeLinecap="round" />;
  }
}

function ears(animal: Animal, t: Theme): ReactElement {
  const s = { stroke: t.edge, strokeWidth: SW, strokeLinejoin: 'round' as const };
  switch (animal) {
    case 'bunny':
      return (
        <g>
          <g transform="rotate(-10 92 60)">
            <ellipse cx="92" cy="50" rx="17" ry="46" fill={t.fur.fur} {...s} />
            <ellipse cx="92" cy="54" rx="8" ry="32" fill={t.fur.inner} />
          </g>
          <g transform="rotate(10 148 60)">
            <ellipse cx="148" cy="50" rx="17" ry="46" fill={t.fur.fur} {...s} />
            <ellipse cx="148" cy="54" rx="8" ry="32" fill={t.fur.inner} />
          </g>
        </g>
      );
    case 'bear':
      return (
        <g>
          {[70, 170].map((x) => (
            <g key={x}>
              <circle cx={x} cy="76" r="21" fill={t.fur.fur} {...s} />
              <circle cx={x} cy="77" r="11" fill={t.fur.inner} />
            </g>
          ))}
        </g>
      );
    case 'fox':
      return (
        <g>
          <path d="M62 104 L66 42 L108 78 Z" fill={t.fur.fur} {...s} />
          <path d="M72 94 L73 58 L96 80 Z" fill="#3a2e2e" />
          <path d="M178 104 L174 42 L132 78 Z" fill={t.fur.fur} {...s} />
          <path d="M168 94 L167 58 L144 80 Z" fill="#3a2e2e" />
        </g>
      );
    case 'kitten':
      return (
        <g>
          <path d="M60 106 L64 52 L106 80 Z" fill={t.fur.fur} {...s} />
          <path d="M70 98 L71 66 L94 82 Z" fill={t.fur.inner} />
          <path d="M180 106 L176 52 L134 80 Z" fill={t.fur.fur} {...s} />
          <path d="M170 98 L169 66 L146 82 Z" fill={t.fur.inner} />
        </g>
      );
  }
}

function Feet({ t }: { t: Theme }) {
  return (
    <g fill={t.fur.fur} stroke={t.edge} strokeWidth={SW}>
      <ellipse cx="96" cy="272" rx="23" ry="13" />
      <ellipse cx="144" cy="272" rx="23" ry="13" />
    </g>
  );
}

function Body({ t }: { t: Theme }) {
  return (
    <g>
      <ellipse cx="120" cy="172" rx="26" ry="12" fill={t.fur.fur} />
      <path
        d="M78 182 Q78 168 94 166 L146 166 Q162 168 162 182 L166 246 Q166 262 150 262 L90 262 Q74 262 74 246 Z"
        fill={t.main}
      />
      <path d="M75 226 L165 226 L166 238 L74 238 Z" fill={t.dark} opacity="0.22" />
    </g>
  );
}

function Pack({ dark }: { dark: string }) {
  return (
    <g>
      <path d="M100 176 Q120 156 140 176" fill="none" stroke={dark} strokeWidth="6" strokeLinecap="round" />
      <rect x="56" y="172" width="128" height="84" rx="22" fill={dark} />
      <rect x="150" y="214" width="28" height="30" rx="8" fill="#fff" opacity="0.22" />
    </g>
  );
}

function Straps({ dark }: { dark: string }) {
  return (
    <g stroke={dark} strokeWidth="9" strokeLinecap="round">
      <line x1="94" y1="170" x2="92" y2="238" />
      <line x1="146" y1="170" x2="148" y2="238" />
    </g>
  );
}

interface Pose {
  l: string;
  r: string;
  hl: [number, number];
  hr: [number, number];
}

const POSES: Record<Mood, Pose> = {
  calm: { l: 'M86 186 Q66 210 68 238', r: 'M154 186 Q174 210 172 238', hl: [68, 242], hr: [172, 242] },
  worried: { l: 'M86 186 Q80 214 112 220', r: 'M154 186 Q160 214 128 220', hl: [114, 220], hr: [126, 220] },
  brave: { l: 'M86 186 Q54 200 78 230', r: 'M154 186 Q184 170 186 142', hl: [80, 232], hr: [186, 134] },
  happy: { l: 'M86 184 Q52 170 46 132', r: 'M154 184 Q188 170 194 132', hl: [45, 124], hr: [195, 124] },
};

function Arms({ mood, t }: { mood: Mood; t: Theme }) {
  const p = POSES[mood];
  return (
    <g>
      {[p.l, p.r].map((d) => (
        <path key={d} d={d} fill="none" stroke={t.main} strokeWidth="25" strokeLinecap="round" />
      ))}
      {[p.hl, p.hr].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="12.5" fill={t.fur.fur} stroke={t.edge} strokeWidth={SW} />
      ))}
    </g>
  );
}

function Head({ animal, mood, t }: { animal: Animal; mood: Mood; t: Theme }) {
  return (
    <g>
      <ellipse cx="120" cy="124" rx="64" ry="58" fill={t.fur.fur} stroke={t.edge} strokeWidth={SW} />
      {animal === 'fox' && (
        <g fill={t.fur.muzzle}>
          <ellipse cx="92" cy="146" rx="32" ry="22" />
          <ellipse cx="148" cy="146" rx="32" ry="22" />
          <ellipse cx="120" cy="150" rx="22" ry="18" />
        </g>
      )}
      {animal === 'kitten' && (
        <g stroke={t.edge} strokeWidth="3" strokeLinecap="round" opacity="0.8">
          <line x1="120" y1="72" x2="120" y2="84" />
          <line x1="106" y1="74" x2="108" y2="84" />
          <line x1="134" y1="74" x2="132" y2="84" />
        </g>
      )}
      {animal !== 'fox' && <ellipse cx="120" cy="146" rx={animal === 'kitten' ? 21 : 27} ry={animal === 'kitten' ? 15 : 20} fill={t.fur.muzzle} />}
      <g fill="#f4a0b0" opacity="0.5">
        <ellipse cx="80" cy="140" rx="9" ry="6" />
        <ellipse cx="160" cy="140" rx="9" ry="6" />
      </g>
      {animal === 'kitten' && (
        <g stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35">
          {[-4, 4].map((dy) => (
            <g key={dy}>
              <line x1="86" y1={150 + dy} x2="60" y2={148 + dy * 2} />
              <line x1="154" y1={150 + dy} x2="180" y2={148 + dy * 2} />
            </g>
          ))}
        </g>
      )}
      <Face mood={mood} t={t} />
    </g>
  );
}

function Face({ mood, t }: { mood: Mood; t: Theme }) {
  const brow = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };
  const eyeY = 120;
  return (
    <g>
      {mood === 'happy' ? (
        <g {...brow}>
          <path d={`M86 ${eyeY + 4} Q96 ${eyeY - 10} 106 ${eyeY + 4}`} />
          <path d={`M134 ${eyeY + 4} Q144 ${eyeY - 10} 154 ${eyeY + 4}`} />
        </g>
      ) : (
        <g>
          {[96, 144].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={eyeY} rx="7" ry={mood === 'worried' ? 9.5 : 8.5} fill={INK} />
              <circle cx={x - 2.2} cy={eyeY - 3.2} r="2.6" fill="#fff" />
            </g>
          ))}
        </g>
      )}
      {mood === 'calm' && (
        <g {...brow} strokeWidth="3" opacity="0.8">
          <path d="M86 104 Q96 99 106 103" />
          <path d="M134 103 Q144 99 154 104" />
        </g>
      )}
      {mood === 'worried' && (
        <g {...brow}>
          <path d="M85 106 L107 97" />
          <path d="M155 106 L133 97" />
        </g>
      )}
      {mood === 'brave' && (
        <g {...brow}>
          <path d="M85 98 L107 105" />
          <path d="M155 98 L133 105" />
        </g>
      )}
      <ellipse cx="120" cy="135" rx="8" ry="5.5" fill={t.fur.nose} />
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {mood === 'calm' && <path d="M120 141 L120 146 M108 148 Q120 158 132 148" />}
        {mood === 'worried' && <path d="M120 141 L120 148 M108 156 Q114 149 120 155 Q126 161 132 154" />}
        {mood === 'brave' && <path d="M120 141 L120 146 M104 147 Q120 164 136 147" />}
      </g>
      {mood === 'happy' && (
        <g>
          <path d="M120 141 L120 145" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M101 145 Q120 176 139 145 Z" fill={INK} strokeLinejoin="round" stroke={INK} strokeWidth="3" />
          <path d="M110 160 Q120 150 130 160 Q120 168 110 160 Z" fill="#f4788c" />
        </g>
      )}
    </g>
  );
}

function Scarf({ main, dark }: { main: string; dark: string }) {
  return (
    <g>
      <path d="M80 172 Q120 196 160 172 L162 190 Q120 212 78 190 Z" fill={main} />
      <path d="M94 190 L112 206 L110 244 Q96 248 90 240 Z" fill={main} />
      <path d="M92 232 L111 236 M92 222 L111 226" stroke={dark} strokeWidth="3" opacity="0.5" />
      <path d="M92 188 Q120 202 150 186" stroke={dark} strokeWidth="3" fill="none" opacity="0.35" />
    </g>
  );
}

function Cap({ main, dark }: { main: string; dark: string }) {
  return (
    <g>
      <path d="M62 86 Q62 46 120 44 Q178 46 178 86 Z" fill={main} />
      <path d="M120 46 Q104 64 104 86 M120 46 Q136 64 136 86" fill="none" stroke={dark} strokeWidth="2.5" opacity="0.4" />
      <ellipse cx="120" cy="86" rx="68" ry="9" fill={dark} />
      <circle cx="120" cy="45" r="5.5" fill={dark} />
    </g>
  );
}
