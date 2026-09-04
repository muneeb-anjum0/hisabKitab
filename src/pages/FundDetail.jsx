import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { fundTotals, moneyLotSummary } from '../lib/calculations';
import { friendlyDate } from '../lib/dates';
import { money } from '../lib/currency';
import { Button, Modal, Field, Progress, Empty } from '../components/comic/Comic';
import TransactionRow from '../components/common/TransactionRow';
import FundManagement from '../components/common/FundManagement';
import QuickAdd from '../components/forms/QuickAdd';

export default function FundDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const data = useData(); const { user } = useAuth();
  const [showMembers, setShowMembers] = useState(false);
  const [editing, setEditing] = useState(null); const [deleting, setDeleting] = useState(null);
  const fund = data.funds.find((item) => item.id === id);
  if (!fund) return <Empty title="FUND NOT FOUND.">This Fund may have been archived or removed.</Empty>;
  const totals = fundTotals(id, data.allocations, data.transactions);
  const lotSummary = moneyLotSummary(id, data.allocations, data.remittances, data.transactions);
  const transactions = data.transactions.filter((item) => item.fundId === id).sort((a, b) => {
    const byDate = String(b.date || '').localeCompare(String(a.date || ''));
    if (byDate) return byDate;
    const created = (value) => typeof value?.toMillis === 'function' ? value.toMillis() : Date.parse(value || 0) || 0;
    return created(b.createdAt) - created(a.createdAt) || String(b.id).localeCompare(String(a.id));
  });
  const members = data.memberships.filter((item) => item.fundId === id);
  const currentMembership = members.find((item) => item.userId === user.uid);
  const owner = currentMembership?.role === 'owner';
  const canEdit = ['owner', 'editor'].includes(currentMembership?.role);
  return <>
    <button className="back-link" onClick={() => navigate('/funds')}>← ALL FUNDS</button>
    <section className={`fund-detail-hero ${fund.accent}`}><div><span>{fund.type === 'shared' ? 'SHARED FUND' : 'PERSONAL FUND'}</span><h1>{fund.name}</h1><p>{members.length} member{members.length !== 1 ? 's' : ''} · {lotSummary.lots.length} money lot{lotSummary.lots.length !== 1 ? 's' : ''}</p></div><div><small>CURRENTLY AVAILABLE</small><strong>{money(totals.remaining)}</strong><div className="fund-hero-stats"><span>RECEIVED <b>{money(totals.allocated + Math.max(0, totals.adjustments))}</b></span><span>SPENT <b>{money(totals.spent)}</b></span></div><Progress value={totals.spent} max={totals.allocated} label={`${money(totals.spent)} spent`}/></div></section>
    <div className="detail-actions"><FundManagement fund={fund} owner={owner} detail/>{fund.type === 'shared' && <Button variant="paper" onClick={() => setShowMembers(true)}>MEMBERS ({members.length})</Button>}</div>
    <div className="section-heading lot-heading"><div><span className="kicker">BATCH BY BATCH</span><h2>MONEY LOTS</h2></div></div>
    <section className="money-lots">{lotSummary.lots.length ? [...lotSummary.lots].reverse().map((lot) => <article className="money-lot" key={lot.id}><header><span>MONEY LOT</span><b>#{String(lot.number).padStart(2, '0')}</b></header><small>{lot.kind === 'transfer' ? 'TRANSFER LOT' : `FROM ${lot.source.toUpperCase()}`}</small><strong>{money(lot.originalAmount)}</strong><div><span>RECEIVED <b>{friendlyDate(lot.receivedAt)}</b></span><span>SPENT <b>{money(lot.spent)}</b></span><span>LEFT <b>{money(lot.remaining)}</b></span></div><Progress value={lot.spent} max={lot.originalAmount} label={`${Math.round((lot.remaining / lot.originalAmount) * 100) || 0}% left`}/></article>) : <Empty title="NO MONEY LOTS YET.">When money arrives for this Fund, each allocation will land here.</Empty>}</section>
    <div className="section-heading"><div><span className="kicker red">MONEY TRAIL</span><h2>RECENT EXPENSES</h2></div></div>
    <section className="panel ledger-panel">{transactions.length ? transactions.map((item) => <div key={item.id} className="trace-row"><TransactionRow item={item} funds={data.funds} categories={data.categories} memberships={data.memberships} onEdit={canEdit && item.type === 'expense' ? setEditing : null} onDelete={canEdit && item.type === 'expense' ? setDeleting : null}/>{item.lotUsages?.length > 0 && <small className="paid-from">PAID FROM {item.lotUsages.length === 1 ? `LOT #${String(lotSummary.lots.find((lot) => lot.id === item.lotUsages[0].lotId)?.number || '?').padStart(2, '0')}` : `${item.lotUsages.length} MONEY LOTS`}</small>}</div>) : <Empty>There are no transactions in this Fund yet.</Empty>}</section>
    {showMembers && <Members fund={fund} members={members} data={data} isOwner={owner} onClose={() => setShowMembers(false)}/>}
    {editing && <QuickAdd edit={editing} onClose={() => setEditing(null)}/>}
    {deleting && <DeleteExpense item={deleting} onClose={() => setDeleting(null)} onDelete={async () => { await data.removeTransaction(deleting.id); setDeleting(null); }}/>}
  </>;
}

function DeleteExpense({ item, onClose, onDelete }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title="DELETE THIS EXPENSE?" onClose={onClose}><div className="delete-preview"><strong>{money(item.amount)}</strong><span>{item.description}</span></div><p>The Fund balance and Money Lot history will be recalculated immediately.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="confirm-actions"><Button variant="paper" onClick={onClose} disabled={busy}>CANCEL</Button><Button className="danger-button" onClick={async () => { setBusy(true); try { await onDelete(); } catch (deleteError) { setError(deleteError.message); setBusy(false); } }} disabled={busy}>{busy ? 'DELETING…' : 'DELETE EXPENSE'}</Button></div></Modal>;
}

function Members({ fund, members, data, isOwner, onClose }) {
  const [email, setEmail] = useState(''); const [role, setRole] = useState('editor');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const add = async (event) => { event.preventDefault(); if (!email || busy) return; setBusy(true); setError(''); try { await data.addMember(fund.id, email, role); setEmail(''); } catch (addError) { setError(addError.message); } finally { setBusy(false); } };
  const quietly = (promise) => promise.catch(() => {});
  return <Modal title="FUND MEMBERS" onClose={onClose}>
    <div className="member-list">{members.map((member) => <div key={member.id}>
      <span className="avatar">{(member.displayName || member.email || 'Y')[0].toUpperCase()}</span>
      <p><b>{member.displayName || member.email || 'You'}</b><small>{member.email || 'Fund owner'}</small></p>
      {isOwner && member.role !== 'owner' ? <><select aria-label={`Role for ${member.displayName || member.email}`} value={member.role} onChange={(event) => quietly(data.updateMember(member.id, event.target.value))}><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button className="member-remove" aria-label={`Remove ${member.displayName || member.email}`} onClick={() => quietly(data.removeMember(member.id))}>×</button></> : <em>{member.role}</em>}
    </div>)}</div>
    {isOwner && <form onSubmit={add}><Field label="ADD REGISTERED USER BY EMAIL"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="family@example.com"/></Field><Field label="ROLE"><select value={role} onChange={(event) => setRole(event.target.value)}><option value="editor">Editor — can spend</option><option value="viewer">Viewer — read only</option></select></Field>{error && <p className="form-error">{error}</p>}<Button disabled={busy || !email}>{busy ? 'ADDING…' : 'ADD TO FUND'}</Button></form>}
  </Modal>;
}
