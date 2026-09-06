import { describe, expect, it } from 'vitest';
import { money } from './currency';

describe('money formatting', () => {
  it('formats Pakistani rupees with local grouping', () => {
    expect(money(1234567)).toBe('Rs. 1,234,567');
  });

  it('places the minus sign before the rupee label', () => {
    expect(money(-1480)).toBe('-Rs. 1,480');
  });

  it('rounds fractional rupees to whole display values', () => {
    expect(money(10.6)).toBe('Rs. 11');
  });

  it('normalizes empty and invalid inputs to zero', () => {
    expect(money()).toBe('Rs. 0');
    expect(money('not-a-number')).toBe('Rs. 0');
  });

  it('uses Intl currency formatting for non-PKR currencies', () => {
    expect(money(25, 'USD')).toMatch(/25/);
    expect(money(25, 'USD')).toMatch(/\$|US\$/);
  });
});
