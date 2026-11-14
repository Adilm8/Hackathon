import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { closeDb } from '@/lib/db/client';
import { listEntitlements } from '@/lib/db/entitlements';
import { encodeIcsPayload } from '@/lib/engine/ics';
import { resetEnvCache } from '@/lib/env';
import { resetRateLimits } from '@/lib/server/ratelimit';
import { decodeSession } from '@/lib/server/session';
import { POST as familyPost } from '@/app/api/family/route';
import { GET as icsGet } from '@/app/api/ics/route';
import { GET as accessGet, POST as accessPost } from '@/app/api/sample/access/route';
import { POST as samplePost } from '@/app/api/sample/route';
import { POST as ritualPost } from '@/app/api/ritual/route';
import { buildSampleFamily } from '@/lib/engine/sample';
import { buildStoryContext } from '@/lib/engine/state';
import { getTemplate } from '@/lib/engine/templates';

afterAll(closeDb);
beforeEach(resetRateLimits);
afterEach(() => {
  delete process.env.DEMO_MODE;
  resetEnvCache();
});

function req(url: string, init: { method?: string; body?: unknown; cookie?: string; ws?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', origin: 'http://localhost' };
  if (init.cookie) headers.cookie = init.cookie;
  if (init.ws) headers['x-bds-workspace'] = init.ws;
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

async function newSample() {
  const s = await samplePost(req('/api/sample', { method: 'POST', body: { today: '2026-11-15' }, ws: 'sample' }));
  const cookie = cookieOf(s, 'bds_sample_session');
  return { cookie, familyId: decodeSession(cookie.split('=')[1])!.familyId };
}

describe('POST /api/sample/access (9, 10.4a)', () => {
  it('grants 24-hour demo access to a sample family, which then opens the day card, and resets it', async () => {
    const { cookie, familyId } = await newSample();
    const doc = buildSampleFamily('2026-11-15');
    const event = doc.events.find((e) => e.type === 'dentist')!;
    const template = getTemplate('dentist');
    const ritualBody = { eventId: event.id, context: buildStoryContext({ event, child: doc.child!, template, chapterIndex: 5 }), topTopics: ['pain'] };
    expect((await ritualPost(req('/api/ritual', { method: 'POST', body: ritualBody, cookie, ws: 'sample' }))).status).toBe(402);

    const g = await accessPost(req('/api/sample/access', { method: 'POST', body: { action: 'grant' }, cookie, ws: 'sample' }));
    expect(g.status).toBe(200);
    const { entitlements } = await g.json();
    expect(entitlements).toHaveLength(1);
    expect(entitlements[0]).toMatchObject({ plan: 'year', renews: false });
    expect(entitlements[0].expiresAt - Date.now()).toBeGreaterThan(23 * 3600_000);

    const r = await ritualPost(req('/api/ritual', { method: 'POST', body: ritualBody, cookie, ws: 'sample' }));
    expect(r.status).toBe(200);
    expect((await r.json()).steps).toHaveLength(3);

    // granting twice keeps one row
    await accessPost(req('/api/sample/access', { method: 'POST', body: { action: 'grant' }, cookie, ws: 'sample' }));
    expect(await listEntitlements(familyId)).toHaveLength(1);

    const reset = await accessPost(req('/api/sample/access', { method: 'POST', body: { action: 'reset' }, cookie, ws: 'sample' }));
    expect((await reset.json()).entitlements).toEqual([]);
  });

  it('refuses real families, missing sessions, bad bodies and DEMO_MODE=off', async () => {
    const real = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const realCookie = cookieOf(real, 'bds_session');
    expect((await accessPost(req('/api/sample/access', { method: 'POST', body: { action: 'grant' }, cookie: realCookie }))).status).toBe(403);
    expect((await accessPost(req('/api/sample/access', { method: 'POST', body: { action: 'grant' }, ws: 'sample' }))).status).toBe(403);
    const { cookie } = await newSample();
    expect((await accessPost(req('/api/sample/access', { method: 'POST', body: { action: 'pay' }, cookie, ws: 'sample' }))).status).toBe(400);
    expect(await (await accessGet(req('/api/sample/access', { cookie, ws: 'sample' }))).json()).toEqual({ demoMode: true });
    expect(await (await accessGet(req('/api/sample/access', { cookie: realCookie }))).json()).toEqual({ demoMode: false });

    process.env.DEMO_MODE = 'off';
    resetEnvCache();
    expect((await accessPost(req('/api/sample/access', { method: 'POST', body: { action: 'grant' }, cookie, ws: 'sample' }))).status).toBe(403);
    expect(await (await accessGet(req('/api/sample/access', { cookie, ws: 'sample' }))).json()).toEqual({ demoMode: false });
  });
});

describe('GET /api/ics (9, 11.8)', () => {
  it('serves the calendar file as an attachment without the child name', async () => {
    const d = encodeIcsPayload({ label: 'Dentist visit', eventId: 'evt_1', chapterDates: ['2026-11-15', '2026-11-16'], eventDate: '2026-11-17' });
    const res = await icsGet(req(`/api/ics?d=${d}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/calendar/);
    expect(res.headers.get('content-disposition')).toMatch(/big-day-stories\.ics/);
    const text = await res.text();
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(text).toContain('http://localhost/event/evt_1/checkin');
    expect(text).not.toMatch(/Max/);
  });
  it('rejects a malformed link', async () => {
    expect((await icsGet(req('/api/ics?d=nope'))).status).toBe(400);
    expect((await icsGet(req('/api/ics'))).status).toBe(400);
  });
});
