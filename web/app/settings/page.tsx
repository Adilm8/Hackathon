'use client';
import { Screen } from '@/components/ui/Screen';
import { SettingsView } from './SettingsView';

/** Settings (docs/SPEC.md 4.15), the dark parent room. */
export default function SettingsPage() {
  return <Screen room="parent">{() => <SettingsView />}</Screen>;
}
