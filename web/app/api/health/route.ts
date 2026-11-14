import { NextResponse } from 'next/server';
import { pingDb } from '@/lib/db/client';
import { env } from '@/lib/env';
import { openKeys } from '@/lib/llm/breaker';
import { budgetLeft } from '@/lib/server/budget';
import pkg from '@/package.json';

export const dynamic = 'force-dynamic';

/** Health check for Railway (docs/SPEC.md 9). `paused` lists provider models the circuit breaker holds back. */
export async function GET() {
  const [db, left] = await Promise.all([pingDb(), budgetLeft().catch(() => true)]);
  return NextResponse.json({ ok: true, db, provider: env().llm.provider, budgetLeft: left, paused: openKeys(), version: pkg.version });
}
