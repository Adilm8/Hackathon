import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { closeDb } from '@/lib/db/client';
import { duePushes } from '@/lib/db/push';
import { resetRateLimits } from '@/lib/server/ratelimit';
import { POST as familyPost } from '@/app/api/family/route';
import { DELETE as pushDelete, GET as pushGet, PUT as pushPut } from '@/app/api/push/route';
import { GET as lastGet } from '@/app/api/push/last/route';

afterAll(closeDb);
beforeEach(resetRateLimits);

function req(url: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', origin: 'http://localhost' };
  if (init.cookie) headers.cookie = init.cookie;
  return new NextRequest(`http://localhost${url}`, { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}
const cookieOf = (res: Response) => {
  const m = (res.headers.get('set-cookie') ?? '').match(/bds_session=([^;]+)/);
  return m ? `bds_session=${m[1]}` : '';
};

const endpoint = `https://push.example.net/send/${Math.random().toString(36).slice(2)}`;
const reminder = (id: string, at: number) => ({ id, kind: 'chapter', at, title: 'Story time', body: 'Chapter 1 is ready.', url: '/event/e/read/1' });

describe('/api/push', () => {
  it('reports no key when VAPID is not set', async () => {
    const res = await pushGet();
    expect(await res.json()).toEqual({ publicKey: null });
  });

  it('needs a family session to save', async () => {
    const res = await pushPut(req('/api/push', { method: 'PUT', body: { endpoint, reminders: [] } }));
    expect(res.status).toBe(401);
  });

  it('saves reminders, delivers the due one once, and the worker reads it back', async () => {
    const fam = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const cookie = cookieOf(fam);
    expect(cookie).not.toBe('');
    const now = Date.now();
    const put = await pushPut(req('/api/push', { method: 'PUT', cookie, body: { endpoint, reminders: [reminder('a', now - 60_000), reminder('b', now + 3_600_000)] } }));
    expect(put.status).toBe(200);
    const due = (await duePushes(now)).filter((d) => d.endpoint === endpoint);
    expect(due.map((d) => d.send.id)).toEqual(['a']);
    expect((await duePushes(now)).filter((d) => d.endpoint === endpoint)).toEqual([]);
    const last = await (await lastGet(req(`/api/push/last?endpoint=${encodeURIComponent(endpoint)}`))).json();
    expect(last.reminder).toMatchObject({ id: 'a', title: 'Story time', url: '/event/e/read/1' });
    // Sending the same plan again does not deliver it twice.
    await pushPut(req('/api/push', { method: 'PUT', cookie, body: { endpoint, reminders: [reminder('a', now - 60_000)] } }));
    expect((await duePushes(now)).filter((d) => d.endpoint === endpoint)).toEqual([]);
    const del = await pushDelete(req('/api/push', { method: 'DELETE', body: { endpoint } }));
    expect(del.status).toBe(200);
  });

  it('refuses bad reminders', async () => {
    const fam = await familyPost(req('/api/family', { method: 'POST', body: {} }));
    const res = await pushPut(req('/api/push', { method: 'PUT', cookie: cookieOf(fam), body: { endpoint, reminders: [{ ...reminder('x', 1), url: 'https://evil.test' }] } }));
    expect(res.status).toBe(400);
  });
});
