/** "Delete all data" on the device (docs/SPEC.md 4.15): every `bds:` key and both IndexedDB stores, both workspaces. */
import { clear } from 'idb-keyval';
import { photoStore, recordingStore } from './idb';

export function bdsKeys(storage: Pick<Storage, 'length' | 'key'>): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith('bds:')) keys.push(k);
  }
  return keys;
}

export async function clearDeviceData(): Promise<void> {
  for (const s of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      for (const k of bdsKeys(s)) s.removeItem(k);
    } catch {
      /* storage blocked: nothing to clear */
    }
  }
  await Promise.allSettled([clear(photoStore()), clear(recordingStore())]);
}
