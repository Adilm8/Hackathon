import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { productCounts, spendByDay } from '@/lib/db/usage';
import { env } from '@/lib/env';
import { apiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** Spend per day, model and route plus product counts (SPEC 9). Counts only; no text is ever stored. */
export async function GET(req: NextRequest) {
  const key = env().adminKey;
  const given = req.nextUrl.searchParams.get('key') ?? '';
  const a = Buffer.from(key);
  const b = Buffer.from(given);
  if (!key || a.length !== b.length || !timingSafeEqual(a, b)) return apiError('forbidden', 'Forbidden');
  const [spend, counts] = await Promise.all([spendByDay(), productCounts()]);
  return NextResponse.json({ spend, counts });
}
