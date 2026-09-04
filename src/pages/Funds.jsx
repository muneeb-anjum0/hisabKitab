import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { fundTotals, sortFunds } from '../lib/calculations';
import { money } from '../lib/currency';
import { Modal, Field, Button, Empty } from '../components/comic/Comic';
import { useAuth } from '../contexts/AuthContext';
import FundManagement from '../components/common/FundManagement';
import FundIconBadge from '../components/common/FundIconBadge';

export default function Funds() {
  const data = useData(); const { user } = useAuth(); const [creating, setCreating] = useState(false); const [showArchived, setShowArchived] = useState(false);
  const activeFunds = sortFunds(data.funds.filter((fund) => !fund.archived));
  const archivedFunds = sortFunds(data.funds.filter((fund) => fund.archived));
  const renderFund = (fund, index) => { const totals = fundTotals(fund.id, data.allocations, data.transactions); const owner = data.memberships.some((item) => item.fundId === fund.id && item.userId === user.uid && item.role === 'owner'); return <article className={`fund-strip ${fund.accent} ${fund.archived ? 'archived' : ''}`} key={fund.id}><b className="fund-index">{String(index + 1).padStart(2, '0')}</b><Link className="fund-strip-link" to={`/funds/${fund.id}`}><div className="fund-strip-title"><FundIconBadge name={fund.name}/><div><small>{fund.archived ? 'ARCHIVED' : fund.type === 'shared' ? 'SHARED' : 'PERSONAL'}</small><h2>{fund.name}</h2></div></div><div className="fund-strip-numbers"><span>ALLOCATED <b>{money(totals.allocated)}</b></span><span>SPENT <b>{money(totals.spent)}</b></span></div><strong>{money(totals.remaining)}<small>AVAILABLE</small></strong><i>→</i></Link><FundManagement fund={fund} owner={owner}/></article>; };
  return <>
    <div className="page-title"><span className="kicker">EVERY RUPEE HAS A JOB</span><h1>THE FUNDS</h1><p>Separate pockets. One honest ledger.</p><Button onClick={() => setCreating(true)}>+ NEW FUND</Button></div>
    <section className="fund-list">{activeFunds.map(renderFund)}{!activeFunds.length && <Empty title="NO ACTIVE FUNDS." action={<Button onClick={() => setCreating(true)}>CREATE A FUND</Button>}>Create a Fund or restore one from the archive.</Empty>}</section>
    {archivedFunds.length > 0 && <section className="archived-funds"><button className="archive-toggle" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>{showArchived ? '− HIDE ARCHIVED' : `+ SHOW ARCHIVED (${archivedFunds.length})`}</button>{showArchived && <div className="fund-list">{archivedFunds.map(renderFund)}</div>}</section>}
    {creating && <NewFund onClose={() => setCreating(false)} onSave={async (values) => { await data.createFund(values); setCreating(false); }}/>}
  </>;
}

function NewFund({ onClose, onSave }) {
  const [values, setValues] = useState({ name: '', type: 'personal', accent: 'blue' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); if (!values.name.trim() || busy) return; setBusy(true); setError(''); try { await onSave({ ...values, name: values.name.trim() }); } catch (saveError) { setError(saveError.message); setBusy(false); } };
  return <Modal title="CREATE FUND" onClose={onClose}><form onSubmit={submit}><Field label="FUND NAME"><input autoFocus required maxLength="35" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} placeholder="Personal, House…"/></Field><Field label="TYPE"><select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}><option value="personal">Personal</option><option value="shared">Shared</option></select></Field><fieldset className="swatches"><legend>ACCENT</legend>{['blue', 'red', 'green', 'purple', 'yellow'].map((accent) => <button type="button" aria-label={accent} className={`${accent} ${values.accent === accent ? 'active' : ''}`} onClick={() => setValues({ ...values, accent })} key={accent}/>)}</fieldset>{error && <p className="form-error">{error}</p>}<Button disabled={busy || !values.name.trim()}>{busy ? 'CREATING…' : 'CREATE FUND'}</Button></form></Modal>;
}
