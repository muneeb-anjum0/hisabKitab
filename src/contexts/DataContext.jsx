import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/dataService';
import { canDeleteRemittance, fundDeletionAssessment, patchFund } from '../lib/calculations';

const DataContext = createContext(null);
const EMPTY_DATA = { funds: [], memberships: [], remittances: [], allocations: [], transactions: [], categories: [] };
const SYSTEM_CATEGORIES = [
  ['food', 'Food', '●'], ['groceries', 'Groceries', '▦'], ['fuel', 'Fuel', '▲'], ['bills', 'Bills', '⚡'],
  ['internet', 'Internet', '@'], ['shopping', 'Shopping', '★'], ['university', 'University', '✎'],
  ['transport', 'Transport', '➜'], ['medical', 'Medical', '+'], ['entertainment', 'Entertainment', '♪'],
  ['home', 'Home', '⌂'], ['other', 'Other', '◆'],
].map(([id, name, symbol]) => ({ id, name, symbol, system: true }));

function withTimeout(operation) {
  return Promise.race([operation, new Promise((_, reject) => window.setTimeout(
    () => reject(new Error('Firestore did not respond. Confirm that the database exists and its rules are deployed.')), 12000,
  ))]);
}

export function DataProvider({ children }) {
  const { user, configured } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const reorderQueue = useRef(Promise.resolve());
  const reorderVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (!configured || !user) { setData(EMPTY_DATA); setLoading(false); return; }
    setLoading(true);
    try { setData(await withTimeout(api.loadUserData(user.uid))); setError(''); }
    catch (loadError) { console.error(loadError); setError(loadError.message || 'Could not load your ledger.'); }
    finally { setLoading(false); }
  }, [configured, user]);

  useEffect(() => { refresh(); }, [refresh]);
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
      setToast({ type: 'success', message });
      return result;
    } catch (writeError) {
      console.error(writeError);
      setToast({ type: 'error', message: writeError.message || "COULDN'T SAVE THAT." });
      throw writeError;
    }
  };

  const categories = useMemo(() => {
    const customIds = new Set(data.categories.map((item) => item.id));
    return [...SYSTEM_CATEGORIES.filter((item) => !customIds.has(item.id)), ...data.categories];
  }, [data.categories]);

  const value = {
    ...data, categories, loading, error, toast, setToast, refresh,
    createFund: (values) => { const sortOrder = Math.max(-1, ...data.funds.filter((fund) => !fund.archived).map((fund) => Number.isFinite(fund.sortOrder) ? fund.sortOrder : -1)) + 1; const orderedValues = { ...values, sortOrder }; return write(() => api.createFund(user.uid, orderedValues), (current, result) => ({ ...current, funds: [...current.funds, result.fund], memberships: [...current.memberships, result.membership] }), 'NEW FUND. STAMPED IN.'); },
    updateFund: (id, values) => write(() => api.updateFund(id, values), (current, result) => ({ ...current, funds: patchFund(current.funds, id, result) }), 'CHANGES SAVED.'),
    reorderFunds: async (ids) => {
      const previousFunds = data.funds;
      const previousOrders = new Map(previousFunds.map((fund) => [fund.id, fund.sortOrder]));
      const version = ++reorderVersion.current;
      const applyOrder = (funds) => funds.map((fund) => { const sortOrder = ids.indexOf(fund.id); return sortOrder < 0 ? fund : { ...fund, sortOrder }; });
      setData((current) => ({ ...current, funds: applyOrder(current.funds) }));
      try {
        const save = reorderQueue.current.then(() => api.reorderFunds(ids, previousFunds));
        reorderQueue.current = save.catch(() => {});
        await save;
        if (version === reorderVersion.current) setToast({ type: 'success', message: 'FUND ORDER SAVED.' });
      } catch (writeError) {
        console.error(writeError);
        if (version === reorderVersion.current) {
          setData((current) => ({ ...current, funds: current.funds.map((fund) => previousOrders.has(fund.id) ? { ...fund, sortOrder: previousOrders.get(fund.id) } : fund) }));
          setToast({ type: 'error', message: "COULDN'T SAVE FUND ORDER. YOUR PREVIOUS ORDER WAS RESTORED." });
        }
        throw writeError;
      }
    },
    removeFund: (id) => {
      if (!fundDeletionAssessment(id, data).empty) return Promise.reject(new Error('This Fund has history. Archive it instead.'));
      return write(() => api.removeEmptyFund(id, user.uid), (current) => ({ ...current, funds: current.funds.filter((item) => item.id !== id), memberships: current.memberships.filter((item) => item.fundId !== id) }), 'EMPTY FUND DELETED.');
    },
    addTransaction: (values) => write(() => api.addTransaction(user.uid, values), (current, result) => ({ ...current, transactions: [result, ...current.transactions] }), 'SPENT. SAVED.'),
    updateTransaction: (id, values) => write(() => api.updateTransaction(id, values), (current, result) => ({ ...current, transactions: current.transactions.map((item) => item.id === id ? { ...item, ...result } : item) }), 'CHANGES SAVED.'),
    removeTransaction: (id) => write(() => api.removeTransaction(id), (current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }), 'EXPENSE DELETED.'),
    createRemittance: (values, allocations) => write(() => api.createRemittance(user.uid, values, allocations), (current, result) => ({ ...current, remittances: [result.remittance, ...current.remittances], allocations: [...current.allocations, ...result.allocations] }), 'KA-CHING. MONEY ADDED.'),
    removeRemittance: (id) => {
      if (!canDeleteRemittance(id, data.allocations)) return Promise.reject(new Error('This money has Fund history and cannot be deleted.'));
      return write(() => api.removeRemittance(id), (current) => ({ ...current, remittances: current.remittances.filter((item) => item.id !== id) }), 'MONEY RECEIPT DELETED.');
    },
    createTransfer: (values) => write(() => api.createTransfer(user.uid, values.fromId, values.toId, values.amount, values.date, values.note, values.lotUsages, values.sourceFundName), (current, result) => ({ ...current, transactions: [...result, ...current.transactions] }), 'TRANSFER COMPLETE.'),
    allocate: (values) => {
      const remittance = data.remittances.find((item) => item.id === values.remittanceId);
      const enriched = { ...values, source: remittance?.sender || 'Money received', receivedAt: remittance?.receivedAt || '' };
      return write(() => api.addAllocation(enriched), (current, result) => ({ ...current, allocations: [...current.allocations, result] }), 'MONEY LOT CREATED.');
    },
    addCategory: (name) => write(() => api.addCategory(user.uid, name), (current, result) => ({ ...current, categories: [...current.categories, result] }), 'CATEGORY ADDED.'),
    addMember: async (fundId, email, role) => { await api.addMember(fundId, email, role); await refresh(); setToast({ type: 'success', message: 'MEMBER ADDED.' }); },
    updateMember: async (id, role) => { await api.updateMember(id, role); setData((current) => ({ ...current, memberships: current.memberships.map((item) => item.id === id ? { ...item, role } : item) })); },
    removeMember: async (id) => { await api.removeMember(id); setData((current) => ({ ...current, memberships: current.memberships.filter((item) => item.id !== id) })); },
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() { return useContext(DataContext); }
