import { afterEach, describe, expect, it } from 'vitest';
import { addDays, clock, dateLabel, diffDays, isISODate, weekdayLabel } from '@/lib/engine/clock';

afterEach(() => {
  clock.setNowSource(null);
  clock.setOverrideSource(null);
});

describe('date helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('is stable across daylight saving changes (US)', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(diffDays('2026-03-01', '2026-03-15')).toBe(14);
    expect(diffDays('2026-10-25', '2026-11-08')).toBe(14);
  });
  it('diffDays is signed', () => {
    expect(diffDays('2026-11-20', '2026-11-15')).toBe(-5);
    expect(diffDays('2026-11-15', '2026-11-15')).toBe(0);
  });
  it('validates ISO dates', () => {
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-2-3')).toBe(false);
    expect(isISODate('2026-11-15')).toBe(true);
  });
  it('labels dates US style', () => {
    expect(weekdayLabel('2026-11-15')).toBe('Sun');
    expect(weekdayLabel('2026-11-20', 'long')).toBe('Friday');
    expect(dateLabel('2026-11-20')).toBe('Nov 20');
    expect(dateLabel('2026-11-20', { weekday: true })).toBe('Fri, Nov 20');
  });
});

describe('clock', () => {
  it('returns the local date of the device', () => {
    clock.setNowSource(() => new Date(2026, 10, 15, 23, 59));
    expect(clock.today()).toBe('2026-11-15');
  });
  it('uses the demo override when set', () => {
    clock.setNowSource(() => new Date(2026, 10, 15, 9));
    clock.setOverrideSource(() => '2026-11-20');
    expect(clock.today()).toBe('2026-11-20');
    expect(clock.realToday()).toBe('2026-11-15');
    expect(clock.isOverridden()).toBe(true);
  });
});
