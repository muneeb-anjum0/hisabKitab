import {
  addDoc, collection, deleteDoc, doc, documentId, getDocs, limit, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const withTimestamps = (values) => ({ ...values, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
const documents = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const localNow = () => new Date().toISOString();

export async function loadUserData(uid) {
  const membershipSnapshot = await getDocs(query(collection(db, 'fundMembers'), where('userId', '==', uid)));
  const memberships = documents(membershipSnapshot);
  const fundIds = memberships.map((membership) => membership.fundId);
  const funds = []; const allocations = []; const transactions = [];

  const chunks = Array.from({ length: Math.ceil(fundIds.length / 10) }, (_, index) => fundIds.slice(index * 10, index * 10 + 10));
  const chunkResults = await Promise.all(chunks.map(async (ids) => {
    const [fundSnapshot, allocationSnapshot, transactionSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'funds'), where(documentId(), 'in', ids))),
      getDocs(query(collection(db, 'allocations'), where('fundId', 'in', ids), limit(300))),
      getDocs(query(collection(db, 'transactions'), where('fundId', 'in', ids), orderBy('date', 'desc'), limit(300))),
    ]);
    return { funds: documents(fundSnapshot), allocations: documents(allocationSnapshot), transactions: documents(transactionSnapshot) };
  }));
  chunkResults.forEach((result) => { funds.push(...result.funds); allocations.push(...result.allocations); transactions.push(...result.transactions); });

  const [remittanceSnapshot, categorySnapshot] = await Promise.all([
    getDocs(query(collection(db, 'remittances'), where('ownerId', '==', uid), limit(150))),
    getDocs(query(collection(db, 'categories'), where('userId', '==', uid))),
  ]);
  return { funds, memberships, allocations, transactions, remittances: documents(remittanceSnapshot), categories: documents(categorySnapshot) };
}

export async function createFund(uid, values) {
  const fundRef = doc(collection(db, 'funds'));
  const batch = writeBatch(db);
  batch.set(fundRef, withTimestamps({ ...values, ownerId: uid, archived: false }));
  batch.set(doc(db, 'fundMembers', `${fundRef.id}_${uid}`), { fundId: fundRef.id, userId: uid, role: 'owner', createdAt: serverTimestamp() });
  await batch.commit();
  return {
    fund: { id: fundRef.id, ...values, ownerId: uid, archived: false, createdAt: localNow(), updatedAt: localNow() },
    membership: { id: `${fundRef.id}_${uid}`, fundId: fundRef.id, userId: uid, role: 'owner', createdAt: localNow() },
  };
}

export async function updateFund(id, values) { await updateDoc(doc(db, 'funds', id), { ...values, updatedAt: serverTimestamp() }); return { id, ...values, updatedAt: localNow() }; }
export async function reorderFunds(ids, funds = []) {
  const batch = writeBatch(db);
  ids.forEach((id, sortOrder) => {
    if (funds.find((fund) => fund.id === id)?.sortOrder === sortOrder) return;
    batch.update(doc(db, 'funds', id), { sortOrder, updatedAt: serverTimestamp() });
  });
  await batch.commit();
  return ids;
}
export async function removeEmptyFund(id, uid) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'fundMembers', `${id}_${uid}`));
  batch.delete(doc(db, 'funds', id));
  await batch.commit();
  return id;
}
export async function addTransaction(uid, values) {
  const ref = await addDoc(collection(db, 'transactions'), withTimestamps({ ...values, userId: uid }));
  return { id: ref.id, ...values, userId: uid, createdAt: localNow(), updatedAt: localNow() };
}
export async function updateTransaction(id, values) {
  await updateDoc(doc(db, 'transactions', id), { ...values, updatedAt: serverTimestamp() });
  return { id, ...values, updatedAt: localNow() };
}
export async function removeTransaction(id) { await deleteDoc(doc(db, 'transactions', id)); return id; }

export async function createTransfer(uid, fromId, toId, amount, date, note, lotUsages = [], sourceFundName = '') {
  const batch = writeBatch(db);
  const linkId = doc(collection(db, 'transactions')).id;
  const outRef = doc(db, 'transactions', `${linkId}_out`);
  const inRef = doc(db, 'transactions', `${linkId}_in`);
  batch.set(outRef, withTimestamps({ fundId: fromId, counterpartyFundId: toId, counterpartyId: inRef.id, userId: uid, type: 'transfer', amount: -amount, description: 'Transfer out', date, note, linkId, lotUsages }));
  batch.set(inRef, withTimestamps({ fundId: toId, counterpartyFundId: fromId, counterpartyId: outRef.id, userId: uid, type: 'transfer', amount, description: 'Transfer in', date, note, linkId, sourceFundName }));
  await batch.commit();
  const createdAt = localNow();
  return [
    { id: outRef.id, fundId: fromId, counterpartyFundId: toId, counterpartyId: inRef.id, userId: uid, type: 'transfer', amount: -amount, description: 'Transfer out', date, note, linkId, lotUsages, createdAt },
    { id: inRef.id, fundId: toId, counterpartyFundId: fromId, counterpartyId: outRef.id, userId: uid, type: 'transfer', amount, description: 'Transfer in', date, note, linkId, sourceFundName, createdAt },
  ];
}

export async function createRemittance(uid, values, allocations) {
  const remittanceRef = doc(collection(db, 'remittances'));
  const batch = writeBatch(db);
  batch.set(remittanceRef, withTimestamps({ ...values, ownerId: uid, currency: 'PKR' }));
  const allocationRows = allocations.filter((item) => item.amount > 0).map((item) => ({ ref: doc(collection(db, 'allocations')), item }));
  allocationRows.forEach(({ ref, item }) => batch.set(ref, { remittanceId: remittanceRef.id, fundId: item.fundId, amount: Number(item.amount), source: values.sender, receivedAt: values.receivedAt, createdAt: serverTimestamp() }));
  await batch.commit();
  const createdAt = localNow();
  return {
    remittance: { id: remittanceRef.id, ...values, ownerId: uid, currency: 'PKR', createdAt },
    allocations: allocationRows.map(({ ref, item }) => ({ id: ref.id, remittanceId: remittanceRef.id, fundId: item.fundId, amount: Number(item.amount), source: values.sender, receivedAt: values.receivedAt, createdAt })),
  };
}

export async function updateRemittance(id, values, allocations, existingAllocations = []) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'remittances', id), { ...values, updatedAt: serverTimestamp() });
  const existingByFund = new Map(existingAllocations.map((item) => [item.fundId, item]));
  const nextFundIds = new Set();
  const nextAllocations = allocations.filter((item) => Number(item.amount) > 0).map((item) => {
    nextFundIds.add(item.fundId);
    const existing = existingByFund.get(item.fundId);
    const ref = existing ? doc(db, 'allocations', existing.id) : doc(collection(db, 'allocations'));
    const allocation = { remittanceId: id, fundId: item.fundId, amount: Number(item.amount), source: values.sender, receivedAt: values.receivedAt };
    existing ? batch.update(ref, { ...allocation, updatedAt: serverTimestamp() }) : batch.set(ref, { ...allocation, createdAt: serverTimestamp() });
    return { id: ref.id, ...allocation, createdAt: existing?.createdAt || localNow(), updatedAt: localNow() };
  });
  existingAllocations.filter((item) => !nextFundIds.has(item.fundId)).forEach((item) => batch.delete(doc(db, 'allocations', item.id)));
  await batch.commit();
  return { remittance: { id, ...values, updatedAt: localNow() }, allocations: nextAllocations };
}

export async function removeRemittance(id, allocations = []) {
  const batch = writeBatch(db);
  allocations.forEach((item) => batch.delete(doc(db, 'allocations', item.id)));
  batch.delete(doc(db, 'remittances', id));
  await batch.commit();
  return id;
}

export async function addAllocation(values) { const ref = await addDoc(collection(db, 'allocations'), { ...values, createdAt: serverTimestamp() }); return { id: ref.id, ...values, createdAt: localNow() }; }
export async function addCategory(uid, name, symbol = '◆') { const ref = await addDoc(collection(db, 'categories'), { userId: uid, name, symbol, createdAt: serverTimestamp() }); return { id: ref.id, userId: uid, name, symbol, createdAt: localNow() }; }

export async function addMember(fundId, email, role) {
  const profileSnapshot = await getDocs(query(collection(db, 'publicProfiles'), where('email', '==', email), limit(1)));
  if (profileSnapshot.empty) throw new Error('No registered user found with that email.');
  const profile = profileSnapshot.docs[0];
  await setDoc(doc(db, 'fundMembers', `${fundId}_${profile.id}`), {
    fundId, userId: profile.id, displayName: profile.data().displayName,
    email: profile.data().email, role, createdAt: serverTimestamp(),
  });
}

export const updateMember = (id, role) => updateDoc(doc(db, 'fundMembers', id), { role });
export const removeMember = (id) => deleteDoc(doc(db, 'fundMembers', id));
