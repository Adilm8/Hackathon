/**
 * Soft parent gate for the reader: leaving the story or opening the parent panel asks a grown-up
 * to hold a button for a moment. After one pass the gate stays open for a few minutes, and the
 * sample workspace (the jury demo) never asks.
 */
export const GATE_HOLD_MS = 1500;
export const GATE_OPEN_MS = 5 * 60 * 1000;

let openedAt: number | null = null;

export function gateNeeded(workspace: string, now: number = Date.now()): boolean {
  if (workspace === 'sample') return false;
  return openedAt === null || now - openedAt > GATE_OPEN_MS;
}

export function openGate(now: number = Date.now()): void {
  openedAt = now;
}

/** Tests only. */
export function resetGate(): void {
  openedAt = null;
}
