import { describe, expect, it } from 'vitest';
import { fundTotals, monthlyTotals, portfolioTotals, unallocatedTotal } from './calculations';

const funds = [{ id: 'personal' }, { id: 'house' }];
const remittances = [{ id: 'r1', totalAmount: 30000, receivedAt: '2026-09-01' }];
const allocations = [
  { remittanceId: 'r1', fundId: 'personal', amount: 15000 },
  { remittanceId: 'r1', fundId: 'house', amount: 15000 },
];

describe('financial ledger', () => {
  it('starts empty without NaN values', () => {
    expect(portfolioTotals([], [], [], [])).toEqual({ funds: [], allocated: 0, spent: 0, remaining: 0, received: 0, unallocated: 0 });
  });

  it('calculates partial allocations and unallocated money', () => {
    expect(unallocatedTotal(remittances, allocations.slice(0, 1))).toBe(15000);
  });

  it('subtracts expenses from the selected Fund and portfolio', () => {
    const transactions = [{ fundId: 'house', type: 'expense', amount: 1480 }];
    expect(fundTotals('house', allocations, transactions).remaining).toBe(13520);
    expect(portfolioTotals(funds, allocations, transactions, remittances).remaining).toBe(28520);
  });

  it('recalculates after an expense edit', () => {
    const original = [{ fundId: 'house', type: 'expense', amount: 1480 }];
    const edited = original.map((item) => ({ ...item, amount: 1000 }));
    expect(fundTotals('house', allocations, edited).remaining).toBe(14000);
  });

  it('restores the balance after deletion', () => {
    const deleted = [{ fundId: 'personal', type: 'expense', amount: 2058 }].filter(() => false);
    expect(fundTotals('personal', allocations, deleted).remaining).toBe(15000);
  });

  it('moves money without changing overall wealth', () => {
    const transfers = [
      { fundId: 'personal', type: 'transfer', amount: -2000 },
      { fundId: 'house', type: 'transfer', amount: 2000 },
    ];
    const result = portfolioTotals(funds, allocations, transfers, remittances);
    expect(fundTotals('personal', allocations, transfers).remaining).toBe(13000);
    expect(fundTotals('house', allocations, transfers).remaining).toBe(17000);
    expect(result.remaining).toBe(30000);
  });

  it('calculates monthly income and expenses', () => {
    const transactions = [{ type: 'expense', amount: 1000, date: '2026-09-04' }, { type: 'expense', amount: 500, date: '2026-08-31' }];
    expect(monthlyTotals('2026-09', transactions, remittances)).toEqual({ received: 30000, spent: 1000, remaining: 29000 });
  });

  it('preserves the requested end-to-end money journey', () => {
    let transactions = [
      { id: 'groceries', fundId: 'house', type: 'expense', amount: 1480 },
      { id: 'fuel', fundId: 'personal', type: 'expense', amount: 2058 },
    ];
    expect(fundTotals('house', allocations, transactions).remaining).toBe(13520);
    expect(fundTotals('personal', allocations, transactions).remaining).toBe(12942);
    expect(portfolioTotals(funds, allocations, transactions, remittances).remaining).toBe(26462);

    transactions.push(
      { fundId: 'personal', type: 'transfer', amount: -2000 },
      { fundId: 'house', type: 'transfer', amount: 2000 },
    );
    expect(fundTotals('personal', allocations, transactions).remaining).toBe(10942);
    expect(fundTotals('house', allocations, transactions).remaining).toBe(15520);

    transactions = transactions.map((item) => item.id === 'groceries' ? { ...item, amount: 1000 } : item);
    expect(fundTotals('house', allocations, transactions).remaining).toBe(16000);
    expect(portfolioTotals(funds, allocations, transactions, remittances).remaining).toBe(26942);

    transactions = transactions.filter((item) => item.id !== 'fuel');
    expect(fundTotals('personal', allocations, transactions).remaining).toBe(13000);
    expect(portfolioTotals(funds, allocations, transactions, remittances).remaining).toBe(29000);
  });
});
