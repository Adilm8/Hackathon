'use client';
/** Device preferences, `bds:settings` (docs/SPEC.md 6.1 Settings, 6.2). Not synced. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clock } from '@/lib/engine/clock';
import type { ISODate, Settings } from '@/lib/engine/types';
import { jsonStorage } from './persist';
import { storeKey } from './workspace';

export const SETTINGS_VERSION = 1;

const initial: Settings = { textSize: 'm', nightMode: 'auto', schemaVersion: SETTINGS_VERSION };

interface SettingsState extends Settings {
  acceptParentGate(today: ISODate): void;
  setClockOverride(d: ISODate | undefined): void;
  setTextSize(s: Settings['textSize']): void;
  setNightMode(m: Settings['nightMode']): void;
  setPalette(p: NonNullable<Settings['palette']>): void;
  setVoiceConsent(on: ISODate | undefined): void;
  reset(): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...initial,
      acceptParentGate: (today) => set({ parentGateAcceptedOn: today }),
      setClockOverride: (d) => set({ clockOverride: d }),
      setTextSize: (textSize) => set({ textSize }),
      setNightMode: (nightMode) => set({ nightMode }),
      setPalette: (palette) => set({ palette }),
      setVoiceConsent: (voiceQuestionConsentOn) => set({ voiceQuestionConsentOn }),
      reset: () => set({ ...initial, palette: undefined, parentGateAcceptedOn: undefined, clockOverride: undefined, voiceQuestionConsentOn: undefined }),
    }),
    {
      name: typeof window === 'undefined' ? 'bds:settings' : storeKey('settings'),
      storage: jsonStorage,
      version: SETTINGS_VERSION,
      skipHydration: true,
      migrate: () => initial,
      partialize: (s) => ({
        parentGateAcceptedOn: s.parentGateAcceptedOn,
        clockOverride: s.clockOverride,
        textSize: s.textSize,
        nightMode: s.nightMode,
        palette: s.palette,
        voiceQuestionConsentOn: s.voiceQuestionConsentOn,
        schemaVersion: s.schemaVersion,
      }),
    },
  ),
);

// The clock reads the Demo override from this store once it exists.
clock.setOverrideSource(() => useSettings.getState().clockOverride ?? undefined);
