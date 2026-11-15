/**
 * Feature switches for P1/P2 features (docs/SPEC.md 11.1).
 * A feature is switched on only when its acceptance criteria pass;
 * an unfinished feature is invisible, never a dead button.
 * The stream that finishes a feature flips its flag in the same commit.
 */
export const flags = {
  placePhotos: true,
  parentVoice: true,
  voiceQuestion: true,
  socialStyle: true,
  restoreLink: true,
  monthlyPlan: true,
  exportImport: true,
  /** Painted scene pictures (lib/illustrations); a Gold extra (SPEC 10.1, capability scenes.pictures). */
  illustratedScenes: true,
  /** Cartoon mode: the chapter as a narrated full-screen slideshow (components/reader/CartoonPlayer.tsx). */
  cartoonMode: true,
} as const;

export type FlagName = keyof typeof flags;

export function isOn(name: FlagName): boolean {
  return flags[name];
}
