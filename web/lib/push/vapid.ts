/**
 * Web push without a payload (RFC 8030 + VAPID, RFC 8292), using only Node's crypto: the
 * server signs a short JWT and POSTs an empty message; the service worker then asks
 * /api/push/last what to show. No payload means no message encryption is needed, and no
 * third-party library. Server-only.
 */
import 'server-only';
import { createPrivateKey, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

const b64u = (b: Buffer) => b.toString('base64url');

export interface VapidKeys {
  /** Uncompressed P-256 public key, base64url (what the browser's applicationServerKey takes). */
  publicKey: string;
  /** Private scalar d, base64url. */
  privateKey: string;
}

export function generateVapidKeys(): VapidKeys {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const d = privateKey.export({ format: 'jwk' }).d!;
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, 'base64url'), Buffer.from(jwk.y!, 'base64url')]);
  return { publicKey: b64u(raw), privateKey: d };
}

function keyObject(keys: VapidKeys): KeyObject {
  const raw = Buffer.from(keys.publicKey, 'base64url');
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('VAPID_PUBLIC_KEY is not an uncompressed P-256 key');
  return createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', d: keys.privateKey, x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33)) },
  });
}

/** The Authorization header value for one push service origin. */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, subject: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const aud = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: nowSec + 12 * 3600, sub: subject })));
  const input = `${header}.${claims}`;
  const sig = sign('sha256', Buffer.from(input), { key: keyObject(keys), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${input}.${b64u(sig)}, k=${keys.publicKey}`;
}

export type PushResult = 'sent' | 'gone' | 'failed';

/** Sends an empty push. 'gone' = the subscription expired and should be deleted. */
export async function sendEmptyPush(endpoint: string, keys: VapidKeys, subject: string): Promise<PushResult> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: vapidAuthorization(endpoint, keys, subject), TTL: String(6 * 3600), Urgency: 'normal', 'Content-Length': '0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return 'gone';
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
