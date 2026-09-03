import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { portfolioTotals } from '../lib/calculations';
import { money } from '../lib/currency';
import { monthKey } from '../lib/dates';
import { Panel, Progress, Empty, Modal, Field, Button } from '../components/comic/Comic';
import TransactionRow from '../components/common/TransactionRow';

export default function Dashboard({ onAction }) {
  const data = useData(); const { user } = useAuth();
  const [allocating, setAllocating] = useState(false);
  const activeFunds = data.funds.filter((fund) => !fund.archived);
  const totals = portfolioTotals(activeFunds, data.allocations, data.transactions, data.remittances);
  const currentMonth = monthKey();
  const received = data.remittances.filter((item) => monthKey(item.receivedAt) === currentMonth).reduce((total, item) => total + Number(item.totalAmount), 0);
  const spent = data.transactions.filter((item) => monthKey(item.date) === currentMonth && item.type === 'expense').reduce((total, item) => total + Number(item.amount), 0);
  const isEmpty = !data.funds.length && !data.remittances.length && !data.transactions.length;

  return <>
    <header className="eyebrow"><span>HISABKITAB / {user?.displayName?.split(' ')[0]?.toUpperCase() || 'MY LEDGER'}</span><i>Ledger synced from Firestore</i></header>
    <section className="balance-hero">
      <div className="hero-copy"><small>{new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase()} / MONEY CHECK</small><h1>TOTAL AVAILABLE</h1><div className="impact-number">{money(totals.remaining + totals.unallocated)}</div><p>Allocated Funds plus money waiting to be assigned.</p></div>
      <div className="hero-stats"><div><span>RECEIVED</span><b>{money(received)}</b><small>this month</small></div><div><span>SPENT</span><b>{money(spent)}</b><small>this month</small></div><button className="unassigned" onClick={() => totals.unallocated > 0 && setAllocating(true)}><span>UNALLOCATED</span><b>{money(totals.unallocated)}</b><small>{totals.unallocated > 0 ? 'tap to assign' : 'nothing waiting'}</small></button></div>
    </section>

    {isEmpty && <Panel className="onboarding"><Empty title="YOUR BOOK'S EMPTY." action={<Button onClick={() => onAction('fund')}>CREATE YOUR FIRST FUND</Button>}>Create a Fund, record money received, split it, then start adding expenses.</Empty><ol><li><b>01</b> Create a Fund</li><li><b>02</b> Add money</li><li><b>03</b> Split and spend</li></ol></Panel>}

    {!!activeFunds.length && <><div className="section-heading"><div><span className="kicker">WHERE IT LIVES</span><h2>YOUR FUNDS</h2></div><Link to="/funds">SEE ALL →</Link></div><section className="fund-scape">{totals.funds.map((fund, index) => <Link to={`/funds/${fund.id}`} key={fund.id} className={`fund-panel ${fund.accent} f${index}`}><small>{fund.type === 'shared' ? 'SHARED FUND' : 'PERSONAL FUND'}</small><h3>{fund.name}</h3><strong>{money(fund.remaining)}</strong><span>OF {money(fund.allocated)} LEFT</span><Progress value={fund.spent} max={fund.allocated} label={`${money(fund.spent)} spent`}/></Link>)}</section></>}

    <div className="section-heading"><div><span className="kicker red">LATEST RECORDS</span><h2>RECENT MOVES</h2></div><Link to="/activity">FULL STORY →</Link></div>
    <Panel className="ledger-panel">{data.transactions.length ? data.transactions.slice(0, 5).map((item) => <TransactionRow key={item.id} item={item} funds={data.funds} categories={data.categories} memberships={data.memberships}/>) : <Empty title="YOUR FIRST TRANSACTION WILL SHOW UP HERE." action={activeFunds.length ? <Button onClick={() => onAction('expense')}>ADD EXPENSE</Button> : null}>Nothing has moved yet.</Empty>}</Panel>
    {allocating && <AllocateMoney data={data} onClose={() => setAllocating(false)}/>}
  </>;
}

function AllocateMoney({ data, onClose }) {
  const sources = data.remittances.map((remittance) => ({ ...remittance, left: Number(remittance.totalAmount) - data.allocations.filter((allocation) => allocation.remittanceId === remittance.id).reduce((total, allocation) => total + Number(allocation.amount), 0) })).filter((item) => item.left > 0);
  const [values, setValues] = useState({ remittanceId: sources[0]?.id || '', fundId: data.funds.find((fund) => !fund.archived)?.id || '', amount: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const source = sources.find((item) => item.id === values.remittanceId);
  const valid = Number(values.amount) > 0 && Number(values.amount) <= Number(source?.left) && values.fundId;
  const submit = async (event) => { event.preventDefault(); if (!valid || busy) return; setBusy(true); setError(''); try { await data.allocate({ ...values, amount: Number(values.amount) }); onClose(); } catch (submitError) { setError(submitError.message); setBusy(false); } };
  return <Modal title="ASSIGN THE REST" onClose={onClose}><form onSubmit={submit}><Field label="FROM REMITTANCE"><select value={values.remittanceId} onChange={(event) => setValues({ ...values, remittanceId: event.target.value })}>{sources.map((item) => <option value={item.id} key={item.id}>{item.sender} — {money(item.left)} left</option>)}</select></Field><Field label="SEND TO FUND"><select value={values.fundId} onChange={(event) => setValues({ ...values, fundId: event.target.value })}>{data.funds.filter((fund) => !fund.archived).map((fund) => <option value={fund.id} key={fund.id}>{fund.name}</option>)}</select></Field><Field label="AMOUNT"><input autoFocus className="amount-input" type="number" min="1" max={source?.left} value={values.amount} onChange={(event) => setValues({ ...values, amount: event.target.value })}/></Field>{Number(values.amount) > Number(source?.left) && <p className="form-error">Only {money(source?.left)} is unallocated here.</p>}{error && <p className="form-error">{error}</p>}<Button disabled={!valid || busy}>{busy ? 'ASSIGNING…' : 'ASSIGN MONEY'}</Button></form></Modal>;
}
