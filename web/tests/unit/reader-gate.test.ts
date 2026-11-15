import { beforeEach, describe, expect, it } from 'vitest';
import { GATE_OPEN_MS, gateNeeded, openGate, resetGate } from '@/lib/reader/gate';

describe('parent gate', () => {
  beforeEach(() => resetGate());
  it('asks in the real workspace until a grown-up passes', () => {
    expect(gateNeeded('real', 1000)).toBe(true);
    openGate(1000);
    expect(gateNeeded('real', 1000 + GATE_OPEN_MS - 1)).toBe(false);
    expect(gateNeeded('real', 1000 + GATE_OPEN_MS + 1)).toBe(true);
  });
  it('never asks in the sample workspace', () => {
    expect(gateNeeded('sample')).toBe(false);
  });
});
