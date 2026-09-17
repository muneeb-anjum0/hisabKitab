import { collapseTransferPairs, timestampMillis } from './calculations';

const compareNewestFirst = (left, right, dateKey) =>
  String(right[dateKey] || '').localeCompare(String(left[dateKey] || '')) ||
  timestampMillis(right.createdAt) - timestampMillis(left.createdAt) ||
  String(right.id).localeCompare(String(left.id));

export function recentTransactions(transactions, count) {
  return collapseTransferPairs(transactions)
    .sort((left, right) => compareNewestFirst(left, right, 'date'))
    .slice(0, count);
}

export function activityItems(transactions, remittances) {
  const transactionItems = collapseTransferPairs(transactions).map((item) => ({
    ...item,
    activityDate: item.date,
  }));
  const remittanceItems = remittances.map((item) => ({
    ...item,
    id: `remittance-${item.id}`,
    sourceId: item.id,
    type: 'income',
    description: `Money from ${item.sender}`,
    amount: item.totalAmount,
    activityDate: item.receivedAt,
  }));

  return [...transactionItems, ...remittanceItems].sort((left, right) =>
    compareNewestFirst(left, right, 'activityDate'),
  );
}
