/**
 * Signed guest sessions (docs/SPEC.md 6.3, 12.2). Server-only.
 * A session is `{ familyId, kind }` signed with ENTITLEMENT_SECRET (HMAC-SHA256),
 * stored in an httpOnly cookie. Real and sample families use two cookies;
 * the request header `x-bds-workspace` says which one applies.
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { env } from '../env';
import type { Workspace } from '../engine/types';

export const SESSION_COOKIE: Record<Workspace, string> = {
  real: 'bds_session',
  sample: 'bds_sample_session',
};
export const WORKSPACE_HEADER = 'x-bds-workspace';
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Session {
  familyId: string;
  kind: Workspace;
}

function sign(payload: string): string {
  return createHmac('sha256', env().entitlementSecret).update(payload).digest('base64url');
}

/** Cookie value: `<kind>.<familyId>.<expiresAtSec>.<signature>`. */
export function encodeSession(s: Session, nowMs = Date.now()): string {
  const payload = `${s.kind}.${s.familyId}.${Math.floor(nowMs / 1000) + ONE_YEAR_S}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined | null, nowMs = Date.now()): Session | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [kind, familyId, exp, sig] = parts;
  if ((kind !== 'real' && kind !== 'sample') || !UUID.test(familyId) || !/^\d+$/.test(exp)) return null;
  const expected = Buffer.from(sign(`${kind}.${familyId}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) * 1000 < nowMs) return null;
  return { familyId: familyId.toLowerCase(), kind };
}

/** Which workspace the request is about: the header, 'real' by default. */
export function workspaceOf(req: Request): Workspace {
  return req.headers.get(WORKSPACE_HEADER) === 'sample' ? 'sample' : 'real';
}

function cookieValue(req: Request, name: string): string | undefined {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/** The verified session for the request's workspace, or null. */
export function readSession(req: Request, workspace: Workspace = workspaceOf(req)): Session | null {
  const s = decodeSession(cookieValue(req, SESSION_COOKIE[workspace]));
  return s && s.kind === workspace ? s : null;
}

/** Same as readSession; the async form other streams code against. */
export async function getSession(req: Request): Promise<Session | null> {
  return readSession(req);
}

/** Sets (or renews) the session cookie on a response. */
export function setSessionCookie(res: NextResponse, s: Session): void {
  res.cookies.set(SESSION_COOKIE[s.kind], encodeSession(s), {
    httpOnly: true,
    secure: env().isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_S,
  });
}

export function clearSessionCookie(res: NextResponse, workspace: Workspace): void {
  res.cookies.set(SESSION_COOKIE[workspace], '', {
    httpOnly: true,
    secure: env().isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
