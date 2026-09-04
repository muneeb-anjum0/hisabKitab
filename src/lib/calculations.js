export const sum = (items, select = (item) => item) => items.reduce(
  (total, item) => total + (Number(select(item)) || 0), 0,
);

export const timestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return new Date(value).getTime() || 0;
};

export function fundTotals(fundId, allocations, transactions) {
  const allocated = sum(allocations.filter((item) => item.fundId === fundId), (item) => item.amount);
  let spent = 0; let adjustments = 0;
  transactions.filter((item) => item.fundId === fundId).forEach((item) => {
    if (item.type === 'expense') spent += Number(item.amount);
    if (item.type === 'adjustment' || item.type === 'transfer') adjustments += Number(item.amount);
  });
  return { allocated, spent, adjustments, remaining: allocated - spent + adjustments };
}

export function fundCardState({ allocated, remaining, adjustments = 0 }) {
  if (remaining < 0) return { kind: 'overspent', label: 'OVERSPENT', overBy: Math.abs(remaining), percentage: null };
  if (allocated <= 0 && adjustments <= 0) return { kind: 'empty', label: 'NO MONEY YET', percentage: null };
  const denominator = allocated + Math.max(0, adjustments);
  if (denominator <= 0 || remaining > denominator) return { kind: 'inflow', label: 'TRANSFERRED IN', percentage: null };
  const percentage = Math.round(Math.min(100, Math.max(0, remaining / denominator * 100)));
  return { kind: 'normal', label: `${percentage}% LEFT`, percentage };
}

export function fundDeletionAssessment(fundId, data) {
  const allocations = data.allocations.filter((item) => item.fundId === fundId);
  const transactions = data.transactions.filter((item) => item.fundId === fundId || item.counterpartyFundId === fundId);
  const memberships = data.memberships.filter((item) => item.fundId === fundId);
  const totals = fundTotals(fundId, data.allocations, data.transactions);
  const transferCount = transactions.filter((item) => item.type === 'transfer').length;
  const sharedMembers = memberships.filter((item) => item.role !== 'owner').length;
  const moneyLots = allocations.length + transactions.filter((item) => item.fundId === fundId && item.type === 'transfer' && Number(item.amount) > 0).length;
  const empty = allocations.length === 0 && transactions.length === 0 && sharedMembers === 0 && Math.abs(totals.remaining) < 0.005;
  return { empty, totals, allocationCount: allocations.length, transactionCount: transactions.length, transferCount, sharedMembers, moneyLots };
}

export function patchFund(funds, id, values) {
  return funds.map((fund) => fund.id === id ? { ...fund, ...values } : fund);
}

export function canDeleteRemittance(remittanceId, allocations) {
  return !allocations.some((item) => item.remittanceId === remittanceId);
}

export function sortFunds(funds) {
  return [...funds].sort((a, b) => {
    const order = (Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER);
    if (order) return order;
    const created = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    return created || String(a.id).localeCompare(String(b.id));
  });
}

export function moveFund(ids, id, direction) {
  const from = ids.indexOf(id); const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids]; [next[from], next[to]] = [next[to], next[from]]; return next;
}

export function placeFund(ids, draggedId, targetId) {
  if (draggedId === targetId || !ids.includes(draggedId) || !ids.includes(targetId)) return ids;
  const movingForward = ids.indexOf(draggedId) < ids.indexOf(targetId);
  const next = ids.filter((id) => id !== draggedId);
  next.splice(next.indexOf(targetId) + (movingForward ? 1 : 0), 0, draggedId);
  return next;
}

export function unallocatedTotal(remittances, allocations) {
  return sum(remittances, (item) => item.totalAmount) - sum(allocations, (item) => item.amount);
}

export function portfolioTotals(funds, allocations, transactions, remittances = []) {
  const rows = funds.filter((fund) => !fund.archived).map((fund) => ({
    ...fund, ...fundTotals(fund.id, allocations, transactions),
  }));
  return {
    funds: rows,
    allocated: sum(rows, (row) => row.allocated),
    spent: sum(rows, (row) => row.spent),
    remaining: sum(rows, (row) => row.remaining),
    received: sum(remittances, (item) => item.totalAmount),
    unallocated: unallocatedTotal(remittances, allocations),
  };
}

export function monthlyTotals(month, transactions, remittances) {
  const expenses = transactions.filter((item) => item.type === 'expense' && String(item.date).startsWith(month));
  const income = remittances.filter((item) => String(item.receivedAt).startsWith(month));
  const received = sum(income, (item) => item.totalAmount);
  const spent = sum(expenses, (item) => item.amount);
  return { received, spent, remaining: received - spent };
}

/** Existing allocations are canonical Money Lots. Positive transfers are derived transfer lots. */
export function buildMoneyLots(fundId, allocations, remittances, transactions) {
  const remittanceMap = new Map(remittances.map((item) => [item.id, item]));
  const allocationLots = allocations.filter((item) => item.fundId === fundId).map((allocation) => {
    const remittance = remittanceMap.get(allocation.remittanceId) || {};
    return {
      id: allocation.id,
      allocationId: allocation.id,
      fundId,
      remittanceId: allocation.remittanceId,
      source: remittance.sender || allocation.source || 'Money received',
      receivedAt: remittance.receivedAt || allocation.receivedAt || '',
      createdAt: allocation.createdAt,
      originalAmount: Number(allocation.amount) || 0,
      kind: 'allocation',
    };
  });
  const transferLots = transactions.filter((item) => item.fundId === fundId && item.type === 'transfer' && Number(item.amount) > 0).map((item) => ({
    id: `transfer:${item.id}`,
    fundId,
    transferId: item.linkId,
    source: item.sourceFundName ? `Transfer from ${item.sourceFundName}` : 'Fund transfer',
    receivedAt: item.date,
    createdAt: item.createdAt,
    originalAmount: Number(item.amount) || 0,
    kind: 'transfer',
  }));
  const lots = [...allocationLots, ...transferLots].sort((a, b) => {
    const dateDifference = String(a.receivedAt).localeCompare(String(b.receivedAt));
    return dateDifference || timestampMillis(a.createdAt) - timestampMillis(b.createdAt) || a.id.localeCompare(b.id);
  }).map((lot, index) => ({ ...lot, number: index + 1, spent: 0, remaining: lot.originalAmount }));

  const lotMap = new Map(lots.map((lot) => [lot.id, lot]));
  const outgoing = transactions.filter((item) => item.fundId === fundId && (item.type === 'expense' || (item.type === 'transfer' && Number(item.amount) < 0))).sort((a, b) => String(a.date).localeCompare(String(b.date)) || timestampMillis(a.createdAt) - timestampMillis(b.createdAt));
  outgoing.forEach((transaction) => {
    const amount = transaction.type === 'transfer' ? Math.abs(Number(transaction.amount)) : Number(transaction.amount);
    let outstanding = amount;
    const applyUsages = (usages) => usages.forEach((usage) => {
      const lot = lotMap.get(usage.lotId);
      if (!lot) return;
      const used = Math.min(outstanding, lot.remaining, Number(usage.amount) || 0);
      lot.spent += used; lot.remaining -= used; outstanding -= used;
    });
    if (transaction.lotUsages?.length) applyUsages(transaction.lotUsages);
    if (outstanding > 0) applyUsages(consumeMoneyLots(lots, outstanding, transaction.preferredLotId).usages);
  });
  return lots;
}

/** Returns a traceable split. Manual selection consumes that lot first, then continues FIFO. */
export function consumeMoneyLots(lots, requestedAmount, preferredLotId = null) {
  let outstanding = Math.max(0, Number(requestedAmount) || 0);
  const ordered = preferredLotId
    ? [...lots.filter((lot) => lot.id === preferredLotId), ...lots.filter((lot) => lot.id !== preferredLotId)]
    : lots;
  const usages = [];
  ordered.forEach((lot) => {
    if (!outstanding || lot.remaining <= 0) return;
    const amount = Math.min(outstanding, lot.remaining);
    usages.push({ lotId: lot.id, amount }); outstanding -= amount;
  });
  return { usages, uncovered: outstanding };
}

export function moneyLotSummary(fundId, allocations, remittances, transactions) {
  const lots = buildMoneyLots(fundId, allocations, remittances, transactions);
  return { lots, original: sum(lots, (lot) => lot.originalAmount), spent: sum(lots, (lot) => lot.spent), remaining: sum(lots, (lot) => lot.remaining) };
}
