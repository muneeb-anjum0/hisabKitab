import { money } from '../../lib/currency';
import { friendlyDate } from '../../lib/dates';

export default function TransactionRow({ item, funds, categories, memberships = [], onEdit, onDelete }) {
  const fund = funds.find((entry) => entry.id === item.fundId);
  const category = categories.find((entry) => entry.id === item.categoryId);
  const creator = memberships.find((entry) => entry.fundId === item.fundId && entry.userId === item.userId);
  const incomingTransfer = item.type === 'transfer' && item.amount > 0;
  return <article className={`ledger-row ${Math.abs(item.amount) >= 10000 ? 'major' : ''}`}>
    <div className="ledger-symbol">{item.type === 'transfer' ? '⇄' : category?.symbol || '◆'}</div>
    <div className="ledger-main"><strong>{item.description}</strong><span>{fund?.name || 'Unknown fund'} · {friendlyDate(item.date)}{creator?.displayName ? ` · ${creator.displayName}` : ''}</span>{item.note && <small>{item.note}</small>}</div>
    <div className={`ledger-amount ${incomingTransfer ? 'positive' : ''}`}>{item.type === 'expense' ? '-' : ''}{money(item.amount)}</div>
    {(onEdit || onDelete) && <div className="row-actions">{onEdit && <button onClick={() => onEdit(item)} aria-label={`Edit ${item.description}`}>✎</button>}{onDelete && <button onClick={() => onDelete(item)} aria-label={`Delete ${item.description}`}>×</button>}</div>}
  </article>;
}
