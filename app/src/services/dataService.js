import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  waitForPendingWrites,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebaseDb';
import { BACKUP_COLLECTIONS, BACKUP_VERSION, receiptsForOwnedFunds } from '../lib/accountBackup';
import { dueOccurrences } from '../lib/recurring';

const withTimestamps = (values) => ({
  ...values,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
const documents = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const localNow = () => new Date().toISOString();
const DEDUPE_WINDOW_MS = 2500;
const recentMutations = new Map();
const fingerprint = (kind, input) => {
  const serialized = `${kind}:${JSON.stringify(input)}`;
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${kind}:${hash >>> 0}`;
};
const dedupeMutation = (kind, input, operation) => {
  const key = fingerprint(kind, input);
  const now = Date.now();
  const previous = recentMutations.get(key);
  if (previous && now - previous.createdAt < DEDUPE_WINDOW_MS) return previous.promise;
  const promise = Promise.resolve().then(operation);
  recentMutations.set(key, { createdAt: now, promise });
  for (const [candidate, entry] of recentMutations) {
    if (now - entry.createdAt >= DEDUPE_WINDOW_MS) recentMutations.delete(candidate);
  }
  return promise;
};
const queueWrite = (promise) => {
  promise.catch((error) =>
    window.dispatchEvent(new CustomEvent('hk-sync-error', { detail: error })),
  );
};

export const finishQueuedWrites = () => waitForPendingWrites(db);

export async function exportAccountBackup(uid) {
  await finishQueuedWrites();
  const memberships = documents(
    await getDocs(query(collection(db, 'fundMembers'), where('userId', '==', uid))),
  );
  const ownedIds = memberships.filter((item) => item.role === 'owner').map((item) => item.fundId);
  const [remittances, categories, recurringRules] = await Promise.all([
    getDocs(query(collection(db, 'remittances'), where('ownerId', '==', uid))).then(documents),
    getDocs(query(collection(db, 'categories'), where('userId', '==', uid))).then(documents),
    getDocs(query(collection(db, 'recurringRules'), where('ownerId', '==', uid))).then(documents),
  ]);
  const funds = [];
  const allocations = [];
  const transactions = [];
  await Promise.all(
    ownedIds.map(async (fundId) => {
      const [fund, fundAllocations, fundTransactions] = await Promise.all([
        getDocs(query(collection(db, 'funds'), where(documentId(), '==', fundId))).then(documents),
        getDocs(query(collection(db, 'allocations'), where('fundId', '==', fundId))).then(
          documents,
        ),
        getDocs(query(collection(db, 'transactions'), where('fundId', '==', fundId))).then(
          documents,
        ),
      ]);
      funds.push(...fund);
      allocations.push(...fundAllocations);
      transactions.push(
        ...fundTransactions.filter(
          (item) => item.type !== 'transfer' || ownedIds.includes(item.counterpartyFundId),
        ),
      );
    }),
  );
  return {
    format: 'hisabkitab-account',
    version: BACKUP_VERSION,
    userId: uid,
    exportedAt: localNow(),
    funds,
    allocations,
    transactions,
    remittances: receiptsForOwnedFunds(remittances, allocations, uid),
    categories,
    recurringRules: recurringRules.filter((item) => ownedIds.includes(item.fundId)),
  };
}

export async function restoreAccountBackup(uid, backup) {
  await finishQueuedWrites();
  const restoreKey = `hk-restore-in-progress:${uid}`;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(backup)),
  );
  const backupToken = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const resuming = localStorage.getItem(restoreKey) === backupToken;
  const current = await Promise.all([
    getDocs(query(collection(db, 'fundMembers'), where('userId', '==', uid), limit(1))),
    getDocs(query(collection(db, 'remittances'), where('ownerId', '==', uid), limit(1))),
    getDocs(query(collection(db, 'categories'), where('userId', '==', uid), limit(1))),
    getDocs(query(collection(db, 'recurringRules'), where('ownerId', '==', uid), limit(1))),
  ]);
  if (current.some((snapshot) => !snapshot.empty) && !resuming)
    throw new Error('Restore requires an empty account so existing records cannot be overwritten.');
  localStorage.setItem(restoreKey, backupToken);

  const clean = ({ id, createdAt, updatedAt, pendingSync, ...fields }) => {
    void id;
    void createdAt;
    void updatedAt;
    void pendingSync;
    return { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  };
  const cleanTransaction = (item) => {
    const fields = clean(item);
    if (fields.userId !== uid) {
      fields.originalUserId = fields.userId;
      fields.userId = uid;
    }
    return fields;
  };
  const commitRows = async (rows) => {
    for (let offset = 0; offset < rows.length; offset += 400) {
      const batch = writeBatch(db);
      const chunk = rows.slice(offset, offset + 400);
      const missing = resuming
        ? (
            await Promise.all(
              chunk.map(async (row) => ({
                ...row,
                exists: (await getDoc(doc(db, row.path))).exists(),
              })),
            )
          ).filter((row) => !row.exists)
        : chunk;
      missing.forEach(({ path, fields }) => batch.set(doc(db, path), fields));
      if (missing.length) await batch.commit();
    }
  };
  await commitRows(
    backup.funds.flatMap((fund) => [
      { path: `funds/${fund.id}`, fields: clean(fund) },
      {
        path: `fundMembers/${fund.id}_${uid}`,
        fields: { fundId: fund.id, userId: uid, role: 'owner', createdAt: serverTimestamp() },
      },
    ]),
  );
  for (const name of ['remittances', 'allocations', 'categories', 'recurringRules'])
    await commitRows(
      backup[name].map((item) => ({ path: `${name}/${item.id}`, fields: clean(item) })),
    );
  const expenses = backup.transactions.filter((item) => item.type !== 'transfer');
  await commitRows(
    expenses.map((item) => ({ path: `transactions/${item.id}`, fields: cleanTransaction(item) })),
  );
  const transfers = backup.transactions.filter((item) => item.type === 'transfer');
  const pairs = new Map();
  transfers.forEach((item) => pairs.set(item.linkId, [...(pairs.get(item.linkId) || []), item]));
  for (const pair of pairs.values()) {
    if (
      pair.length !== 2 ||
      pair[0].counterpartyId !== pair[1].id ||
      pair[1].counterpartyId !== pair[0].id
    )
      throw new Error('Backup contains an incomplete transfer.');
    await commitRows(
      pair.map((item) => ({ path: `transactions/${item.id}`, fields: cleanTransaction(item) })),
    );
  }
  localStorage.removeItem(restoreKey);
  return BACKUP_COLLECTIONS.reduce((count, name) => count + backup[name].length, 0);
}

export async function loadUserData(uid) {
  const membershipRequest = getDocs(
    query(collection(db, 'fundMembers'), where('userId', '==', uid)),
  );
  const remittanceRequest = getDocs(
    query(collection(db, 'remittances'), where('ownerId', '==', uid), limit(150)),
  );
  const categoryRequest = getDocs(query(collection(db, 'categories'), where('userId', '==', uid)));
  const recurringRequest = getDocs(
    query(collection(db, 'recurringRules'), where('ownerId', '==', uid)),
  );
  const membershipSnapshot = await membershipRequest;
  const memberships = documents(membershipSnapshot);
  const fundIds = memberships.map((membership) => membership.fundId);
  const funds = [];
  const allocations = [];
  const transactions = [];

  const chunks = Array.from({ length: Math.ceil(fundIds.length / 10) }, (_, index) =>
    fundIds.slice(index * 10, index * 10 + 10),
  );
  const chunkResults = await Promise.all(
    chunks.map(async (ids) => {
      const [fundSnapshot, allocationSnapshot, transactionSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'funds'), where(documentId(), 'in', ids))),
        getDocs(query(collection(db, 'allocations'), where('fundId', 'in', ids), limit(300))),
        getDocs(
          query(
            collection(db, 'transactions'),
            where('fundId', 'in', ids),
            orderBy('date', 'desc'),
            limit(300),
          ),
        ),
      ]);
      return {
        funds: documents(fundSnapshot),
        allocations: documents(allocationSnapshot),
        transactions: documents(transactionSnapshot),
      };
    }),
  );
  chunkResults.forEach((result) => {
    funds.push(...result.funds);
    allocations.push(...result.allocations);
    transactions.push(...result.transactions);
  });

  const [remittanceSnapshot, categorySnapshot, recurringSnapshot] = await Promise.all([
    remittanceRequest,
    categoryRequest,
    recurringRequest,
  ]);
  return {
    funds,
    memberships,
    allocations,
    transactions,
    remittances: documents(remittanceSnapshot),
    categories: documents(categorySnapshot),
    recurringRules: documents(recurringSnapshot),
  };
}

export async function createRecurringRule(uid, values) {
  const ref = doc(collection(db, 'recurringRules'));
  const rule = { ...values, ownerId: uid, active: true };
  await setDoc(ref, withTimestamps(rule));
  return { id: ref.id, ...rule };
}
export async function updateRecurringRule(id, values) {
  await updateDoc(doc(db, 'recurringRules', id), { ...values, updatedAt: serverTimestamp() });
  return { id, ...values };
}
export async function removeRecurringRule(id) {
  await deleteDoc(doc(db, 'recurringRules', id));
}

export async function processDueRecurring(uid, rules, today) {
  let created = 0;
  for (const rule of rules.filter((item) => item.active)) {
    for (const date of dueOccurrences(rule, today)) {
      const occurrenceId = `recurring_${rule.id}_${date}`;
      if (rule.type === 'expense') {
        const ref = doc(db, 'transactions', occurrenceId);
        if ((await getDoc(ref)).exists()) continue;
        await setDoc(
          ref,
          withTimestamps({
            type: 'expense',
            userId: uid,
            fundId: rule.fundId,
            amount: Number(rule.amount),
            description: rule.description,
            note: 'Recurring entry',
            date,
            categoryId: rule.categoryId || 'other',
            recurringRuleId: rule.id,
          }),
        );
      } else {
        const ref = doc(db, 'remittances', occurrenceId);
        if ((await getDoc(ref)).exists()) continue;
        const batch = writeBatch(db);
        batch.set(
          ref,
          withTimestamps({
            ownerId: uid,
            totalAmount: Number(rule.amount),
            sender: rule.description,
            note: 'Recurring income',
            receivedAt: date,
            currency: 'PKR',
            recurringRuleId: rule.id,
          }),
        );
        batch.set(doc(db, 'allocations', `${occurrenceId}_allocation`), {
          remittanceId: occurrenceId,
          fundId: rule.fundId,
          amount: Number(rule.amount),
          source: rule.description,
          receivedAt: date,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
      }
      created += 1;
    }
  }
  return created;
}

export function createFund(uid, values) {
  return dedupeMutation('create-fund', { uid, values }, () => {
    const fundRef = doc(collection(db, 'funds'));
    const batch = writeBatch(db);
    batch.set(fundRef, withTimestamps({ ...values, ownerId: uid, archived: false }));
    batch.set(doc(db, 'fundMembers', `${fundRef.id}_${uid}`), {
      fundId: fundRef.id,
      userId: uid,
      role: 'owner',
      createdAt: serverTimestamp(),
    });
    queueWrite(batch.commit());
    return {
      fund: {
        id: fundRef.id,
        ...values,
        ownerId: uid,
        archived: false,
        createdAt: localNow(),
        updatedAt: localNow(),
      },
      membership: {
        id: `${fundRef.id}_${uid}`,
        fundId: fundRef.id,
        userId: uid,
        role: 'owner',
        createdAt: localNow(),
      },
    };
  });
}

export function updateFund(id, values) {
  queueWrite(updateDoc(doc(db, 'funds', id), { ...values, updatedAt: serverTimestamp() }));
  return Promise.resolve({ id, ...values, updatedAt: localNow() });
}
export function reorderFunds(ids, funds = []) {
  const batch = writeBatch(db);
  ids.forEach((id, sortOrder) => {
    if (funds.find((fund) => fund.id === id)?.sortOrder === sortOrder) return;
    batch.update(doc(db, 'funds', id), { sortOrder, updatedAt: serverTimestamp() });
  });
  queueWrite(batch.commit());
  return Promise.resolve(ids);
}
export function removeEmptyFund(id, uid) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'fundMembers', `${id}_${uid}`));
  batch.delete(doc(db, 'funds', id));
  queueWrite(batch.commit());
  return Promise.resolve(id);
}
export function addTransaction(uid, values) {
  return dedupeMutation('add-transaction', { uid, values }, () => {
    const ref = doc(collection(db, 'transactions'));
    const createdAt = localNow();
    queueWrite(setDoc(ref, withTimestamps({ ...values, userId: uid })));
    return {
      id: ref.id,
      ...values,
      userId: uid,
      createdAt,
      updatedAt: createdAt,
      pendingSync: true,
    };
  });
}
export function updateTransaction(id, values) {
  queueWrite(updateDoc(doc(db, 'transactions', id), { ...values, updatedAt: serverTimestamp() }));
  return Promise.resolve({ id, ...values, updatedAt: localNow(), pendingSync: true });
}
export function removeTransaction(id) {
  queueWrite(deleteDoc(doc(db, 'transactions', id)));
  return Promise.resolve(id);
}

export function removeTransfer(transaction) {
  if (transaction?.type !== 'transfer' || !transaction.id || !transaction.counterpartyId)
    return Promise.reject(new Error('This transfer pair is incomplete and cannot be reversed.'));
  const batch = writeBatch(db);
  batch.delete(doc(db, 'transactions', transaction.id));
  batch.delete(doc(db, 'transactions', transaction.counterpartyId));
  queueWrite(batch.commit());
  return Promise.resolve({
    ids: [transaction.id, transaction.counterpartyId],
    linkId: transaction.linkId,
  });
}

export function createTransfer(
  uid,
  fromId,
  toId,
  amount,
  date,
  note,
  lotUsages = [],
  sourceFundName = '',
) {
  const input = { uid, fromId, toId, amount, date, note, lotUsages, sourceFundName };
  return dedupeMutation('create-transfer', input, () => {
    const batch = writeBatch(db);
    const linkId = doc(collection(db, 'transactions')).id;
    const outRef = doc(db, 'transactions', `${linkId}_out`);
    const inRef = doc(db, 'transactions', `${linkId}_in`);
    batch.set(
      outRef,
      withTimestamps({
        fundId: fromId,
        sourceFundId: fromId,
        destinationFundId: toId,
        transferDirection: 'out',
        counterpartyFundId: toId,
        counterpartyId: inRef.id,
        userId: uid,
        type: 'transfer',
        amount: -amount,
        description: 'Transfer out',
        date,
        note,
        linkId,
        lotUsages,
      }),
    );
    batch.set(
      inRef,
      withTimestamps({
        fundId: toId,
        sourceFundId: fromId,
        destinationFundId: toId,
        transferDirection: 'in',
        counterpartyFundId: fromId,
        counterpartyId: outRef.id,
        userId: uid,
        type: 'transfer',
        amount,
        description: 'Transfer in',
        date,
        note,
        linkId,
        sourceFundName,
      }),
    );
    queueWrite(batch.commit());
    const createdAt = localNow();
    return [
      {
        id: outRef.id,
        fundId: fromId,
        sourceFundId: fromId,
        destinationFundId: toId,
        transferDirection: 'out',
        counterpartyFundId: toId,
        counterpartyId: inRef.id,
        userId: uid,
        type: 'transfer',
        amount: -amount,
        description: 'Transfer out',
        date,
        note,
        linkId,
        lotUsages,
        createdAt,
      },
      {
        id: inRef.id,
        fundId: toId,
        sourceFundId: fromId,
        destinationFundId: toId,
        transferDirection: 'in',
        counterpartyFundId: fromId,
        counterpartyId: outRef.id,
        userId: uid,
        type: 'transfer',
        amount,
        description: 'Transfer in',
        date,
        note,
        linkId,
        sourceFundName,
        createdAt,
      },
    ];
  });
}

export function createRemittance(uid, values, allocations) {
  return dedupeMutation('create-remittance', { uid, values, allocations }, () => {
    const remittanceRef = doc(collection(db, 'remittances'));
    const batch = writeBatch(db);
    batch.set(remittanceRef, withTimestamps({ ...values, ownerId: uid, currency: 'PKR' }));
    const allocationRows = allocations
      .filter((item) => item.amount > 0)
      .map((item) => ({ ref: doc(collection(db, 'allocations')), item }));
    allocationRows.forEach(({ ref, item }) =>
      batch.set(ref, {
        remittanceId: remittanceRef.id,
        fundId: item.fundId,
        amount: Number(item.amount),
        source: values.sender,
        receivedAt: values.receivedAt,
        createdAt: serverTimestamp(),
      }),
    );
    queueWrite(batch.commit());
    const createdAt = localNow();
    return {
      remittance: { id: remittanceRef.id, ...values, ownerId: uid, currency: 'PKR', createdAt },
      allocations: allocationRows.map(({ ref, item }) => ({
        id: ref.id,
        remittanceId: remittanceRef.id,
        fundId: item.fundId,
        amount: Number(item.amount),
        source: values.sender,
        receivedAt: values.receivedAt,
        createdAt,
      })),
    };
  });
}

export function updateRemittance(id, values, allocations, existingAllocations = []) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'remittances', id), { ...values, updatedAt: serverTimestamp() });
  const existingByFund = new Map(existingAllocations.map((item) => [item.fundId, item]));
  const nextFundIds = new Set();
  const nextAllocations = allocations
    .filter((item) => Number(item.amount) > 0)
    .map((item) => {
      nextFundIds.add(item.fundId);
      const existing = existingByFund.get(item.fundId);
      const ref = existing
        ? doc(db, 'allocations', existing.id)
        : doc(collection(db, 'allocations'));
      const allocation = {
        remittanceId: id,
        fundId: item.fundId,
        amount: Number(item.amount),
        source: values.sender,
        receivedAt: values.receivedAt,
      };
      existing
        ? batch.update(ref, { ...allocation, updatedAt: serverTimestamp() })
        : batch.set(ref, { ...allocation, createdAt: serverTimestamp() });
      return {
        id: ref.id,
        ...allocation,
        createdAt: existing?.createdAt || localNow(),
        updatedAt: localNow(),
      };
    });
  existingAllocations
    .filter((item) => !nextFundIds.has(item.fundId))
    .forEach((item) => batch.delete(doc(db, 'allocations', item.id)));
  queueWrite(batch.commit());
  return Promise.resolve({
    remittance: { id, ...values, updatedAt: localNow() },
    allocations: nextAllocations,
  });
}

export function removeRemittance(id, allocations = []) {
  const batch = writeBatch(db);
  allocations.forEach((item) => batch.delete(doc(db, 'allocations', item.id)));
  batch.delete(doc(db, 'remittances', id));
  queueWrite(batch.commit());
  return Promise.resolve(id);
}

export function addAllocation(values) {
  return dedupeMutation('add-allocation', values, () => {
    const ref = doc(collection(db, 'allocations'));
    queueWrite(setDoc(ref, { ...values, createdAt: serverTimestamp() }));
    return { id: ref.id, ...values, createdAt: localNow() };
  });
}
export function addCategory(uid, name, symbol = '◆') {
  return dedupeMutation('add-category', { uid, name, symbol }, () => {
    const ref = doc(collection(db, 'categories'));
    queueWrite(setDoc(ref, { userId: uid, name, symbol, createdAt: serverTimestamp() }));
    return { id: ref.id, userId: uid, name, symbol, createdAt: localNow() };
  });
}
export function removeCategory(uid, category) {
  if (category.system) {
    const id = `${uid}_${category.id}`;
    const hidden = {
      id,
      systemId: category.id,
      userId: uid,
      name: category.name,
      symbol: category.symbol,
      hidden: true,
      updatedAt: localNow(),
    };
    queueWrite(
      setDoc(doc(db, 'categories', id), {
        systemId: category.id,
        userId: uid,
        name: category.name,
        symbol: category.symbol,
        hidden: true,
        updatedAt: serverTimestamp(),
      }),
    );
    return Promise.resolve(hidden);
  }
  queueWrite(deleteDoc(doc(db, 'categories', category.id)));
  return Promise.resolve(null);
}

export async function addMember(fundId, email, role) {
  const profileSnapshot = await getDocs(
    query(collection(db, 'publicProfiles'), where('email', '==', email), limit(1)),
  );
  if (profileSnapshot.empty) throw new Error('No registered user found with that email.');
  const profile = profileSnapshot.docs[0];
  await setDoc(doc(db, 'fundMembers', `${fundId}_${profile.id}`), {
    fundId,
    userId: profile.id,
    displayName: profile.data().displayName,
    email: profile.data().email,
    role,
    createdAt: serverTimestamp(),
  });
}

export const updateMember = (id, role) => {
  queueWrite(updateDoc(doc(db, 'fundMembers', id), { role }));
  return Promise.resolve();
};
export const removeMember = (id) => {
  queueWrite(deleteDoc(doc(db, 'fundMembers', id)));
  return Promise.resolve();
};
