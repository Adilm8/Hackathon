import { redirect } from 'next/navigation';
import { planHref } from '@/lib/home/path';

/**
 * The plan of a big day lives on the home page now (story path, reminders, story options),
 * so the old address, used in calendar entries and push links, opens /home?event=<id>.
 * Other query parameters (such as ?demo=1) are passed along.
 */
export default async function PlanRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const rest = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (k === 'event' || v === undefined) continue;
    for (const one of Array.isArray(v) ? v : [v]) rest.append(k, one);
  }
  const extra = rest.toString();
  redirect(extra ? `${planHref(id)}&${extra}` : planHref(id));
}
