import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readLedgerCache, readLedgerCacheEntry, writeLedgerCache } from './ledgerCache';

const ledger = (name = 'Everyday') => ({
  funds: [{ id: 'fund-1', name }],
  memberships: [],
  remittances: [],
  allocations: [],
  transactions: [],
  categories: [],
});

describe('ledger cache', () => {
  beforeEach(() => {
    const values = new Map();
    vi.stubGlobal('localStorage', {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, String(value)),
    });
  });

  it('stores sync freshness alongside the ledger', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(2000);
    writeLedgerCache('user-1', ledger(), 1500);
    expect(readLedgerCacheEntry('user-1')).toMatchObject({
      savedAt: 2000,
      remoteSyncedAt: 1500,
      data: ledger(),
    });
  });

  it('recovers the previous valid generation if the primary cache is damaged', () => {
    writeLedgerCache('user-1', ledger('First'), 1000);
    writeLedgerCache('user-1', ledger('Second'), 2000);
    localStorage.setItem('hk-ledger-v4:user-1', '{broken');
    expect(readLedgerCache('user-1').funds[0].name).toBe('First');
  });

  it('migrates the previous cache generation without a network dependency', () => {
    localStorage.setItem(
      'hk-ledger-v3:user-1',
      JSON.stringify({ savedAt: 1000, data: ledger('Legacy') }),
    );
    expect(readLedgerCache('user-1').funds[0].name).toBe('Legacy');
    expect(localStorage.getItem('hk-ledger-v4:user-1')).toBeTruthy();
  });
});
