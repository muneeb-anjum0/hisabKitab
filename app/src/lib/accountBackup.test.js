import { describe, expect, it } from 'vitest';
import { parseAccountBackup, receiptsForOwnedFunds } from './accountBackup';

const backup = () => ({
  format: 'hisabkitab-account',
  version: 1,
  userId: 'alice',
  funds: [{ id: 'fund', ownerId: 'alice' }],
  remittances: [],
  allocations: [],
  transactions: [],
  categories: [],
  recurringRules: [],
});

describe('account backup validation', () => {
  it('accepts an owner backup for the signed-in account', () => {
    expect(parseAccountBackup(JSON.stringify(backup()), 'alice').funds[0].id).toBe('fund');
  });
  it('rejects another account and broken references', () => {
    expect(() => parseAccountBackup(JSON.stringify(backup()), 'bob')).toThrow('different account');
    const broken = backup();
    broken.allocations.push({ id: 'lot', fundId: 'missing', remittanceId: 'missing' });
    expect(() => parseAccountBackup(JSON.stringify(broken), 'alice')).toThrow('without its Fund');
  });
  it('rejects a transfer missing its other side before restoring', () => {
    const broken = backup();
    broken.transactions.push({ id: 'out', type: 'transfer', fundId: 'fund', counterpartyId: 'in' });
    expect(() => parseAccountBackup(JSON.stringify(broken), 'alice')).toThrow(
      'incomplete transfer',
    );
  });
  it('rejects path-like IDs and recurring rules for other accounts', () => {
    const badId = backup();
    badId.funds[0].id = '../users/alice';
    expect(() => parseAccountBackup(JSON.stringify(badId), 'alice')).toThrow('Invalid funds ID');
    const badRule = backup();
    badRule.recurringRules.push({ id: 'rent', ownerId: 'bob', fundId: 'fund' });
    expect(() => parseAccountBackup(JSON.stringify(badRule), 'alice')).toThrow('recurring rule');
  });
  it('retains shared Fund lot amounts when the contributor receipt is private', () => {
    const receipts = receiptsForOwnedFunds(
      [],
      [
        { remittanceId: 'private', amount: 500, source: 'Member', receivedAt: '2026-11-01' },
        { remittanceId: 'private', amount: 200, source: 'Member', receivedAt: '2026-11-01' },
      ],
      'alice',
    );
    expect(receipts).toMatchObject([{ id: 'private', ownerId: 'alice', totalAmount: 700 }]);
  });
});
