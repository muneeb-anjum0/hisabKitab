import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

let environment;
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-hisabkitab',
    firestore: { rules: readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8') },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'funds', 'alice-fund'), {
      ownerId: 'alice',
      name: 'House',
      type: 'personal',
      accent: 'red',
      archived: false,
    });
    await setDoc(doc(database, 'fundMembers', 'alice-fund_alice'), {
      fundId: 'alice-fund',
      userId: 'alice',
      role: 'owner',
    });
    await setDoc(doc(database, 'fundMembers', 'alice-fund_bob'), {
      fundId: 'alice-fund',
      userId: 'bob',
      role: 'viewer',
    });
    await setDoc(doc(database, 'categories', 'alice-category'), {
      userId: 'alice',
      name: 'Bills',
      symbol: '◆',
    });
  });
});
after(async () => environment?.cleanup());

test('account data is visible only to its owner', async () => {
  const alice = environment.authenticatedContext('alice').firestore();
  const bob = environment.authenticatedContext('bob').firestore();
  await assertSucceeds(getDoc(doc(alice, 'categories', 'alice-category')));
  await assertFails(getDoc(doc(bob, 'categories', 'alice-category')));
});

test('members can read a fund, but viewers cannot edit it', async () => {
  const bob = environment.authenticatedContext('bob').firestore();
  await assertSucceeds(getDoc(doc(bob, 'funds', 'alice-fund')));
  await assertFails(
    setDoc(doc(bob, 'transactions', 'viewer-expense'), {
      type: 'expense',
      fundId: 'alice-fund',
      userId: 'bob',
      amount: 200,
      description: 'Lunch',
      note: '',
      date: '2026-11-27',
      categoryId: 'food',
    }),
  );
});

test('fund owners can record expenses but strangers cannot read the fund', async () => {
  const alice = environment.authenticatedContext('alice').firestore();
  const stranger = environment.authenticatedContext('stranger').firestore();
  await assertSucceeds(
    setDoc(doc(alice, 'transactions', 'owner-expense'), {
      type: 'expense',
      fundId: 'alice-fund',
      userId: 'alice',
      amount: 200,
      description: 'Lunch',
      note: '',
      date: '2026-11-27',
      categoryId: 'food',
    }),
  );
  await assertFails(getDoc(doc(stranger, 'funds', 'alice-fund')));
});

test('only an editor can create a recurring rule for a fund', async () => {
  const alice = environment.authenticatedContext('alice').firestore();
  const bob = environment.authenticatedContext('bob').firestore();
  const fields = {
    ownerId: 'alice',
    fundId: 'alice-fund',
    type: 'expense',
    amount: 500,
    description: 'Rent',
    startDate: '2026-11-01',
    day: 12,
    active: true,
  };
  await assertSucceeds(setDoc(doc(alice, 'recurringRules', 'rent'), fields));
  await assertFails(setDoc(doc(bob, 'recurringRules', 'fake'), { ...fields, ownerId: 'bob' }));
  await assertFails(updateDoc(doc(bob, 'recurringRules', 'rent'), { amount: 1 }));
  await assertSucceeds(updateDoc(doc(alice, 'recurringRules', 'rent'), { active: false }));
});

test('only a fund owner can set a monthly spending limit', async () => {
  const alice = environment.authenticatedContext('alice').firestore();
  const bob = environment.authenticatedContext('bob').firestore();
  await assertFails(updateDoc(doc(bob, 'funds', 'alice-fund'), { monthlyBudget: 1 }));
  await assertSucceeds(updateDoc(doc(alice, 'funds', 'alice-fund'), { monthlyBudget: 1000 }));
});

test('an account owner can restore a Fund and its first money lot', async () => {
  const charlie = environment.authenticatedContext('charlie').firestore();
  const batch = writeBatch(charlie);
  batch.set(doc(charlie, 'funds', 'restored-fund'), {
    ownerId: 'charlie',
    name: 'Restored',
    type: 'personal',
    accent: 'red',
    archived: false,
  });
  batch.set(doc(charlie, 'fundMembers', 'restored-fund_charlie'), {
    fundId: 'restored-fund',
    userId: 'charlie',
    role: 'owner',
  });
  await assertSucceeds(batch.commit());
  const moneyBatch = writeBatch(charlie);
  moneyBatch.set(doc(charlie, 'remittances', 'restored-income'), {
    ownerId: 'charlie',
    totalAmount: 1000,
    sender: 'Salary',
    note: '',
    receivedAt: '2026-11-27',
    currency: 'PKR',
  });
  moneyBatch.set(doc(charlie, 'allocations', 'restored-lot'), {
    remittanceId: 'restored-income',
    fundId: 'restored-fund',
    amount: 1000,
    source: 'Salary',
    receivedAt: '2026-11-27',
  });
  await assertSucceeds(moneyBatch.commit());
});
