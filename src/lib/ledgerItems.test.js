import { describe, expect, it } from 'vitest';
import { activityItems, recentTransactions } from './ledgerItems';

const transferPair = [
  {
    id: 'transfer-out',
    type: 'transfer',
    linkId: 'transfer-1',
    transferDirection: 'out',
    amount: -500,
    date: '2026-09-16',
    createdAt: '2026-09-16T10:00:00.000Z',
  },
  {
    id: 'transfer-in',
    type: 'transfer',
    linkId: 'transfer-1',
    transferDirection: 'in',
    amount: 500,
    date: '2026-09-16',
    createdAt: '2026-09-16T10:00:00.000Z',
  },
];

describe('ledger item selectors', () => {
  it('keeps one canonical transfer in recent transactions', () => {
    const items = recentTransactions(
      [
        ...transferPair,
        { id: 'expense', type: 'expense', amount: -100, date: '2026-09-17', createdAt: 2 },
      ],
      5,
    );

    expect(items.map((item) => item.id)).toEqual(['expense', 'transfer-out']);
  });

  it('combines income and transactions into one newest-first activity feed', () => {
    const items = activityItems(transferPair, [
      {
        id: 'income',
        sender: 'Bhai',
        totalAmount: 2000,
        receivedAt: '2026-09-17',
        createdAt: '2026-09-17T08:00:00.000Z',
      },
    ]);

    expect(items.map((item) => item.id)).toEqual(['remittance-income', 'transfer-out']);
    expect(items[0]).toMatchObject({ type: 'income', description: 'Money from Bhai' });
  });
});
