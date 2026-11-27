import { describe, expect, it } from 'vitest';
import { dueOccurrences, nextOccurrence } from './recurring';

describe('monthly recurring dates', () => {
  it('catches up missed months with stable occurrence dates', () => {
    const rule = { startDate: '2026-09-01', day: 12 };
    expect(dueOccurrences(rule, '2026-11-27')).toEqual(['2026-09-12', '2026-10-12', '2026-11-12']);
    expect(nextOccurrence(rule, '2026-11-27')).toBe('2026-12-12');
  });
  it('does not create entries before the start date', () => {
    expect(dueOccurrences({ startDate: '2026-11-20', day: 12 }, '2026-11-27')).toEqual([]);
    expect(nextOccurrence({ startDate: '2027-05-01', day: 12 }, '2026-11-27')).toBe('2027-05-12');
  });
});
