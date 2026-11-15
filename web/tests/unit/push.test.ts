import { createPublicKey, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { pickDue, STALE_MS } from '@/lib/db/push';
import { generateVapidKeys, vapidAuthorization } from '@/lib/push/vapid';
import type { Reminder } from '@/lib/push/reminders';

const r = (id: string, at: number, sent?: boolean) => ({ id, kind: 'chapter' as const, at, title: 't', body: 'b', url: '/home', sent } satisfies Reminder & { sent?: boolean });

describe('push delivery rule', () => {
  const now = 1_800_000_000_000;
  it('sends the newest due reminder once and marks every due one sent', () => {
    const list = [r('a', now - 60_000), r('b', now - 1000), r('c', now + 60_000)];
    const { send, next } = pickDue(list, now);
    expect(send?.id).toBe('b');
    expect(next.map((x) => !!x.sent)).toEqual([true, true, false]);
    expect(pickDue(next, now).send).toBeNull();
  });

  it('drops stale reminders without sending them', () => {
    const { send, next } = pickDue([r('old', now - STALE_MS - 1)], now);
    expect(send).toBeNull();
    expect(next[0].sent).toBe(true);
  });
});

describe('VAPID', () => {
  it('signs an ES256 JWT the public key verifies, for the push service origin', () => {
    const keys = generateVapidKeys();
    const h = vapidAuthorization('https://push.example.net/send/abc', keys, 'https://app.test', 1_000);
    const m = /^vapid t=([^,]+), k=(.+)$/.exec(h)!;
    expect(m[2]).toBe(keys.publicKey);
    const [head, claims, sig] = m[1].split('.');
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toMatchObject({ aud: 'https://push.example.net', sub: 'https://app.test', exp: 1_000 + 43_200 });
    const raw = Buffer.from(keys.publicKey, 'base64url');
    const pub = createPublicKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', x: raw.subarray(1, 33).toString('base64url'), y: raw.subarray(33).toString('base64url') } });
    expect(verify('sha256', Buffer.from(`${head}.${claims}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'))).toBe(true);
  });
});
