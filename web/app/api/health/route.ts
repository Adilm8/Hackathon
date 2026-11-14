import { NextResponse } from 'next/server';
import { pingDb } from '@/lib/db/client';
import { env } from '@/lib/env';
import pkg from '@/package.json';

export const dynamic = 'force-dynamic';

/** Health check for Railway (docs/SPEC.md 9). budgetLeft is filled in by the AI stream (lib/server/budget.ts). */
export async function GET() {
  const db = await pingDb();
  return NextResponse.json({ ok: true, db, provider: env().llm.provider, budgetLeft: true, version: pkg.version });
}
