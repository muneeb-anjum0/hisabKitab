import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';
import { DataContext } from './data';
import * as api from '../services/dataService';
import { fundDeletionAssessment, patchFund } from '../lib/calculations';
import { readLedgerCacheEntry, writeLedgerCache } from '../lib/ledgerCache';

const EMPTY_DATA = {
  funds: [],
  memberships: [],
  remittances: [],
  allocations: [],
  transactions: [],
  categories: [],
};
const SYSTEM_CATEGORIES = [
  ['food', 'Food', '●'],
  ['transport', 'Transport', '➜'],
  ['bills', 'Bills', '⚡'],
  ['other', 'Other', '◆'],
].map(([id, name, symbol]) => ({ id, name, symbol, system: true }));
const NATIVE_REFRESH_TTL = 3 * 60 * 1000;
const upsert = (items, item, prepend = false) => {
  const existing = items.findIndex((candidate) => candidate.id === item.id);
  if (existing < 0) return prepend ? [item, ...items] : [...items, item];
  return items.map((candidate, index) =>
    index === existing ? { ...candidate, ...item } : candidate,
  );
};
const upsertMany = (items, additions, prepend = false) =>
  additions.reduce((current, item) => upsert(current, item, prepend), items);
function withTimeout(operation) {
  return Promise.race([
    operation,
    new Promise((_, reject) =>
      window.setTimeout(
        () =>
          reject(
            new Error(
              'Firestore did not respond. Confirm that the database exists and its rules are deployed.',
            ),
          ),
        12000,
      ),
    ),
  ]);
}

export function DataProvider({ children }) {
  const { user, configured } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const loadedUserIdRef = useRef(null);
  const reorderQueue = useRef(Promise.resolve());
  const reorderVersion = useRef(0);
  const refreshInFlight = useRef(null);
  const remoteSyncedAt = useRef(0);

  const refresh = useCallback(
    async (options = {}) => {
      const forceServer = options === true || options?.forceServer === true;
      if (!configured || !user) {
        setData(EMPTY_DATA);
        setLoading(false);
        setLoadedUserId(null);
        loadedUserIdRef.current = null;
        remoteSyncedAt.current = 0;
        return;
      }
      const cacheEntry = readLedgerCacheEntry(user.uid);
      const cached = cacheEntry?.data;
      remoteSyncedAt.current = Math.max(
        remoteSyncedAt.current,
        Number(cacheEntry?.remoteSyncedAt) || 0,
      );
      if (loadedUserIdRef.current !== user.uid && cached) {
        setData(cached);
        setLoadedUserId(user.uid);
        loadedUserIdRef.current = user.uid;
        setLoading(false);
      }
      if (!navigator.onLine) {
        setLoadedUserId(user.uid);
        loadedUserIdRef.current = user.uid;
        setLoading(false);
        return;
      }
      const native = window.Capacitor?.isNativePlatform?.() === true;
      if (
        !forceServer &&
        native &&
        cached &&
        Date.now() - remoteSyncedAt.current < NATIVE_REFRESH_TTL
      )
        return;
      if (!cached && loadedUserIdRef.current !== user.uid) setLoading(true);
      if (refreshInFlight.current) return refreshInFlight.current;
      const request = withTimeout(api.loadUserData(user.uid));
      refreshInFlight.current = request;
      try {
        const freshData = await request;
        remoteSyncedAt.current = Date.now();
        setData(freshData);
        writeLedgerCache(user.uid, freshData, remoteSyncedAt.current);
        setError('');
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.message || 'Could not load your ledger.');
      } finally {
        if (refreshInFlight.current === request) refreshInFlight.current = null;
        setLoadedUserId(user.uid);
        loadedUserIdRef.current = user.uid;
        setLoading(false);
      }
    },
    [configured, user],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    if (!user || loadedUserId !== user.uid) return undefined;
    const save = () => writeLedgerCache(user.uid, data, remoteSyncedAt.current);
    if ('requestIdleCallback' in window) {
      const task = window.requestIdleCallback(save, { timeout: 1000 });
      return () => window.cancelIdleCallback(task);
    }
    const timer = window.setTimeout(save, 250);
    return () => window.clearTimeout(timer);
  }, [data, loadedUserId, user]);
  useEffect(() => {
    const reconnect = () => {
      if (!navigator.onLine) return;
      api
        .finishQueuedWrites()
        .catch(() => {})
        .finally(() => void refresh({ forceServer: true }));
    };
    const syncError = (event) => {
      setToast({
        type: 'error',
        message: event.detail?.message || 'A QUEUED CHANGE NEEDS ATTENTION.',
      });
    };
    window.addEventListener('online', reconnect);
    window.addEventListener('hk-sync-error', syncError);
    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('hk-sync-error', syncError);
    };
  }, [refresh]);
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return undefined;
    const resume = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [refresh]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const write = async (operation, apply, message) => {
    setError('');
    try {
      const result = await operation();
      setData((current) => apply(current, result));
      setToast({
        type: 'success',
        message: navigator.onLine ? message : 'SAVED OFFLINE. QUEUED FOR SYNC.',
      });
      return result;
    } catch (writeError) {
      console.error(writeError);
      setToast({ type: 'error', message: writeError.message || "COULDN'T SAVE THAT." });
      throw writeError;
    }
  };

  const categories = useMemo(() => {
    const customIds = new Set(data.categories.map((item) => item.systemId || item.id));
    return [
      ...SYSTEM_CATEGORIES.filter((item) => !customIds.has(item.id)),
      ...data.categories.filter((item) => !item.hidden),
    ];
  }, [data.categories]);

  const value = {
    ...data,
    categories,
    loading: loading || Boolean(user && loadedUserId !== user.uid),
    error,
    toast,
    setToast,
    refresh,
    createFund: (values) => {
      const sortOrder =
        Math.max(
          -1,
          ...data.funds
            .filter((fund) => !fund.archived)
            .map((fund) => (Number.isFinite(fund.sortOrder) ? fund.sortOrder : -1)),
        ) + 1;
      const orderedValues = { ...values, sortOrder };
      return write(
        () => api.createFund(user.uid, orderedValues),
        (current, result) => ({
          ...current,
          funds: upsert(current.funds, result.fund),
          memberships: upsert(current.memberships, result.membership),
        }),
        'NEW FUND. STAMPED IN.',
      );
    },
    updateFund: (id, values) =>
      write(
        () => api.updateFund(id, values),
        (current, result) => ({ ...current, funds: patchFund(current.funds, id, result) }),
        'CHANGES SAVED.',
      ),
    reorderFunds: async (ids) => {
      const previousFunds = data.funds;
      const previousOrders = new Map(previousFunds.map((fund) => [fund.id, fund.sortOrder]));
      const version = ++reorderVersion.current;
      const applyOrder = (funds) =>
        funds.map((fund) => {
          const sortOrder = ids.indexOf(fund.id);
          return sortOrder < 0 ? fund : { ...fund, sortOrder };
        });
      setData((current) => ({ ...current, funds: applyOrder(current.funds) }));
      try {
        const save = reorderQueue.current.then(() => api.reorderFunds(ids, previousFunds));
        reorderQueue.current = save.catch(() => {});
        await save;
        if (version === reorderVersion.current)
          setToast({ type: 'success', message: 'FUND ORDER SAVED.' });
      } catch (writeError) {
        console.error(writeError);
        if (version === reorderVersion.current) {
          setData((current) => ({
            ...current,
            funds: current.funds.map((fund) =>
              previousOrders.has(fund.id)
                ? { ...fund, sortOrder: previousOrders.get(fund.id) }
                : fund,
            ),
          }));
          setToast({
            type: 'error',
            message: "COULDN'T SAVE FUND ORDER. YOUR PREVIOUS ORDER WAS RESTORED.",
          });
        }
        throw writeError;
      }
    },
    removeFund: (id) => {
      if (!fundDeletionAssessment(id, data).empty)
        return Promise.reject(new Error('This Fund has history. Archive it instead.'));
      return write(
        () => api.removeEmptyFund(id, user.uid),
        (current) => ({
          ...current,
          funds: current.funds.filter((item) => item.id !== id),
          memberships: current.memberships.filter((item) => item.fundId !== id),
        }),
        'EMPTY FUND DELETED.',
      );
    },
    addTransaction: (values) =>
      write(
        () => api.addTransaction(user.uid, values),
        (current, result) => ({
          ...current,
          transactions: upsert(current.transactions, result, true),
        }),
        'SPENT. SAVED.',
      ),
    updateTransaction: (id, values) =>
      write(
        () => api.updateTransaction(id, values),
        (current, result) => ({
          ...current,
          transactions: current.transactions.map((item) =>
            item.id === id ? { ...item, ...result } : item,
          ),
        }),
        'CHANGES SAVED.',
      ),
    removeTransaction: (id) =>
      write(
        () => api.removeTransaction(id),
        (current) => ({
          ...current,
          transactions: current.transactions.filter((item) => item.id !== id),
        }),
        'EXPENSE DELETED.',
      ),
    createRemittance: (values, allocations) =>
      write(
        () => api.createRemittance(user.uid, values, allocations),
        (current, result) => ({
          ...current,
          remittances: upsert(current.remittances, result.remittance, true),
          allocations: upsertMany(current.allocations, result.allocations),
        }),
        'KA-CHING. MONEY ADDED.',
      ),
    updateRemittance: (id, values, allocations) => {
      const existing = data.allocations.filter((item) => item.remittanceId === id);
      return write(
        () => api.updateRemittance(id, values, allocations, existing),
        (current, result) => ({
          ...current,
          remittances: current.remittances.map((item) =>
            item.id === id ? { ...item, ...result.remittance } : item,
          ),
          allocations: [
            ...current.allocations.filter((item) => item.remittanceId !== id),
            ...result.allocations,
          ],
        }),
        'MONEY RECEIPT UPDATED.',
      );
    },
    removeRemittance: (id) => {
      const linked = data.allocations.filter((item) => item.remittanceId === id);
      return write(
        () => api.removeRemittance(id, linked),
        (current) => ({
          ...current,
          remittances: current.remittances.filter((item) => item.id !== id),
          allocations: current.allocations.filter((item) => item.remittanceId !== id),
        }),
        'MONEY AND FUND ALLOCATION DELETED.',
      );
    },
    createTransfer: (values) =>
      write(
        () =>
          api.createTransfer(
            user.uid,
            values.fromId,
            values.toId,
            values.amount,
            values.date,
            values.note,
            values.lotUsages,
            values.sourceFundName,
          ),
        (current, result) => ({
          ...current,
          transactions: upsertMany(current.transactions, result, true),
        }),
        'TRANSFER COMPLETE.',
      ),
    allocate: (values) => {
      const remittance = data.remittances.find((item) => item.id === values.remittanceId);
      const enriched = {
        ...values,
        source: remittance?.sender || 'Money received',
        receivedAt: remittance?.receivedAt || '',
      };
      return write(
        () => api.addAllocation(enriched),
        (current, result) => ({ ...current, allocations: upsert(current.allocations, result) }),
        'MONEY LOT CREATED.',
      );
    },
    addCategory: (name) =>
      write(
        () => api.addCategory(user.uid, name),
        (current, result) => ({ ...current, categories: upsert(current.categories, result) }),
        'CATEGORY ADDED.',
      ),
    removeCategory: (category) =>
      write(
        () => api.removeCategory(user.uid, category),
        (current, hidden) => ({
          ...current,
          categories: hidden
            ? [...current.categories.filter((item) => item.id !== category.id), hidden]
            : current.categories.filter((item) => item.id !== category.id),
        }),
        'CATEGORY DELETED.',
      ),
    addMember: async (fundId, email, role) => {
      await api.addMember(fundId, email, role);
      await refresh({ forceServer: true });
      setToast({ type: 'success', message: 'MEMBER ADDED.' });
    },
    updateMember: async (id, role) => {
      await api.updateMember(id, role);
      setData((current) => ({
        ...current,
        memberships: current.memberships.map((item) => (item.id === id ? { ...item, role } : item)),
      }));
    },
    removeMember: async (id) => {
      await api.removeMember(id);
      setData((current) => ({
        ...current,
        memberships: current.memberships.filter((item) => item.id !== id),
      }));
    },
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
