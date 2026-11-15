'use client';
/**
 * Small device preferences that are not part of the synced family (and not in the SPEC 6.1
 * Settings contract): sounds, easy-read letters, favourite chapters. `bds:prefs`, this browser
 * only; "Delete all data" removes it with the other bds keys.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jsonStorage } from './persist';

export interface Prefs {
  /** Soft chime when a chapter ends or a badge is earned. */
  sound: boolean;
  /** A highly legible font with wider letter and word spacing. */
  easyRead: boolean;
  /** Favourite chapters, "<eventId>#<chapter>". */
  favorites: string[];
  /** Bedtime routine steps the parent switched off. */
  routineOff: string[];
  /** Web push reminders switched on in this browser (lib/push/client.ts). */
  push: boolean;
  /** Reminder times, local "HH:MM". */
  reminderEvening: string;
  quietStart: string;
  quietEnd: string;
}

interface PrefsState extends Prefs {
  setSound(v: boolean): void;
  setEasyRead(v: boolean): void;
  toggleFavorite(eventId: string, chapter: number): void;
  toggleRoutineStep(id: string): void;
  setPush(v: boolean): void;
  setReminderTimes(t: Partial<Pick<Prefs, 'reminderEvening' | 'quietStart' | 'quietEnd'>>): void;
}

export const favKey = (eventId: string, chapter: number) => `${eventId}#${chapter}`;

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      sound: true,
      easyRead: false,
      favorites: [],
      routineOff: [],
      push: false,
      reminderEvening: '18:30',
      quietStart: '20:30',
      quietEnd: '07:30',
      setPush: (push) => set({ push }),
      setReminderTimes: (t) => set(t),
      toggleRoutineStep: (id) => set((s) => ({ routineOff: s.routineOff.includes(id) ? s.routineOff.filter((x) => x !== id) : [...s.routineOff, id] })),
      setSound: (sound) => set({ sound }),
      setEasyRead: (easyRead) => set({ easyRead }),
      toggleFavorite: (eventId, chapter) =>
        set((s) => {
          const k = favKey(eventId, chapter);
          return { favorites: s.favorites.includes(k) ? s.favorites.filter((f) => f !== k) : [k, ...s.favorites].slice(0, 200) };
        }),
    }),
    {
      name: 'bds:prefs',
      storage: jsonStorage,
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ sound: s.sound, easyRead: s.easyRead, favorites: s.favorites, routineOff: s.routineOff,
        push: s.push, reminderEvening: s.reminderEvening, quietStart: s.quietStart, quietEnd: s.quietEnd,
      }),
    },
  ),
);
