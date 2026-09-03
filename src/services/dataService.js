import {
  addDoc, collection, deleteDoc, doc, documentId, getDocs, limit, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const withTimestamps = (values) => ({ ...values, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
const documents = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export async function loadUserData(uid) {
  const membershipSnapshot = await getDocs(query(collection(db, 'fundMembers'), where('userId', '==', uid)));
  const memberships = documents(membershipSnapshot);
  const fundIds = memberships.map((membership) => membership.fundId);
  const funds = []; const allocations = []; const transactions = [];

  for (let index = 0; index < fundIds.length; index += 10) {
    const ids = fundIds.slice(index, index + 10);
    const [fundSnapshot, allocationSnapshot, transactionSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'funds'), where(documentId(), 'in', ids))),
      getDocs(query(collection(db, 'allocations'), where('fundId', 'in', ids), limit(300))),
      getDocs(query(collection(db, 'transactions'), where('fundId', 'in', ids), orderBy('date', 'desc'), limit(300))),
    ]);
    funds.push(...documents(fundSnapshot));
    allocations.push(...documents(allocationSnapshot));
    transactions.push(...documents(transactionSnapshot));
  }

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
  return fundRef.id;
}

export const updateFund = (id, values) => updateDoc(doc(db, 'funds', id), { ...values, updatedAt: serverTimestamp() });
export const addTransaction = (uid, values) => addDoc(collection(db, 'transactions'), withTimestamps({ ...values, userId: uid }));
export const updateTransaction = (id, values) => updateDoc(doc(db, 'transactions', id), { ...values, updatedAt: serverTimestamp() });
export const removeTransaction = (id) => deleteDoc(doc(db, 'transactions', id));

export async function createTransfer(uid, fromId, toId, amount, date, note) {
  const batch = writeBatch(db);
  const linkId = doc(collection(db, 'transactions')).id;
  const outRef = doc(db, 'transactions', `${linkId}_out`);
  const inRef = doc(db, 'transactions', `${linkId}_in`);
  batch.set(outRef, withTimestamps({ fundId: fromId, counterpartyFundId: toId, counterpartyId: inRef.id, userId: uid, type: 'transfer', amount: -amount, description: 'Transfer out', date, note, linkId }));
  batch.set(inRef, withTimestamps({ fundId: toId, counterpartyFundId: fromId, counterpartyId: outRef.id, userId: uid, type: 'transfer', amount, description: 'Transfer in', date, note, linkId }));
  await batch.commit();
}

export async function createRemittance(uid, values, allocations) {
  const remittanceRef = doc(collection(db, 'remittances'));
  const batch = writeBatch(db);
  batch.set(remittanceRef, withTimestamps({ ...values, ownerId: uid, currency: 'PKR' }));
  allocations.filter((item) => item.amount > 0).forEach((item) => {
    batch.set(doc(collection(db, 'allocations')), { remittanceId: remittanceRef.id, fundId: item.fundId, amount: Number(item.amount), createdAt: serverTimestamp() });
  });
  await batch.commit();
}

export const addAllocation = (values) => addDoc(collection(db, 'allocations'), { ...values, createdAt: serverTimestamp() });
export const addCategory = (uid, name, symbol = '◆') => addDoc(collection(db, 'categories'), { userId: uid, name, symbol, createdAt: serverTimestamp() });

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
