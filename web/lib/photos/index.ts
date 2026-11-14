/**
 * Photos of the real place (F16, docs/SPEC.md 11.5): up to 3 per event, resized in the browser
 * to 1280 px on the long side and kept only in IndexedDB (`bds-photos`). Never uploaded.
 */
import { del, get, set } from 'idb-keyval';
import type { PlacePhoto, Workspace } from '../engine/types';
import { photoStore } from '../storage/idb';

export const MAX_PHOTOS = 3;
export const MAX_SIDE = 1280;
export const MAX_CAPTION = 60;
export const FACES_WARNING = 'No faces, please';

export function photoKey(ws: Workspace, eventId: string, n: number): string {
  return `${ws}:${eventId}:${n}`;
}

export function clampCaption(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION);
}

/** Size after fitting the long side to `max`; never enlarges. */
export function fitWithin(w: number, h: number, max = MAX_SIDE): { width: number; height: number } {
  const long = Math.max(w, h);
  if (long <= max) return { width: w, height: h };
  const k = max / long;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** First free slot 0..MAX_PHOTOS-1, or null when the event already has 3. */
export function nextSlot(photos: readonly PlacePhoto[], ws: Workspace, eventId: string): number | null {
  const used = new Set(photos.map((p) => p.key));
  for (let n = 0; n < MAX_PHOTOS; n++) if (!used.has(photoKey(ws, eventId, n))) return n;
  return null;
}

/** Decodes (honouring EXIF rotation), scales to 1280 px and re-encodes as JPEG, which also drops EXIF/GPS. */
export async function resizePhoto(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bmp.width, bmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas_unavailable');
    ctx.drawImage(bmp, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode_failed'))), 'image/jpeg', 0.85),
    );
  } finally {
    bmp.close();
  }
}

/** Resizes and stores a picked file; returns the PlacePhoto to put into the event, or null when the event is full. */
export async function addPhoto(
  file: Blob, caption: string, ws: Workspace, eventId: string, existing: readonly PlacePhoto[],
): Promise<PlacePhoto | null> {
  const n = nextSlot(existing, ws, eventId);
  if (n === null) return null;
  const key = photoKey(ws, eventId, n);
  await set(key, await resizePhoto(file), photoStore());
  return { key, caption: clampCaption(caption) };
}

export function getPhoto(key: string): Promise<Blob | undefined> {
  return get<Blob>(key, photoStore());
}
export function removePhoto(key: string): Promise<void> {
  return del(key, photoStore());
}
