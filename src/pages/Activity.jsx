import { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TransactionRow from '../components/common/TransactionRow';
import QuickAdd from '../components/forms/QuickAdd';
import { Button, Empty, Modal } from '../components/comic/Comic';
import { friendlyDate } from '../lib/dates';
import { money } from '../lib/currency';

export default function Activity() {
  const data = useData(); const { user } = useAuth();
  const editableFundIds = new Set(data.memberships.filter((member) => member.userId === user.uid && ['owner', 'editor'].includes(member.role)).map((member) => member.fundId));
  const [filters, setFilters] = useState({ search: '', fund: 'all', type: 'all', month: '' });
  const [editing, setEditing] = useState(null); const [deleting, setDeleting] = useState(null);
  const items = useMemo(() => {
    const transactionItems = data.transactions.map((item) => ({ ...item, activityDate: item.date }));
    const remittanceItems = data.remittances.map((item) => ({ ...item, id: `remittance-${item.id}`, sourceId: item.id, type: 'income', description: `Money from ${item.sender}`, amount: item.totalAmount, activityDate: item.receivedAt }));
    return [...transactionItems, ...remittanceItems].filter((item) => {
      const text = `${item.description || ''} ${item.note || ''}`.toLowerCase();
      return (filters.fund === 'all' || item.fundId === filters.fund)
        && (filters.type === 'all' || item.type === filters.type)
        && (!filters.month || item.activityDate?.startsWith(filters.month))
        && text.includes(filters.search.toLowerCase());
    }).sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || ''));
  }, [data.transactions, data.remittances, filters]);

  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value });
  return <>
    <div className="page-title compact"><span className="kicker red">EVERY MOVE. NO MYSTERY.</span><h1>ACTIVITY</h1></div>
    <section className="filter-bar"><label><span>SEARCH</span><input type="search" placeholder="Description or note…" value={filters.search} onChange={set('search')}/></label><label><span>FUND</span><select value={filters.fund} onChange={set('fund')}><option value="all">All Funds</option>{data.funds.map((fund) => <option value={fund.id} key={fund.id}>{fund.name}</option>)}</select></label><label><span>TYPE</span><select value={filters.type} onChange={set('type')}><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Money received</option><option value="transfer">Transfers</option></select></label><label><span>MONTH</span><input type="month" value={filters.month} onChange={set('month')}/></label></section>
    <section className="panel ledger-panel activity-ledger">{items.length ? items.map((item) => item.type === 'income' ? <IncomeRow key={item.id} item={item}/> : <TransactionRow key={item.id} item={item} funds={data.funds} categories={data.categories} memberships={data.memberships} onEdit={item.type === 'expense' && editableFundIds.has(item.fundId) ? setEditing : null} onDelete={item.type === 'expense' && editableFundIds.has(item.fundId) ? setDeleting : null}/>) : <Empty title="NOTHING'S MOVED YET.">Real expenses, money received, and transfers will appear here.</Empty>}</section>
    {editing && <QuickAdd edit={editing} onClose={() => setEditing(null)}/>}
    {deleting && <DeleteExpense item={deleting} onClose={() => setDeleting(null)} onDelete={async () => { await data.removeTransaction(deleting.id); setDeleting(null); }}/>}
  </>;
}

function IncomeRow({ item }) {
  return <article className="income-row"><div><small>MONEY RECEIVED · {friendlyDate(item.activityDate)}</small><strong>{item.description}</strong>{item.note && <span>{item.note}</span>}</div><b>+{money(item.amount)}</b></article>;
}

function DeleteExpense({ item, onClose, onDelete }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title="DELETE THIS EXPENSE?" onClose={onClose}><div className="delete-preview"><strong>{money(item.amount)}</strong><span>{item.description}</span></div>{error && <p className="form-error">{error}</p>}<div className="confirm-actions"><Button variant="paper" onClick={onClose} disabled={busy}>CANCEL</Button><Button onClick={async () => { setBusy(true); try { await onDelete(); } catch (deleteError) { setError(deleteError.message); setBusy(false); } }} disabled={busy}>{busy ? 'DELETING…' : 'DELETE'}</Button></div></Modal>;
}
