import { describe, expect, it } from 'vitest';
import { favKey, usePrefs } from '@/lib/store/prefs';

describe('device preferences', () => {
  it('toggles a favourite chapter on and off', () => {
    const s = usePrefs.getState();
    s.toggleFavorite('ev1', 2);
    expect(usePrefs.getState().favorites).toEqual([favKey('ev1', 2)]);
    usePrefs.getState().toggleFavorite('ev1', 2);
    expect(usePrefs.getState().favorites).toEqual([]);
  });

  it('defaults to sounds on and the usual font', () => {
    expect(usePrefs.getState().sound).toBe(true);
    expect(usePrefs.getState().easyRead).toBe(false);
  });
});
