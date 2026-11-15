/** The database does not answer (docs/reliability.md): fail fast, report "down", keep telling stories. */
import { afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { closeDb, getDb, pingDb } from '@/lib/db/client';
import { resetEnvCache } from '@/lib/env';
import { encodeSession } from '@/lib/server/session';
import { GET as healthGet } from '@/app/api/health/route';
import { POST as chapterPost } from '@/app/api/chapter/route';

process.env.DATABASE_URL = 'postgres://nobody:nothing@127.0.0.1:1/none';
resetEnvCache();
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

afterAll(async () => {
  await closeDb();
  process.env.DATABASE_URL = '';
  resetEnvCache();
});

describe('database unreachable', () => {
  it('fails fast instead of hanging, and does not retry on every call', async () => {
    const t0 = Date.now();
    await expect(getDb()).rejects.toThrow();
    await expect(getDb()).rejects.toThrow(/retrying soon/);
    expect(await pingDb(3_000)).toBe(false);
    expect(Date.now() - t0).toBeLessThan(8_000);
  });

  it('/api/health answers 503 with status "down"', async () => {
    const res = await healthGet();
    expect(res.status).toBe(503);
    const j = await res.json();
    expect(j).toMatchObject({ ok: false, status: 'down', db: false });
    expect(j.checks.database.state).toBe('down');
  });

  it('chapter 1 still streams from the templates', async () => {
    const cookie = `bds_session=${encodeSession({ familyId: '00000000-0000-4000-8000-000000000001', kind: 'real' })}`;
    const res = await chapterPost(new NextRequest('http://localhost/api/chapter', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost', cookie },
      body: JSON.stringify({
        eventId: 'e1',
        context: {
          event: { type: 'school', fears: [], templateVersion: 1 },
          child: { age: 6, character: { animal: 'bunny', color: 'blue', accessory: 'cap' } },
          values: { tone: 'secular', bodyWords: 'anatomical', family: ['Dad'] },
          styleMode: 'story',
          chapter: { index: 1, total: 3, beats: ['what_happens'] },
          mustAddress: [], askedQuestions: [], usedTechniques: [], helpedBefore: [], avoid: [], previousSummaries: [], placeCaptions: [],
        },
      }),
    }));
    expect(res.status).toBe(200);
    const out = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
    expect(out.filter((l) => l.type === 'page').length).toBeGreaterThan(0);
    expect(out.at(-1).type).toBe('done');
  });
});
