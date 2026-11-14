/** Two IndexedDB databases through idb-keyval (docs/SPEC.md 6.2). Browser only. */
import { createStore, type UseStore } from 'idb-keyval';

let photos: UseStore | null = null;
let recordings: UseStore | null = null;

export const PHOTOS_DB = 'bds-photos';
export const RECORDINGS_DB = 'bds-recordings';

export function photoStore(): UseStore {
  return (photos ??= createStore(PHOTOS_DB, 'blobs'));
}
export function recordingStore(): UseStore {
  return (recordings ??= createStore(RECORDINGS_DB, 'blobs'));
}
