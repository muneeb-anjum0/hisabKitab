import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { fundTotals } from '../lib/calculations';
import { money } from '../lib/currency';
import { Modal, Field, Button, Empty } from '../components/comic/Comic';

export default function Funds() {
  const data = useData(); const [creating, setCreating] = useState(false);
  const activeFunds = data.funds.filter((fund) => !fund.archived);
  return <>
    <div className="page-title"><span className="kicker">EVERY RUPEE HAS A JOB</span><h1>THE FUNDS</h1><p>Separate pockets. One honest ledger.</p><Button onClick={() => setCreating(true)}>+ NEW FUND</Button></div>
    <section className="fund-list">{activeFunds.map((fund, index) => {
      const totals = fundTotals(fund.id, data.allocations, data.transactions);
      return <Link className={`fund-strip ${fund.accent}`} to={`/funds/${fund.id}`} key={fund.id}><b className="fund-index">{String(index + 1).padStart(2, '0')}</b><div><small>{fund.type === 'shared' ? 'SHARED' : 'PERSONAL'}</small><h2>{fund.name}</h2></div><div className="fund-strip-numbers"><span>ALLOCATED <b>{money(totals.allocated)}</b></span><span>SPENT <b>{money(totals.spent)}</b></span></div><strong>{money(totals.remaining)}<small>AVAILABLE</small></strong><i>→</i></Link>;
    })}{!activeFunds.length && <Empty title="NO FUNDS YET." action={<Button onClick={() => setCreating(true)}>CREATE YOUR FIRST FUND</Button>}>Create a Fund to give your money somewhere to live.</Empty>}</section>
    {creating && <NewFund onClose={() => setCreating(false)} onSave={async (values) => { await data.createFund(values); setCreating(false); }}/>}
  </>;
}

function NewFund({ onClose, onSave }) {
  const [values, setValues] = useState({ name: '', type: 'personal', accent: 'blue' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); if (!values.name.trim() || busy) return; setBusy(true); setError(''); try { await onSave({ ...values, name: values.name.trim() }); } catch (saveError) { setError(saveError.message); setBusy(false); } };
  return <Modal title="CREATE FUND" onClose={onClose}><form onSubmit={submit}><Field label="FUND NAME"><input autoFocus required maxLength="35" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} placeholder="Personal, House…"/></Field><Field label="TYPE"><select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}><option value="personal">Personal</option><option value="shared">Shared</option></select></Field><fieldset className="swatches"><legend>ACCENT</legend>{['blue', 'red', 'green', 'purple', 'yellow'].map((accent) => <button type="button" aria-label={accent} className={`${accent} ${values.accent === accent ? 'active' : ''}`} onClick={() => setValues({ ...values, accent })} key={accent}/>)}</fieldset>{error && <p className="form-error">{error}</p>}<Button disabled={busy || !values.name.trim()}>{busy ? 'CREATING…' : 'CREATE FUND'}</Button></form></Modal>;
}
