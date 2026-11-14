import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from '@/lib/backup';
import { buildSampleFamily } from '@/lib/engine/sample';
import { clampCaption, fitWithin, nextSlot, photoKey } from '@/lib/photos';
import { pickMimeType } from '@/lib/speech/recorder';
import { recordingKey } from '@/lib/speech/recordings';
import { bdsKeys } from '@/lib/storage/clear';
import { restoreUrl } from '@/components/settings/RestoreLink';

describe('photos', () => {
  it('fits the long side to 1280 without enlarging', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it('allows three slots per event and reuses freed ones', () => {
    const p = (n: number) => ({ key: photoKey('real', 'e1', n), caption: '' });
    expect(nextSlot([], 'real', 'e1')).toBe(0);
    expect(nextSlot([p(0), p(2)], 'real', 'e1')).toBe(1);
    expect(nextSlot([p(0), p(1), p(2)], 'real', 'e1')).toBeNull();
  });
  it('clamps captions to 60 characters', () => {
    expect(clampCaption('  a   b ')).toBe('a b');
    expect(clampCaption('x'.repeat(100))).toHaveLength(60);
  });
});

describe('recordings and device data', () => {
  it('builds the documented key', () => expect(recordingKey('sample', 'e', 2, 'p3')).toBe('sample:e:2:p3'));
  it('picks the first supported mime type', () => {
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBeUndefined();
  });
  it('lists only bds: keys', () => {
    const data = ['bds:child', 'other', 'bds:sample:events'];
    expect(bdsKeys({ length: data.length, key: (i) => data[i] ?? null })).toEqual(['bds:child', 'bds:sample:events']);
  });
  it('builds the restore url', () => expect(restoreUrl('https://x.app', 'abc')).toBe('https://x.app/restore#abc'));
});

describe('backup', () => {
  const doc = buildSampleFamily('2026-11-15');
  it('round-trips without photos', () => {
    const withPhoto = { ...doc, events: doc.events.map((e) => ({ ...e, photos: [{ key: 'k', caption: 'c' }] })) };
    const text = createBackup(withPhoto, new Date('2026-11-15T10:00:00Z'));
    expect(JSON.parse(text).events.every((e: { photos: unknown[] }) => e.photos.length === 0)).toBe(true);
    const r = parseBackup(text, 123);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.updatedAt).toBe(123);
      expect(r.doc.child?.name).toBe(doc.child?.name);
      expect(r.doc.events).toHaveLength(doc.events.length);
    }
  });
  it('rejects bad input', () => {
    expect(parseBackup('nope', 1)).toEqual({ ok: false, reason: 'not_json' });
    expect(parseBackup('{"a":1}', 1)).toEqual({ ok: false, reason: 'invalid' });
    expect(parseBackup(' '.repeat(600_000), 1)).toEqual({ ok: false, reason: 'too_big' });
    const newer = JSON.stringify({ schemaVersion: 99, exportedOn: 'x', child: null, events: [] });
    expect(parseBackup(newer, 1)).toEqual({ ok: false, reason: 'newer_version' });
  });
});
