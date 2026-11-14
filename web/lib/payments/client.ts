/** Browser-side calls of the payment routes (docs/SPEC.md 9). Every call names its workspace. */
import type { Entitlement, Workspace } from '../engine/types';
import type { CheckoutPlan } from './plans';

export type PayResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

/** Event other parts of the app listen to, to cache fresh access (detail: Entitlement[]). */
export const ENTITLEMENTS_EVENT = 'bds:entitlements';

type Fetch = typeof fetch;

export function createPaymentsApi(fetchFn: Fetch = (...a) => fetch(...a)) {
  async function post<T>(url: string, ws: Workspace, body: unknown): Promise<PayResult<T>> {
    let r: Response;
    try {
      r = await fetchFn(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', 'x-bds-workspace': ws },
        body: JSON.stringify(body),
      });
    } catch {
      return { ok: false, status: 0, message: "You're offline. Check the connection and try again." };
    }
    let json: unknown = null;
    try {
      json = await r.json();
    } catch {
      /* empty body */
    }
    if (r.ok) return { ok: true, data: json as T };
    const message =
      (json as { error?: { message?: string } } | null)?.error?.message ?? 'Something went wrong. Please try again.';
    return { ok: false, status: r.status, message };
  }

  return {
    checkout(ws: Workspace, plan: CheckoutPlan, eventId: string, renewalConsent?: boolean) {
      return post<{ url: string }>('/api/checkout', ws, {
        plan,
        eventId,
        ...(renewalConsent === undefined ? {} : { renewalConsent }),
      });
    },
    verify(ws: Workspace, sessionId: string) {
      return post<{ entitlements: Entitlement[]; purchase: { plan: CheckoutPlan; eventId?: string } }>(
        '/api/verify',
        ws,
        { sessionId },
      );
    },
    portal(ws: Workspace) {
      return post<{ url: string }>('/api/portal', ws, {});
    },
  };
}

export const paymentsApi = createPaymentsApi();

export function announceEntitlements(list: Entitlement[]): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<Entitlement[]>(ENTITLEMENTS_EVENT, { detail: list }));
}

