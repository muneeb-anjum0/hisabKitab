export const BACKUP_VERSION = 1;
export const BACKUP_COLLECTIONS = [
  'funds',
  'remittances',
  'allocations',
  'transactions',
  'categories',
  'recurringRules',
];

export function receiptsForOwnedFunds(ownReceipts, allocations, uid) {
  const receipts = [...ownReceipts];
  const knownIds = new Set(ownReceipts.map((item) => item.id));
  const shared = new Map();
  for (const lot of allocations) {
    if (knownIds.has(lot.remittanceId)) continue;
    const previous = shared.get(lot.remittanceId);
    shared.set(lot.remittanceId, {
      id: lot.remittanceId,
      ownerId: uid,
      totalAmount: (previous?.totalAmount || 0) + Number(lot.amount),
      sender: previous?.sender || String(lot.source || 'Shared contribution').slice(0, 80),
      note: 'Shared contribution reconstructed from this Fund backup',
      receivedAt: String(lot.receivedAt || new Date().toISOString()).slice(0, 10),
      currency: 'PKR',
      restoredSharedContribution: true,
    });
  }
  return [...receipts, ...shared.values()];
}

export function parseAccountBackup(text, userId) {
  if (text.length > 20_000_000) throw new Error('Backup is too large to restore safely.');
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('This is not a valid HisabKitab backup.');
  }
  if (backup?.format !== 'hisabkitab-account' || backup.version !== BACKUP_VERSION)
    throw new Error('Unsupported backup format.');
  if (backup.userId !== userId)
    throw new Error('This backup belongs to a different account. Sign in to that account first.');
  for (const name of BACKUP_COLLECTIONS) {
    if (!Array.isArray(backup[name]) || backup[name].length > 10_000)
      throw new Error(`Invalid ${name} in backup.`);
    if (
      backup[name].some(
        (item) => !item || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.id),
      )
    )
      throw new Error(`Invalid ${name} ID in backup.`);
    if (new Set(backup[name].map((item) => item.id)).size !== backup[name].length)
      throw new Error(`Duplicate ${name} ID in backup.`);
  }
  const fundIds = new Set(backup.funds.map((item) => item.id));
  const receiptIds = new Set(backup.remittances.map((item) => item.id));
  if (backup.funds.some((item) => item.ownerId !== userId))
    throw new Error('Backup contains a Fund owned by another account.');
  if (backup.remittances.some((item) => item.ownerId !== userId))
    throw new Error('Backup contains income owned by another account.');
  if (backup.categories.some((item) => item.userId !== userId))
    throw new Error('Backup contains categories owned by another account.');
  if (backup.recurringRules.some((item) => item.ownerId !== userId || !fundIds.has(item.fundId)))
    throw new Error('Backup contains a recurring rule without its Fund or account.');
  if (
    backup.allocations.some(
      (item) => !fundIds.has(item.fundId) || !receiptIds.has(item.remittanceId),
    )
  )
    throw new Error('Backup contains an allocation without its Fund or income.');
  if (backup.transactions.some((item) => !fundIds.has(item.fundId)))
    throw new Error('Backup contains a transaction without its Fund.');
  const transfers = backup.transactions.filter((item) => item.type === 'transfer');
  const transferIds = new Map(transfers.map((item) => [item.id, item]));
  if (
    transfers.some((item) => {
      const pair = transferIds.get(item.counterpartyId);
      return (
        !pair ||
        pair.counterpartyId !== item.id ||
        pair.linkId !== item.linkId ||
        !fundIds.has(item.counterpartyFundId) ||
        Number(item.amount) !== -Number(pair.amount)
      );
    })
  )
    throw new Error('Backup contains an incomplete transfer pair.');
  return backup;
}
