/** Parent's recordings (F17) in IndexedDB `bds-recordings`, one take per page. Never uploaded. */
import { del, delMany, get, keys, set } from 'idb-keyval';
import type { Workspace } from '../engine/types';
import { recordingStore } from '../storage/idb';

export function recordingKey(ws: Workspace, eventId: string, chapter: number, pageId: string): string {
  return `${ws}:${eventId}:${chapter}:${pageId}`;
}
export const getRecording = (key: string) => get<Blob>(key, recordingStore());
export const saveRecording = (key: string, blob: Blob) => set(key, blob, recordingStore());
export const deleteRecording = (key: string) => del(key, recordingStore());

/** A page rewritten after a question loses its recording (SPEC 11.6). */
export const hasRecording = async (key: string) => (await getRecording(key)) !== undefined;

export async function listRecordingKeys(prefix = ''): Promise<string[]> {
  return (await keys<string>(recordingStore())).filter((k) => typeof k === 'string' && k.startsWith(prefix));
}
export async function deleteRecordings(prefix: string): Promise<number> {
  const ks = await listRecordingKeys(prefix);
  await delMany(ks, recordingStore());
  return ks.length;
}
