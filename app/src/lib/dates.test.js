import { afterEach, describe, expect, it, vi } from 'vitest';
import { friendlyDate, localISO, monthKey } from './dates';

afterEach(() => vi.useRealTimers());

describe('ledger dates', () => {
  it('returns a local calendar date with padded month and day', () => {
    expect(localISO(new Date(2026, 8, 6, 23, 30))).toBe('2026-09-06');
  });

  it('accepts date-compatible input values', () => {
    expect(localISO(new Date(2026, 0, 2))).toBe('2026-01-02');
  });

  it('labels today and yesterday relative to the local calendar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 6, 18, 0));
    expect(friendlyDate('2026-09-06')).toBe('Today');
    expect(friendlyDate('2026-09-05')).toBe('Yesterday');
  });

  it('formats older dates without leaking a time component', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 6, 18, 0));
    expect(friendlyDate('2026-08-31T23:59:59Z')).toBe('31 Aug');
  });

  it('extracts explicit month keys and defaults to the current month', () => {
    expect(monthKey('2026-09-30')).toBe('2026-09');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
    expect(monthKey()).toBe('2026-01');
  });
});
