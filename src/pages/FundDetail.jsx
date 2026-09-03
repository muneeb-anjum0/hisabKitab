import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { fundTotals } from '../lib/calculations';
import { money } from '../lib/currency';
import { Button, Modal, Field, Progress, Empty } from '../components/comic/Comic';
import TransactionRow from '../components/common/TransactionRow';

export default function FundDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const data = useData(); const { user } = useAuth();
  const [editing, setEditing] = useState(false); const [showMembers, setShowMembers] = useState(false);
  const fund = data.funds.find((item) => item.id === id);
  if (!fund) return <Empty title="FUND NOT FOUND.">This Fund may have been archived or removed.</Empty>;
  const totals = fundTotals(id, data.allocations, data.transactions);
  const transactions = data.transactions.filter((item) => item.fundId === id);
  const members = data.memberships.filter((item) => item.fundId === id);
  const currentMembership = members.find((item) => item.userId === user.uid);
  const owner = currentMembership?.role === 'owner';
  return <>
    <button className="back-link" onClick={() => navigate('/funds')}>← ALL FUNDS</button>
    <section className={`fund-detail-hero ${fund.accent}`}><div><span>{fund.type === 'shared' ? 'SHARED FUND' : 'PERSONAL FUND'}</span><h1>{fund.name}</h1><p>{members.length} member{members.length !== 1 ? 's' : ''} · {money(totals.allocated)} allocated</p></div><div><small>CURRENTLY AVAILABLE</small><strong>{money(totals.remaining)}</strong><Progress value={totals.spent} max={totals.allocated} label={`${money(totals.spent)} spent`}/></div></section>
    <div className="detail-actions">{owner && <Button onClick={() => setEditing(true)}>EDIT FUND</Button>}{fund.type === 'shared' && <Button variant="paper" onClick={() => setShowMembers(true)}>MEMBERS ({members.length})</Button>}</div>
    <div className="section-heading"><div><span className="kicker red">MONEY TRAIL</span><h2>FUND ACTIVITY</h2></div></div>
    <section className="panel ledger-panel">{transactions.length ? transactions.map((item) => <TransactionRow key={item.id} item={item} funds={data.funds} categories={data.categories} memberships={data.memberships}/>) : <Empty>There are no transactions in this Fund yet.</Empty>}</section>
    {editing && <EditFund fund={fund} onClose={() => setEditing(false)} onSave={async (values) => { await data.updateFund(fund.id, values); setEditing(false); if (values.archived) navigate('/funds'); }}/>}
    {showMembers && <Members fund={fund} members={members} data={data} isOwner={owner} onClose={() => setShowMembers(false)}/>}
  </>;
}

function EditFund({ fund, onClose, onSave }) {
  const [values, setValues] = useState({ name: fund.name, type: fund.type, accent: fund.accent, archived: fund.archived });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title="EDIT FUND" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); if (!values.name.trim() || busy) return; setBusy(true); try { await onSave({ ...values, name: values.name.trim() }); } catch (saveError) { setError(saveError.message); setBusy(false); } }}><Field label="NAME"><input required maxLength="35" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })}/></Field><Field label="TYPE"><select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}><option value="personal">Personal</option><option value="shared">Shared</option></select></Field><Field label="STATUS"><select value={String(values.archived)} onChange={(event) => setValues({ ...values, archived: event.target.value === 'true' })}><option value="false">Active</option><option value="true">Archived</option></select></Field>{error && <p className="form-error">{error}</p>}<Button disabled={busy || !values.name.trim()}>{busy ? 'SAVING…' : 'SAVE FUND'}</Button></form></Modal>;
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
