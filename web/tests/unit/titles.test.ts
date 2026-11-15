import { describe, expect, it } from 'vitest';
import { eventScreenTitle } from '@/lib/titles';

describe('eventScreenTitle', () => {
  const t = (path: string, name?: string) => eventScreenTitle(path, 'ev1', 'Dentist visit', name);
  it('names each event screen', () => {
    expect(t('/event/ev1', 'Mia')).toBe('Dentist visit · Mia');
    expect(t('/event/ev1')).toBe('Dentist visit');
    expect(t('/event/ev1/read/2')).toBe('Chapter 2 · Dentist visit');
    expect(t('/event/ev1/day')).toBe('Event day · Dentist visit');
    expect(t('/event/ev1/checkin')).toBe('Check-in · Dentist visit');
    expect(t('/event/ev1/badge', 'Mia')).toBe('Mia’s badge · Dentist visit');
    expect(t('/event/ev1/badge')).toBe('Badge · Dentist visit');
    expect(t('/event/ev1/panel/')).toBe('Parent panel · Dentist visit');
    expect(t('/event/ev1/paywall')).toBe('Unlock plan · Dentist visit');
  });
});
