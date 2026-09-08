import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TransactionRow from '../components/common/TransactionRow';
import QuickAdd from '../components/forms/QuickAdd';
import { Button, Empty, Modal } from '../components/comic/Comic';
import { friendlyDate } from '../lib/dates';
import { money } from '../lib/currency';
import { timestampMillis } from '../lib/calculations';

export default function Activity() {
  const data = useData(); const { user } = useAuth();
  const editableFundIds = new Set(data.memberships.filter((member) => member.userId === user.uid && ['owner', 'editor'].includes(member.role)).map((member) => member.fundId));
  const [filters, setFilters] = useState({ search: '', fund: 'all', category: 'all', type: 'all', month: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(null); const [editingIncome, setEditingIncome] = useState(null); const [deleting, setDeleting] = useState(null); const [deletingIncome, setDeletingIncome] = useState(null);
  const items = useMemo(() => {
    const transactionItems = data.transactions.map((item) => ({ ...item, activityDate: item.date }));
    const remittanceItems = data.remittances.map((item) => ({ ...item, id: `remittance-${item.id}`, sourceId: item.id, type: 'income', description: `Money from ${item.sender}`, amount: item.totalAmount, activityDate: item.receivedAt }));
    return [...transactionItems, ...remittanceItems].filter((item) => {
      const text = `${item.description || ''} ${item.note || ''}`.toLowerCase();
      return (filters.fund === 'all' || item.fundId === filters.fund) && (filters.category === 'all' || item.categoryId === filters.category) && (filters.type === 'all' || item.type === filters.type) && (!filters.month || item.activityDate?.startsWith(filters.month)) && text.includes(filters.search.toLowerCase());
    }).sort((a, b) => String(b.activityDate || '').localeCompare(String(a.activityDate || '')) || timestampMillis(b.createdAt) - timestampMillis(a.createdAt) || String(b.id).localeCompare(String(a.id)));
  }, [data.transactions, data.remittances, filters]);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const activeCount = Object.entries(filters).filter(([key, value]) => value && value !== 'all' && key !== 'search').length + (filters.search ? 1 : 0);

  return <>
    <div className="page-title compact"><span className="kicker red">EVERY MOVE. NO MYSTERY.</span><h1>ACTIVITY</h1></div>
    <section className={`activity-filters ${filtersOpen ? 'open' : ''}`}><button className="filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><span>⌕ SEARCH & FILTER</span><b>{activeCount ? `${activeCount} ACTIVE` : filtersOpen ? 'CLOSE −' : 'OPEN +'}</b></button><div className="filter-drawer" inert={!filtersOpen ? '' : undefined}><div className="filter-bar"><label><span>SEARCH</span><input type="search" placeholder="Description or note…" value={filters.search} onChange={(event) => set('search', event.target.value)}/></label><ComicSelect label="FUND" value={filters.fund} onChange={(value) => set('fund', value)} options={[['all', 'All Funds'], ...data.funds.map((fund) => [fund.id, fund.name])]}/><ComicSelect label="CATEGORY" value={filters.category} onChange={(value) => set('category', value)} options={[['all', 'All categories'], ...data.categories.map((category) => [category.id, category.name])]}/><ComicSelect label="TYPE" value={filters.type} onChange={(value) => set('type', value)} options={[['all', 'All types'], ['expense', 'Expenses'], ['income', 'Money received'], ['transfer', 'Transfers']]}/><label><span>MONTH</span><input type="month" value={filters.month} onChange={(event) => set('month', event.target.value)}/></label></div></div></section>
    <section className="panel ledger-panel activity-ledger">{items.length ? items.map((item) => item.type === 'income' ? <IncomeRow key={item.id} item={item} onEdit={() => setEditingIncome(data.remittances.find((entry) => entry.id === item.sourceId))} onDelete={() => setDeletingIncome(item)}/> : <TransactionRow key={item.id} item={item} funds={data.funds} categories={data.categories} memberships={data.memberships} onEdit={item.type === 'expense' && editableFundIds.has(item.fundId) ? setEditing : null} onDelete={item.type === 'expense' && editableFundIds.has(item.fundId) ? setDeleting : null}/>) : <Empty title="NOTHING'S MOVED YET.">Real expenses, money received, and transfers will appear here.</Empty>}</section>
    {editing && <QuickAdd edit={editing} onClose={() => setEditing(null)}/>}
    {editingIncome && <QuickAdd editIncome={editingIncome} onClose={() => setEditingIncome(null)}/>}
    {deleting && <DeleteExpense item={deleting} onClose={() => setDeleting(null)} onDelete={async () => {
      await data.removeTransaction(deleting.id); setDeleting(null);
    }}/>}<span hidden/>
    {deletingIncome && <DeleteIncome item={deletingIncome} onClose={() => setDeletingIncome(null)} onDelete={async () => {
      await data.removeRemittance(deletingIncome.sourceId); setDeletingIncome(null);
    }}/>}<span hidden/>
  </>;
}

function ComicSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false); const root = useRef(null);
  useEffect(() => { const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
  const selected = options.find(([id]) => id === value)?.[1] || options[0]?.[1];
  return <div className={`comic-select ${open ? 'open' : ''}`} ref={root}><span>{label}</span><button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{selected}<b>▾</b></button>{open && <div className="comic-options" role="listbox">{options.map(([id, text], index) => <button type="button" role="option" aria-selected={id === value} style={{ '--option-index': index }} key={id} onClick={() => { onChange(id); setOpen(false); }}>{text}{id === value && <b>✓</b>}</button>)}</div>}</div>;
}

function IncomeRow({ item, onEdit, onDelete }) { return <article className="income-row"><div><small>MONEY RECEIVED · {friendlyDate(item.activityDate)}</small><strong>{item.description}</strong>{item.note && <span>{item.note}</span>}</div><b>+{money(item.amount)}</b><div className="income-actions"><button className="income-edit" onClick={onEdit}>EDIT</button><button className="income-delete" onClick={onDelete}>DELETE</button></div></article>; }
function DeleteIncome({ item, onClose, onDelete }) { const [busy, setBusy] = useState(false); const [error, setError] = useState(''); return <Modal title="DELETE MONEY RECEIVED?" onClose={onClose}><div className="delete-preview"><strong>{money(item.amount)}</strong><span>{item.description}</span></div><div className="history-warning"><b>THIS CHANGES THE FUND.</b><p>The receipt and every Fund allocation created from it will be removed. Existing expenses remain in your ledger.</p></div>{error && <p className="form-error">{error}</p>}<Confirm busy={busy} onClose={onClose} onDelete={async () => { setBusy(true); try { await onDelete(); } catch (e) { setError(e.message); setBusy(false); } }} label="DELETE MONEY"/> </Modal>; }
function DeleteExpense({ item, onClose, onDelete }) { const [busy, setBusy] = useState(false); const [error, setError] = useState(''); return <Modal title="DELETE THIS EXPENSE?" onClose={onClose}><div className="delete-preview"><strong>{money(item.amount)}</strong><span>{item.description}</span></div>{error && <p className="form-error">{error}</p>}<Confirm busy={busy} onClose={onClose} onDelete={async () => { setBusy(true); try { await onDelete(); } catch (e) { setError(e.message); setBusy(false); } }} label="DELETE"/></Modal>; }
function Confirm({ busy, onClose, onDelete, label }) { return <div className="confirm-actions"><Button variant="paper" onClick={onClose} disabled={busy}>CANCEL</Button><Button className="danger-button" onClick={onDelete} disabled={busy}>{busy ? 'DELETING…' : label}</Button></div>; }
