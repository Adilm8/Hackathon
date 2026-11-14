/** Browser-side client of the family and state routes (docs/SPEC.md 9). Every call names its workspace. */
import type { Entitlement, FamilyDoc, ISODate, Workspace } from '../engine/types';

export interface ServerState {
  doc: FamilyDoc;
  version: number;
  entitlements: Entitlement[];
}

export type StateGet =
  | ({ kind: 'ok' } & ServerState)
  | { kind: 'no_session' }
  | { kind: 'offline' };

export type StatePut =
  | { kind: 'ok'; version: number }
  | { kind: 'conflict'; doc: FamilyDoc; version: number }
  | { kind: 'no_session' }
  | { kind: 'rejected' }
  | { kind: 'offline' };

type Fetch = typeof fetch;

function headers(ws: Workspace): HeadersInit {
  return { 'content-type': 'application/json', 'x-bds-workspace': ws };
}

export function createApi(fetchFn: Fetch = (...a) => fetch(...a)) {
  async function call(url: string, ws: Workspace, init: RequestInit = {}): Promise<Response | null> {
    try {
      return await fetchFn(url, { credentials: 'same-origin', ...init, headers: headers(ws) });
    } catch {
      return null;
    }
  }
  return {
    /** Creates the guest family (idempotent). */
    async createFamily(): Promise<{ familyId: string } | null> {
      const r = await call('/api/family', 'real', { method: 'POST', body: '{}' });
      return r?.ok ? r.json() : null;
    },
    async createSample(today: ISODate): Promise<ServerState | null> {
      const r = await call('/api/sample', 'sample', { method: 'POST', body: JSON.stringify({ today }) });
      return r?.ok ? r.json() : null;
    },
    async deleteFamily(ws: Workspace): Promise<boolean> {
      const r = await call('/api/family', ws, { method: 'DELETE' });
      return !!r && (r.ok || r.status === 401);
    },
    async createRestoreCode(): Promise<string | null> {
      const r = await call('/api/restore/code', 'real', { method: 'POST', body: '{}' });
      return r?.ok ? (await r.json()).code : null;
    },
    async restoreFromCode(code: string): Promise<ServerState | null> {
      const r = await call('/api/restore', 'real', { method: 'POST', body: JSON.stringify({ code }) });
      return r?.ok ? r.json() : null;
    },
    async getState(ws: Workspace): Promise<StateGet> {
      const r = await call('/api/state', ws);
      if (!r) return { kind: 'offline' };
      if (r.status === 401) return { kind: 'no_session' };
      if (!r.ok) return { kind: 'offline' };
      return { kind: 'ok', ...(await r.json()) };
    },
    async putState(ws: Workspace, doc: FamilyDoc, baseVersion: number): Promise<StatePut> {
      const r = await call('/api/state', ws, { method: 'PUT', body: JSON.stringify({ doc, baseVersion }) });
      if (!r) return { kind: 'offline' };
      if (r.ok) return { kind: 'ok', version: (await r.json()).version };
      if (r.status === 409) {
        const b = await r.json();
        return { kind: 'conflict', doc: b.doc, version: b.version };
      }
      if (r.status === 401) return { kind: 'no_session' };
      if (r.status === 400 || r.status === 413) return { kind: 'rejected' };
      return { kind: 'offline' };
    },
  };
}

export type SyncApi = ReturnType<typeof createApi>;
export const api = createApi();
