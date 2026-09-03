import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/dataService';

const DataContext = createContext(null);
const EMPTY_DATA = {
  funds: [], memberships: [], remittances: [], allocations: [], transactions: [], categories: [],
};
const SYSTEM_CATEGORIES = [
  ['food', 'Food', '●'], ['groceries', 'Groceries', '▦'], ['fuel', 'Fuel', '▲'],
  ['bills', 'Bills', '⚡'], ['internet', 'Internet', '@'], ['shopping', 'Shopping', '★'],
  ['university', 'University', '✎'], ['transport', 'Transport', '➜'], ['medical', 'Medical', '+'],
  ['entertainment', 'Entertainment', '♪'], ['home', 'Home', '⌂'], ['other', 'Other', '◆'],
].map(([id, name, symbol]) => ({ id, name, symbol, system: true }));

export function DataProvider({ children }) {
  const { user, configured } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const refresh = useCallback(async () => {
    if (!configured || !user) {
      setData(EMPTY_DATA);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await api.loadUserData(user.uid));
      setError('');
    } catch (loadError) {
      console.error(loadError);
      setError('Could not load your ledger. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [configured, user]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const runWrite = async (operation, successMessage) => {
    setError('');
    try {
      const result = await operation();
      await refresh();
      setToast({ type: 'success', message: successMessage });
      return result;
    } catch (writeError) {
      console.error(writeError);
      const message = writeError.message || "Couldn't save that. Check your connection and try again.";
      setToast({ type: 'error', message });
      throw writeError;
    }
  };

  const categories = useMemo(() => {
    const customIds = new Set(data.categories.map((category) => category.id));
    return [...SYSTEM_CATEGORIES.filter((category) => !customIds.has(category.id)), ...data.categories];
  }, [data.categories]);

  const value = {
    ...data, categories, loading, error, toast, setToast, refresh,
    createFund: (values) => runWrite(() => api.createFund(user.uid, values), 'FUND CREATED.'),
    updateFund: (id, values) => runWrite(() => api.updateFund(id, values), 'CHANGES SAVED.'),
    addTransaction: (values) => runWrite(() => api.addTransaction(user.uid, values), 'EXPENSE SAVED.'),
    updateTransaction: (id, values) => runWrite(() => api.updateTransaction(id, values), 'CHANGES SAVED.'),
    removeTransaction: (id) => runWrite(() => api.removeTransaction(id), 'EXPENSE DELETED.'),
    createRemittance: (values, allocations) => runWrite(
      () => api.createRemittance(user.uid, values, allocations), 'MONEY ADDED.',
    ),
    createTransfer: (values) => runWrite(
      () => api.createTransfer(user.uid, values.fromId, values.toId, values.amount, values.date, values.note),
      'TRANSFER COMPLETE.',
    ),
    allocate: (values) => runWrite(() => api.addAllocation(values), 'MONEY ALLOCATED.'),
    addCategory: (name) => runWrite(() => api.addCategory(user.uid, name), 'CATEGORY ADDED.'),
    addMember: (fundId, email, role) => runWrite(() => api.addMember(fundId, email, role), 'MEMBER ADDED.'),
    updateMember: (id, role) => runWrite(() => api.updateMember(id, role), 'ROLE UPDATED.'),
    removeMember: (id) => runWrite(() => api.removeMember(id), 'MEMBER REMOVED.'),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() { return useContext(DataContext); }
