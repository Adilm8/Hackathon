import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { closeDb } from '@/lib/db/client';
import { listEntitlements, grantPaidAccess, grantEventAccessCheck } from './helpers';
import { resetRateLimits } from '@/lib/server/ratelimit';
import { POST as familyPost, DELETE as familyDelete } from '@/app/api/family/route';
import { GET as stateGet, PUT as statePut } from '@/app/api/state/route';
import { POST as samplePost } from '@/app/api/sample/route';
import { POST as restorePost } from '@/app/api/restore/route';
import { POST as codePost } from '@/app/api/restore/code/route';
import { FAMILY_DOC_SCHEMA_VERSION } from '@/lib/engine/schemas';
import { decodeSession, encodeSession } from '@/lib/server/session';
import { grantDemoAccess, resetSampleAccess } from '@/lib/db/entitlements';
import { purgeStaleFamilies } from '@/lib/db/families';
import { getDb } from '@/lib/db/client';
import { families } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { FamilyDoc } from '@/lib/engine/types';

afterAll(closeDb);
beforeEach(resetRateLimits);

function req(url: string, init: { method?: string; body?: unknown; cookie?: string; ws?: string; ip?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', origin: 'http://localhost' };
  if (init.cookie) headers.cookie = init.cookie;
  if (init.ws) headers['x-bds-workspace'] = init.ws;
  if (init.ip) headers['x-forwarded-for'] = init.ip;
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
const cookieOf = (res: Response, name: string) => {
  const m = (res.headers.get('set-cookie') ?? '').match(new RegExp(`${name}=([^;]+)`));
  return m ? `${name}=${m[1]}` : '';
};
const doc = (over: Partial<FamilyDoc> = {}): FamilyDoc => ({
  schemaVersion: FAMILY_DOC_SCHEMA_VERSION, child: null, events: [], updatedAt: 1, ...over,
});

describe('session cookie', () => {
  it('round-trips and rejects tampering and expiry', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const v = encodeSession({ familyId: id, kind: 'real' }, 1000);
    expect(decodeSession(v, 2000)).toEqual({ familyId: id, kind: 'real' });
    expect(decodeSession(v.replace('real', 'sample'), 2000)).toBeNull();
    expect(decodeSession(v.slice(0, -2) + 'xx', 2000)).toBeNull();
    expect(decodeSession(v, 1000 + 366 * 86400_000)).toBeNull();
    expect(decodeSession('garbage')).toBeNull();
  });
});

describe('family and state', () => {
  it('creates a family idempotently and sets an httpOnly cookie', async () => {
    const a = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    expect(a.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    const cookie = cookieOf(a, 'bds_session');
    const idA = (await a.json()).familyId;
    const b = await familyPost(req('/api/family', { method: 'POST', body: {}, cookie }));
    expect((await b.json()).familyId).toBe(idA);
  });

  it('401 without a session; round trip; conflict; validation', async () => {
    expect((await stateGet(req('/api/state'))).status).toBe(401);
    const c = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const cookie = cookieOf(c, 'bds_session');
    const empty = await (await stateGet(req('/api/state', { cookie }))).json();
    expect(empty.version).toBe(0);
    expect(empty.entitlements).toEqual([]);

    const put1 = await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: doc(), baseVersion: 0 } }));
    expect((await put1.json()).version).toBe(1);
    const put2 = await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: doc({ updatedAt: 5 }), baseVersion: 1 } }));
    expect((await put2.json()).version).toBe(2);
    const stale = await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: doc({ updatedAt: 9 }), baseVersion: 1 } }));
    expect(stale.status).toBe(409);
    const body = await stale.json();
    expect(body.version).toBe(2);
    expect(body.doc.updatedAt).toBe(5);
    const stale0 = await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: doc(), baseVersion: 0 } }));
    expect(stale0.status).toBe(409);

    const bad = await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: { nope: 1 }, baseVersion: 2 } }));
    expect(bad.status).toBe(400);
  });

  it('refuses a surname-like child name and cross-origin writes', async () => {
    const c = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const cookie = cookieOf(c, 'bds_session');
    const child = {
      id: 'c1', name: 'Max Smith', age: 4, character: { animal: 'bunny', color: 'blue', accessory: 'cap' },
      values: { tone: 'secular', bodyWords: 'anatomical', family: [] }, styleMode: 'story', techniques: [], badges: [], createdOn: '2026-11-15',
    };
    const r = await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: doc({ child: child as never }), baseVersion: 0 } }));
    expect(r.status).toBe(400);
    const evil = new NextRequest('http://localhost/api/state', {
      method: 'PUT', headers: { 'content-type': 'application/json', origin: 'http://evil.example', cookie },
      body: JSON.stringify({ doc: doc(), baseVersion: 0 }),
    });
    expect((await statePut(evil)).status).toBe(403);
  });

  it('deletes the family and clears the cookie', async () => {
    const c = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const cookie = cookieOf(c, 'bds_session');
    await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: doc(), baseVersion: 0 } }));
    const del = await familyDelete(req('/api/family', { method: 'DELETE', cookie }));
    expect(del.status).toBe(204);
    expect((await stateGet(req('/api/state', { cookie }))).status).toBe(401);
  });
});

describe('sample family and demo access', () => {
  it('seeds Max with a past and an upcoming event, kept apart from the real workspace', async () => {
    const s = await samplePost(req('/api/sample', { method: 'POST', body: { today: '2026-11-15' }, ws: 'sample' }));
    const out = await s.json();
    expect(out.doc.child.name).toBe('Max');
    const dentist = out.doc.events.find((e: { type: string }) => e.type === 'dentist');
    expect(dentist.date).toBe('2026-11-20');
    expect(dentist.chapters).toHaveLength(5);
    expect(out.doc.events.find((e: { type: string }) => e.type === 'haircut').checkin.helped).toEqual(['count_to_ten']);
    const sampleCookie = cookieOf(s, 'bds_sample_session');
    expect((await stateGet(req('/api/state', { cookie: sampleCookie, ws: 'sample' }))).status).toBe(200);
    // the sample cookie does not open the real workspace
    expect((await stateGet(req('/api/state', { cookie: sampleCookie }))).status).toBe(401);
  });

  it('grants demo access to sample families only, and resets it', async () => {
    const s = await samplePost(req('/api/sample', { method: 'POST', body: { today: '2026-11-15' }, ws: 'sample' }));
    const sampleCookie = cookieOf(s, 'bds_sample_session');
    const sid = decodeSession(sampleCookie.split('=')[1])!.familyId;
    expect(await grantDemoAccess(sid)).toBe('ok');
    const list = await listEntitlements(sid);
    expect(list).toHaveLength(1);
    expect(list[0].plan).toBe('year');
    expect(grantEventAccessCheck(list, 'any')).toBe(true);
    const state = await (await stateGet(req('/api/state', { cookie: sampleCookie, ws: 'sample' }))).json();
    expect(state.entitlements).toHaveLength(1);
    expect(await resetSampleAccess(sid)).toBe('ok');
    expect(await listEntitlements(sid)).toEqual([]);

    const real = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const rid = (await real.json()).familyId;
    expect(await grantDemoAccess(rid)).toBe('forbidden');
  });

  it('paid access: event pack matches its event only; expired rows are ignored; grant is idempotent', async () => {
    const real = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const rid = (await real.json()).familyId;
    const g = { familyId: rid, plan: 'event' as const, eventId: 'e1', stripeSessionId: 'cs_1', expiresAt: new Date(Date.now() + 1e7) };
    await grantPaidAccess(g);
    await grantPaidAccess(g);
    const list = await listEntitlements(rid);
    expect(list).toHaveLength(1);
    expect(grantEventAccessCheck(list, 'e1')).toBe(true);
    expect(grantEventAccessCheck(list, 'e2')).toBe(false);
    await grantPaidAccess({ ...g, stripeSessionId: 'cs_old', plan: 'year', expiresAt: new Date(Date.now() - 1000) });
    expect(await listEntitlements(rid)).toHaveLength(1);
  });
});

describe('restore code', () => {
  it('moves a family to another device; a wrong code is 404; limited to 5 per minute', async () => {
    const c = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const cookie = cookieOf(c, 'bds_session');
    await statePut(req('/api/state', { method: 'PUT', cookie, body: { doc: doc({ updatedAt: 7 }), baseVersion: 0 } }));
    const { code } = await (await codePost(req('/api/restore/code', { method: 'POST', cookie, body: {} }))).json();
    expect(code.length).toBeGreaterThanOrEqual(40);
    const ok = await restorePost(req('/api/restore', { method: 'POST', body: { code }, ip: '9.9.9.9' }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).doc.updatedAt).toBe(7);
    expect(cookieOf(ok, 'bds_session')).toBeTruthy();
    // a new code replaces the old one
    await codePost(req('/api/restore/code', { method: 'POST', cookie, body: {} }));
    expect((await restorePost(req('/api/restore', { method: 'POST', body: { code }, ip: '9.9.9.9' }))).status).toBe(404);
    let last = 0;
    for (let i = 0; i < 6; i++) last = (await restorePost(req('/api/restore', { method: 'POST', body: { code }, ip: '8.8.8.8' }))).status;
    expect(last).toBe(429);
  });
});

describe('retention', () => {
  it('purges samples older than 7 days and guests unseen for a year', async () => {
    const s = await samplePost(req('/api/sample', { method: 'POST', body: { today: '2026-11-15' }, ws: 'sample' }));
    const sid = decodeSession(cookieOf(s, 'bds_sample_session').split('=')[1])!.familyId;
    const r = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const rid = (await r.json()).familyId;
    const db = await getDb();
    await db.update(families).set({ createdAt: new Date(Date.now() - 8 * 86400_000) }).where(eq(families.id, sid));
    await db.update(families).set({ lastSeenAt: new Date(Date.now() - 400 * 86400_000) }).where(eq(families.id, rid));
    const out = await purgeStaleFamilies();
    expect(out.samples).toBeGreaterThanOrEqual(1);
    expect(out.guests).toBeGreaterThanOrEqual(1);
    expect((await db.select().from(families).where(eq(families.id, sid))).length).toBe(0);
  });
});

describe('usage summary', () => {
  it('counts families, events and purchases from the data itself', async () => {
    const { productCounts, spendByDay } = await import('@/lib/db/usage');
    const c = await productCounts();
    expect(c.families.real).toBeGreaterThanOrEqual(0);
    expect(typeof c.events).toBe('number');
    expect(Array.isArray(await spendByDay())).toBe(true);
  });
});
