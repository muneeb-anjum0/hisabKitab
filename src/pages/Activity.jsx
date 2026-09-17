import { useDeferredValue, useMemo, useState } from 'react';
import { useData } from '../contexts/data';
import { useAuth } from '../contexts/auth';
import TransactionRow from '../components/common/TransactionRow';
import QuickAdd from '../components/forms/QuickAdd';
import { Button, ComicDatePicker, ComicSelect, Empty, Modal } from '../components/comic/Comic';
import { friendlyDate } from '../lib/dates';
import { money } from '../lib/currency';
import {
  collapseTransferPairs,
  moneyLotSummary,
  moneyLotUsageLabel,
  timestampMillis,
  transferFundIds,
} from '../lib/calculations';

export default function Activity() {
  const data = useData();
  const { user } = useAuth();
  const editableFundIds = useMemo(
    () =>
      new Set(
        data.memberships
          .filter(
            (member) => member.userId === user.uid && ['owner', 'editor'].includes(member.role),
          )
          .map((member) => member.fundId),
      ),
    [data.memberships, user.uid],
  );
  const [filters, setFilters] = useState({
    search: '',
    fund: 'all',
    category: 'all',
    type: 'all',
    month: '',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingIncome, setDeletingIncome] = useState(null);
  const deferredSearch = useDeferredValue(filters.search);
  const { fund: fundFilter, category: categoryFilter, type: typeFilter, month } = filters;
  const lotsByFund = useMemo(
    () =>
      new Map(
        data.funds.map((fund) => [
          fund.id,
          moneyLotSummary(fund.id, data.allocations, data.remittances, data.transactions).lots,
        ]),
      ),
    [data.allocations, data.funds, data.remittances, data.transactions],
  );
  const items = useMemo(() => {
    const search = deferredSearch.toLowerCase();
    const transactionItems = collapseTransferPairs(data.transactions).map((item) => ({
      ...item,
      activityDate: item.date,
    }));
    const remittanceItems = data.remittances.map((item) => ({
      ...item,
      id: `remittance-${item.id}`,
      sourceId: item.id,
      type: 'income',
      description: `Money from ${item.sender}`,
      amount: item.totalAmount,
      activityDate: item.receivedAt,
    }));
    return [...transactionItems, ...remittanceItems]
      .filter((item) => {
        const text = `${item.description || ''} ${item.note || ''}`.toLowerCase();
        return (
          (fundFilter === 'all' ||
            item.fundId === fundFilter ||
            (item.type === 'transfer' &&
              Object.values(transferFundIds(item)).includes(fundFilter))) &&
          (categoryFilter === 'all' || item.categoryId === categoryFilter) &&
          (typeFilter === 'all' || item.type === typeFilter) &&
          (!month || item.activityDate?.startsWith(month)) &&
          text.includes(search)
        );
      })
      .sort(
        (a, b) =>
          String(b.activityDate || '').localeCompare(String(a.activityDate || '')) ||
          timestampMillis(b.createdAt) - timestampMillis(a.createdAt) ||
          String(b.id).localeCompare(String(a.id)),
      );
  }, [
    categoryFilter,
    data.transactions,
    data.remittances,
    deferredSearch,
    fundFilter,
    month,
    typeFilter,
  ]);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const activeCount =
    Object.entries(filters).filter(([key, value]) => value && value !== 'all' && key !== 'search')
      .length + (filters.search ? 1 : 0);

  return (
    <>
      <div className="page-title compact">
        <span className="kicker red">EVERY MOVE. NO MYSTERY.</span>
        <h1>ACTIVITY</h1>
      </div>
      <section className={`activity-filters ${filtersOpen ? 'open' : ''}`}>
        <button
          className="filter-toggle"
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <span>⌕ SEARCH & FILTER</span>
          <b>{activeCount ? `${activeCount} ACTIVE` : filtersOpen ? 'CLOSE −' : 'OPEN +'}</b>
        </button>
        <div className="filter-drawer" inert={!filtersOpen ? '' : undefined}>
          <div className="filter-bar">
            <label>
              <span>SEARCH</span>
              <input
                type="search"
                placeholder="Description or note…"
                value={filters.search}
                onChange={(event) => set('search', event.target.value)}
              />
            </label>
            <ComicSelect
              label="FUND"
              value={filters.fund}
              onChange={(value) => set('fund', value)}
              options={[['all', 'All Funds'], ...data.funds.map((fund) => [fund.id, fund.name])]}
            />
            <ComicSelect
              label="CATEGORY"
              value={filters.category}
              onChange={(value) => set('category', value)}
              options={[
                ['all', 'All categories'],
                ...data.categories.map((category) => [category.id, category.name]),
              ]}
            />
            <ComicSelect
              label="TYPE"
              value={filters.type}
              onChange={(value) => set('type', value)}
              options={[
                ['all', 'All types'],
                ['expense', 'Expenses'],
                ['income', 'Money received'],
                ['transfer', 'Transfers'],
              ]}
            />
            <ComicDatePicker
              label="MONTH"
              mode="month"
              allowClear
              value={filters.month}
              onChange={(value) => set('month', value)}
            />
          </div>
        </div>
      </section>
      <section className="panel ledger-panel activity-ledger">
        {items.length ? (
          items.map((item) =>
            item.type === 'income' ? (
              <IncomeRow
                key={item.id}
                item={item}
                onEdit={() =>
                  setEditingIncome(data.remittances.find((entry) => entry.id === item.sourceId))
                }
                onDelete={() => setDeletingIncome(item)}
              />
            ) : (
              <TransactionRow
                key={item.id}
                item={item}
                funds={data.funds}
                categories={data.categories}
                memberships={data.memberships}
                paidFromLabel={moneyLotUsageLabel(item, lotsByFund.get(item.fundId) || [])}
                onEdit={
                  item.type === 'expense' && editableFundIds.has(item.fundId) ? setEditing : null
                }
                onDelete={
                  (item.type === 'expense' && editableFundIds.has(item.fundId)) ||
                  (item.type === 'transfer' &&
                    editableFundIds.has(item.fundId) &&
                    editableFundIds.has(item.counterpartyFundId))
                    ? setDeleting
                    : null
                }
              />
            ),
          )
        ) : (
          <Empty title="NOTHING'S MOVED YET.">
            Real expenses, money received, and transfers will appear here.
          </Empty>
        )}
      </section>
      {editing && <QuickAdd edit={editing} onClose={() => setEditing(null)} />}
      {editingIncome && (
        <QuickAdd editIncome={editingIncome} onClose={() => setEditingIncome(null)} />
      )}
      {deleting && (
        <DeleteExpense
          item={deleting}
          onClose={() => setDeleting(null)}
          onDelete={async () => {
            if (deleting.type === 'transfer') await data.removeTransfer(deleting);
            else await data.removeTransaction(deleting.id);
            setDeleting(null);
          }}
        />
      )}
      <span hidden />
      {deletingIncome && (
        <DeleteIncome
          item={deletingIncome}
          onClose={() => setDeletingIncome(null)}
          onDelete={async () => {
            await data.removeRemittance(deletingIncome.sourceId);
            setDeletingIncome(null);
          }}
        />
      )}
      <span hidden />
    </>
  );
}

function IncomeRow({ item, onEdit, onDelete }) {
  return (
    <article className="income-row">
      <div>
        <small>MONEY RECEIVED · {friendlyDate(item.activityDate)}</small>
        <strong>{item.description}</strong>
        {item.note && <span>{item.note}</span>}
      </div>
      <div className="income-value-actions">
        <b>+{money(item.amount)}</b>
        <div className="income-actions">
          <button
            className="income-edit"
            onClick={onEdit}
            aria-label={`Edit ${item.description}`}
            title="Edit"
          >
            ✎
          </button>
          <button
            className="income-delete"
            onClick={onDelete}
            aria-label={`Delete ${item.description}`}
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>
    </article>
  );
}
function DeleteIncome({ item, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="DELETE MONEY RECEIVED?" onClose={onClose}>
      <div className="delete-preview">
        <strong>{money(item.amount)}</strong>
        <span>{item.description}</span>
      </div>
      <div className="history-warning">
        <b>THIS CHANGES THE FUND.</b>
        <p>
          The receipt and every Fund allocation created from it will be removed. Existing expenses
          remain in your ledger.
        </p>
      </div>
      {error && <p className="form-error">{error}</p>}
      <Confirm
        busy={busy}
        onClose={onClose}
        onDelete={async () => {
          setBusy(true);
          try {
            await onDelete();
          } catch (e) {
            setError(e.message);
            setBusy(false);
          }
        }}
        label="DELETE MONEY"
      />{' '}
    </Modal>
  );
}
function DeleteExpense({ item, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal
      title={item.type === 'transfer' ? 'REVERSE THIS TRANSFER?' : 'DELETE THIS EXPENSE?'}
      onClose={onClose}
    >
      <div className="delete-preview">
        <strong>{money(item.amount)}</strong>
        <span>{item.description}</span>
      </div>
      {item.type === 'transfer' && (
        <div className="history-warning">
          <b>BOTH SIDES GO BACK.</b>
          <p>
            Transfer In, Transfer Out, and the transfer-created Money Lot will be removed together.
          </p>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <Confirm
        busy={busy}
        onClose={onClose}
        onDelete={async () => {
          setBusy(true);
          try {
            await onDelete();
          } catch (e) {
            setError(e.message);
            setBusy(false);
          }
        }}
        label={item.type === 'transfer' ? 'REVERSE TRANSFER' : 'DELETE'}
        busyLabel={item.type === 'transfer' ? 'REVERSING…' : 'DELETING…'}
      />
    </Modal>
  );
}
function Confirm({ busy, onClose, onDelete, label, busyLabel = 'DELETING…' }) {
  return (
    <div className="confirm-actions">
      <Button variant="paper" onClick={onClose} disabled={busy}>
        CANCEL
      </Button>
      <Button className="danger-button" onClick={onDelete} disabled={busy}>
        {busy ? busyLabel : label}
      </Button>
    </div>
  );
}
