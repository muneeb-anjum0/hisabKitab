import { memo } from 'react';
import { money } from '../../lib/currency';
import { friendlyDate } from '../../lib/dates';
import { transferFundIds } from '../../lib/calculations';

function TransactionRow({ item, funds, categories, memberships = [], onEdit, onDelete }) {
  const fund = funds.find((entry) => entry.id === item.fundId);
  const category = categories.find((entry) => entry.id === item.categoryId);
  const creator = memberships.find(
    (entry) => entry.fundId === item.fundId && entry.userId === item.userId,
  );
  const endpoints = transferFundIds(item);
  const sourceFund = funds.find((entry) => entry.id === endpoints.sourceFundId);
  const destinationFund = funds.find((entry) => entry.id === endpoints.destinationFundId);
  const titleText =
    item.type === 'transfer'
      ? `Sent ${money(Math.abs(item.amount))} from ${sourceFund?.name || 'unknown fund'} to ${destinationFund?.name || 'unknown fund'}${item.note ? ` — ${item.note}` : ''}`
      : item.description;
  const title =
    item.type === 'transfer' ? (
      <span className="transfer-title">
        <span className="transfer-lead">Sent {money(Math.abs(item.amount))}</span>
        <span className="transfer-route">
          <em>from</em>
          <b className={`ledger-fund-tag ${sourceFund?.accent || ''}`}>
            {sourceFund?.name || 'Unknown fund'}
          </b>
          <em className="transfer-to">to</em>
          <em className="transfer-arrow" aria-hidden="true">
            →
          </em>
          <b className={`ledger-fund-tag ${destinationFund?.accent || ''}`}>
            {destinationFund?.name || 'Unknown fund'}
          </b>
        </span>
        <span className="transfer-note">
          {item.note && <>~ {item.note}</>}
          <span className="transfer-date">
            {item.note ? ' · ' : ''}
            {friendlyDate(item.date)}
          </span>
        </span>
      </span>
    ) : (
      item.description
    );
  return (
    <article
      className={`ledger-row ${item.type === 'transfer' ? 'ledger-transfer' : ''} ${item.type !== 'transfer' && Math.abs(item.amount) >= 10000 ? 'major' : ''}`}
    >
      <div className="ledger-symbol">
        {item.type === 'transfer' ? '⇄' : category?.symbol || '◆'}
      </div>
      <div className="ledger-main">
        <strong>{title}</strong>
        <span className="ledger-meta">
          {item.type !== 'transfer' && (
            <b className={`ledger-fund-tag ${fund?.accent || ''}`}>
              {fund?.name || 'Unknown fund'}
            </b>
          )}
          <span>
            {friendlyDate(item.date)}
            {creator?.displayName ? ` · ${creator.displayName}` : ''}
          </span>
        </span>
        {item.note && item.type !== 'transfer' && <small>{item.note}</small>}
      </div>
      {item.type !== 'transfer' && (
        <div className="ledger-amount">
          {item.type === 'expense' ? '-' : ''}
          {money(item.amount)}
        </div>
      )}
      {(onEdit || onDelete) && (
        <div className="row-actions">
          {onEdit && (
            <button onClick={() => onEdit(item)} aria-label={`Edit ${titleText}`}>
              ✎
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(item)} aria-label={`Delete ${titleText}`}>
              ×
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default memo(TransactionRow);
