// Prints a new pair of VAPID keys for web push reminders. Put them in .env.local / Railway
// variables (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY); never commit them.
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = publicKey.export({ format: 'jwk' });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
console.log(`VAPID_PUBLIC_KEY=${raw.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey.export({ format: 'jwk' }).d}`);
