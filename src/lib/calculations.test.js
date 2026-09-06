import { describe, expect, it } from 'vitest';
import { buildMoneyLots, canDeleteRemittance, consumeMoneyLots, fundCardState, fundDeletionAssessment, fundTotals, moneyLotSummary, monthlyTotals, moveFund, patchFund, placeFund, portfolioTotals, sortFunds, sum, timestampMillis, unallocatedTotal } from './calculations';

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

  it('treats every historical allocation as a compatible Money Lot', () => {
    const lots = buildMoneyLots('house', allocations, remittances, []);
    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ id: allocations[1].id, originalAmount: 15000, source: 'Money received' });
  });

  it('uses FIFO across multiple lots for the Baba Kitchen scenario', () => {
    const kitchenRemittances = [
      { id: 'k1', sender: 'Baba', totalAmount: 15000, receivedAt: '2026-09-01' },
      { id: 'k2', sender: 'Baba', totalAmount: 15000, receivedAt: '2026-09-10' },
    ];
    const kitchenAllocations = [
      { id: 'lot-1', remittanceId: 'k1', fundId: 'kitchen', amount: 15000 },
      { id: 'lot-2', remittanceId: 'k2', fundId: 'kitchen', amount: 15000 },
    ];
    const earlyExpenses = [2500, 1200, 3000].map((amount, index) => ({ id: `e${index}`, fundId: 'kitchen', type: 'expense', amount, date: `2026-09-0${index + 2}` }));
    let lots = buildMoneyLots('kitchen', kitchenAllocations.slice(0, 1), kitchenRemittances, earlyExpenses);
    expect(lots[0].remaining).toBe(8300);
    lots = buildMoneyLots('kitchen', kitchenAllocations, kitchenRemittances, earlyExpenses);
    const usage = consumeMoneyLots(lots, 10000);
    expect(usage).toEqual({ usages: [{ lotId: 'lot-1', amount: 8300 }, { lotId: 'lot-2', amount: 1700 }], uncovered: 0 });
    const finalLots = buildMoneyLots('kitchen', kitchenAllocations, kitchenRemittances, [...earlyExpenses, { id: 'e4', fundId: 'kitchen', type: 'expense', amount: 10000, date: '2026-09-11', lotUsages: usage.usages }]);
    expect(finalLots.map((lot) => lot.remaining)).toEqual([0, 13300]);
    expect(fundTotals('kitchen', kitchenAllocations, [...earlyExpenses, { fundId: 'kitchen', type: 'expense', amount: 10000 }]).remaining).toBe(13300);
  });

  it('honors a manually selected lot then continues FIFO for the remainder', () => {
    const lots = [{ id: 'old', remaining: 3000 }, { id: 'chosen', remaining: 2000 }, { id: 'next', remaining: 4000 }];
    expect(consumeMoneyLots(lots, 4500, 'chosen')).toEqual({ usages: [{ lotId: 'chosen', amount: 2000 }, { lotId: 'old', amount: 2500 }], uncovered: 0 });
  });

  it('creates a derived destination lot for a transfer', () => {
    const transfer = { id: 'transfer-in', linkId: 'x', fundId: 'house', sourceFundName: 'Personal', type: 'transfer', amount: 2000, date: '2026-09-12' };
    expect(buildMoneyLots('house', [], [], [transfer])[0]).toMatchObject({ id: 'transfer:transfer-in', kind: 'transfer', source: 'Transfer from Personal', originalAmount: 2000 });
  });

  it('describes normal, zero-allocation, and overspent Fund cards accurately', () => {
    expect(fundCardState({ allocated: 15000, remaining: 10000 })).toEqual({ kind: 'normal', label: '67% LEFT', percentage: 67 });
    expect(fundCardState({ allocated: 0, remaining: 0 })).toEqual({ kind: 'empty', label: 'NO MONEY YET', percentage: null });
    expect(fundCardState({ allocated: 0, remaining: -10340 })).toEqual({ kind: 'overspent', label: 'OVERSPENT', overBy: 10340, percentage: null });
  });

  it('excludes archived Funds from active portfolio totals', () => {
    const result = portfolioTotals([{ id: 'active' }, { id: 'old', archived: true }], [{ fundId: 'active', amount: 10 }, { fundId: 'old', amount: 50 }], [], []);
    expect(result.funds.map((fund) => fund.id)).toEqual(['active']); expect(result.allocated).toBe(10);
  });

  it('allows deletion only for a completely empty Fund', () => {
    const base = { allocations: [], transactions: [], memberships: [{ fundId: 'empty', role: 'owner' }] };
    expect(fundDeletionAssessment('empty', base).empty).toBe(true);
    expect(fundDeletionAssessment('empty', { ...base, allocations: [{ fundId: 'empty', amount: 1 }] }).empty).toBe(false);
    expect(fundDeletionAssessment('empty', { ...base, transactions: [{ fundId: 'empty', type: 'expense', amount: 1 }] }).empty).toBe(false);
    expect(fundDeletionAssessment('empty', { ...base, memberships: [...base.memberships, { fundId: 'empty', role: 'viewer' }] }).empty).toBe(false);
  });

  it('updates only the edited Fund in local state', () => {
    const original = [{ id: 'house', name: 'House', accent: 'red' }, { id: 'gym', name: 'Gym', accent: 'green' }];
    const updated = patchFund(original, 'house', { name: 'Home', accent: 'blue' });
    expect(updated[0]).toMatchObject({ id: 'house', name: 'Home', accent: 'blue' });
    expect(updated[1]).toBe(original[1]);
  });

  it('only deletes money received before it enters Fund history', () => {
    expect(canDeleteRemittance('unused', allocations)).toBe(true);
    expect(canDeleteRemittance('r1', allocations)).toBe(false);
  });

  it('sorts and rearranges Fund cards without losing ids', () => {
    expect(sortFunds([{ id: 'later', sortOrder: 2 }, { id: 'first', sortOrder: 0 }]).map((fund) => fund.id)).toEqual(['first', 'later']);
    expect(sortFunds([{ id: 'z', createdAt: '2026-01-02' }, { id: 'a', createdAt: '2026-01-01' }]).map((fund) => fund.id)).toEqual(['a', 'z']);
    expect(moveFund(['first', 'middle', 'last'], 'middle', -1)).toEqual(['middle', 'first', 'last']);
    expect(moveFund(['first', 'middle', 'last'], 'first', -1)).toEqual(['first', 'middle', 'last']);
    expect(placeFund(['first', 'middle', 'last'], 'last', 'first')).toEqual(['last', 'first', 'middle']);
    expect(placeFund(['first', 'middle', 'last'], 'first', 'last')).toEqual(['middle', 'last', 'first']);
    expect(placeFund(['first', 'middle', 'last'], 'first', 'middle')).toEqual(['middle', 'first', 'last']);
  });
});

describe('calculation edge cases', () => {
  it('sums numeric strings and safely ignores invalid values', () => {
    expect(sum([{ value: '12.5' }, { value: null }, { value: 'nope' }, { value: -2.5 }], (item) => item.value)).toBe(10);
  });

  it('normalizes Firestore, seconds, ISO, and missing timestamps', () => {
    expect(timestampMillis({ toMillis: () => 1234 })).toBe(1234);
    expect(timestampMillis({ seconds: 2 })).toBe(2000);
    expect(timestampMillis('2026-09-01T00:00:00.000Z')).toBe(Date.parse('2026-09-01T00:00:00.000Z'));
    expect(timestampMillis(null)).toBe(0);
    expect(timestampMillis('not-a-date')).toBe(0);
  });

  it('keeps unrelated Funds and transaction types out of Fund totals', () => {
    const result = fundTotals('home', [{ fundId: 'home', amount: '100' }, { fundId: 'other', amount: 900 }], [
      { fundId: 'home', type: 'expense', amount: '25' },
      { fundId: 'home', type: 'income', amount: 500 },
      { fundId: 'other', type: 'expense', amount: 300 },
    ]);
    expect(result).toEqual({ allocated: 100, spent: 25, adjustments: 0, remaining: 75 });
  });

  it('reports transferred-in state when remaining exceeds the available denominator', () => {
    expect(fundCardState({ allocated: 100, remaining: 140 })).toEqual({ kind: 'inflow', label: 'TRANSFERRED IN', percentage: null });
    expect(fundCardState({ allocated: 0, adjustments: 50, remaining: 50 })).toEqual({ kind: 'normal', label: '100% LEFT', percentage: 100 });
  });

  it('clamps normal Fund percentages to a safe zero-to-one-hundred range', () => {
    expect(fundCardState({ allocated: 100, remaining: 0 }).percentage).toBe(0);
    expect(fundCardState({ allocated: 100, remaining: 100 }).percentage).toBe(100);
  });

  it('counts counterparty transfers as Fund history that blocks deletion', () => {
    const data = {
      allocations: [],
      memberships: [{ fundId: 'home', role: 'owner' }],
      transactions: [{ fundId: 'other', counterpartyFundId: 'home', type: 'transfer', amount: -40 }],
    };
    expect(fundDeletionAssessment('home', data)).toMatchObject({ empty: false, transactionCount: 1, transferCount: 1 });
  });

  it('counts incoming transfers as derived Money Lots', () => {
    const data = {
      allocations: [{ id: 'allocation', fundId: 'home', amount: 50 }],
      memberships: [{ fundId: 'home', role: 'owner' }],
      transactions: [{ id: 'incoming', fundId: 'home', type: 'transfer', amount: 25 }],
    };
    expect(fundDeletionAssessment('home', data).moneyLots).toBe(2);
  });

  it('does not mutate the original Fund list while sorting', () => {
    const original = [{ id: 'second', sortOrder: 2 }, { id: 'first', sortOrder: 1 }];
    const sorted = sortFunds(original);
    expect(sorted.map((fund) => fund.id)).toEqual(['first', 'second']);
    expect(original.map((fund) => fund.id)).toEqual(['second', 'first']);
  });

  it('uses id as a deterministic final Fund sorting fallback', () => {
    expect(sortFunds([{ id: 'z' }, { id: 'a' }]).map((fund) => fund.id)).toEqual(['a', 'z']);
  });

  it('leaves Fund order unchanged for invalid moves and placements', () => {
    const ids = ['one', 'two'];
    expect(moveFund(ids, 'missing', 1)).toBe(ids);
    expect(moveFund(ids, 'two', 1)).toBe(ids);
    expect(placeFund(ids, 'one', 'missing')).toBe(ids);
    expect(placeFund(ids, 'one', 'one')).toBe(ids);
  });

  it('can represent negative unallocated money without hiding inconsistency', () => {
    expect(unallocatedTotal([{ totalAmount: 100 }], [{ amount: 125 }])).toBe(-25);
  });

  it('keeps archived Funds out while retaining received and unallocated totals', () => {
    const result = portfolioTotals([{ id: 'old', archived: true }], [{ fundId: 'old', amount: 60 }], [], [{ totalAmount: 100 }]);
    expect(result).toMatchObject({ allocated: 0, remaining: 0, received: 100, unallocated: 40 });
  });

  it('excludes transfers and out-of-month records from monthly spending', () => {
    expect(monthlyTotals('2026-09', [
      { type: 'expense', amount: 10, date: '2026-09-30' },
      { type: 'transfer', amount: -100, date: '2026-09-15' },
      { type: 'expense', amount: 20, date: '2026-10-01' },
    ], [{ totalAmount: 50, receivedAt: '2026-09-01' }, { totalAmount: 70, receivedAt: '2026-08-31' }])).toEqual({ received: 50, spent: 10, remaining: 40 });
  });

  it('orders Money Lots by received date, creation time, then id', () => {
    const lots = buildMoneyLots('home', [
      { id: 'b', fundId: 'home', remittanceId: 'r', amount: 10, createdAt: { seconds: 2 } },
      { id: 'a', fundId: 'home', remittanceId: 'r', amount: 20, createdAt: { seconds: 1 } },
    ], [{ id: 'r', receivedAt: '2026-09-01', sender: 'Baba' }], []);
    expect(lots.map((lot) => [lot.id, lot.number])).toEqual([['a', 1], ['b', 2]]);
  });

  it('caps explicit lot usage at both the transaction and lot balance', () => {
    const lots = buildMoneyLots('home', [{ id: 'lot', fundId: 'home', amount: 100 }], [], [
      { id: 'expense', fundId: 'home', type: 'expense', amount: 30, date: '2026-09-01', lotUsages: [{ lotId: 'lot', amount: 90 }] },
    ]);
    expect(lots[0]).toMatchObject({ spent: 30, remaining: 70 });
  });

  it('falls back to FIFO when a saved usage references a missing lot', () => {
    const lots = buildMoneyLots('home', [{ id: 'real', fundId: 'home', amount: 100 }], [], [
      { id: 'expense', fundId: 'home', type: 'expense', amount: 35, date: '2026-09-01', lotUsages: [{ lotId: 'missing', amount: 35 }] },
    ]);
    expect(lots[0]).toMatchObject({ spent: 35, remaining: 65 });
  });

  it('reports uncovered spending when available Money Lots are insufficient', () => {
    expect(consumeMoneyLots([{ id: 'one', remaining: 20 }, { id: 'empty', remaining: 0 }], 35)).toEqual({ usages: [{ lotId: 'one', amount: 20 }], uncovered: 15 });
  });

  it('treats invalid and negative requested consumption as zero', () => {
    expect(consumeMoneyLots([{ id: 'one', remaining: 20 }], -5)).toEqual({ usages: [], uncovered: 0 });
    expect(consumeMoneyLots([{ id: 'one', remaining: 20 }], 'invalid')).toEqual({ usages: [], uncovered: 0 });
  });

  it('summarizes original, spent, and remaining Money Lot values', () => {
    const summary = moneyLotSummary('home', [{ id: 'lot', fundId: 'home', amount: 100 }], [], [
      { fundId: 'home', type: 'expense', amount: 35, date: '2026-09-01' },
    ]);
    expect(summary).toMatchObject({ original: 100, spent: 35, remaining: 65 });
    expect(summary.lots).toHaveLength(1);
  });
});
