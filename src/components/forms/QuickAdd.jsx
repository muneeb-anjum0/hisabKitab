import { useEffect, useRef, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { localISO } from '../../lib/dates';
import { buildMoneyLots, consumeMoneyLots, fundTotals } from '../../lib/calculations';
import { money } from '../../lib/currency';
import { Modal, Button, Field } from '../comic/Comic';

const isPositive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export default function QuickAdd({ onClose, initial = 'menu', edit = null, editIncome = null }) {
  const data = useData();
  const [mode, setMode] = useState(edit ? 'expense' : editIncome ? 'remittance' : initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef(null);
  const funds = data.funds.filter((fund) => !fund.archived && data.memberships.some(
    (member) => member.fundId === fund.id && ['owner', 'editor'].includes(member.role),
  ));

  useEffect(() => {
    if (mode !== 'menu') window.setTimeout(() => amountRef.current?.focus(), 80);
  }, [mode]);

  const submit = async (operation) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); onClose(); }
    catch (submitError) { setError(submitError.message || "Couldn't save that."); setBusy(false); }
  };
  if (mode === 'menu') return <Modal title="WHAT HAPPENED?" onClose={onClose}>
    <div className="quick-grid">
      <button onClick={() => setMode('expense')}><b>SPENT</b><span>Add an expense</span></button>
      <button onClick={() => setMode('remittance')}><b>MONEY IN</b><span>Record money received</span></button>
      <button onClick={() => setMode('transfer')}><b>TRANSFER</b><span>Move money between Funds</span></button>
      <button onClick={() => setMode('fund')}><b>NEW FUND</b><span>Create a place for your money</span></button>
    </div>
  </Modal>;

  const back = () => (edit || editIncome || initial !== 'menu') ? onClose() : setMode('menu');
  if (mode === 'expense') return <ExpenseForm {...{ data, funds, edit, amountRef, busy, error }} onBack={back} onSubmit={(values) => submit(() => edit ? data.updateTransaction(edit.id, values) : data.addTransaction(values))}/>;
  if (mode === 'remittance') return <RemittanceForm {...{ data, funds, editIncome, amountRef, busy, error }} onBack={back} onSubmit={(values, allocations) => submit(() => editIncome ? data.updateRemittance(editIncome.id, values, allocations) : data.createRemittance(values, allocations))}/>;
  if (mode === 'transfer') return <TransferForm {...{ data, funds, amountRef, busy, error }} onBack={back} onSubmit={(values) => submit(() => data.createTransfer(values))}/>;
  return <FundForm {...{ busy, error }} onBack={back} onSubmit={(values) => submit(() => data.createFund(values))}/>;
}

function ExpenseForm({ data, funds, edit, amountRef, busy, error, onBack, onSubmit }) {
  const [values, setValues] = useState({
    amount: edit?.amount || '', fundId: edit?.fundId || localStorage.getItem('hk-last-fund') || funds[0]?.id || '',
    description: edit?.description || '', categoryId: edit?.categoryId || data.categories[0]?.id || '',
    date: edit?.date || localISO(), note: edit?.note || '', type: 'expense', preferredLotId: edit?.preferredLotId || 'auto',
  });
  const otherTransactions = edit ? data.transactions.filter((item) => item.id !== edit.id) : data.transactions;
  const lots = values.fundId ? buildMoneyLots(values.fundId, data.allocations, data.remittances, otherTransactions) : [];
  const consumption = consumeMoneyLots(lots, values.amount, values.preferredLotId === 'auto' ? null : values.preferredLotId);
  const valid = isPositive(values.amount) && values.fundId && values.description.trim() && values.date && consumption.uncovered === 0;
  const save = (event) => {
    event.preventDefault();
    if (!valid || busy) return;
    localStorage.setItem('hk-last-fund', values.fundId);
    onSubmit({ ...values, preferredLotId: values.preferredLotId === 'auto' ? null : values.preferredLotId, lotUsages: consumption.usages, amount: Number(values.amount), description: values.description.trim(), note: values.note.trim() });
  };
  return <Modal title={edit ? 'EDIT EXPENSE' : 'ADD EXPENSE'} onClose={onBack}>
    {!funds.length ? <NoFunds onCreate={() => onBack()}/> : <form onSubmit={save}>
      <Field label="AMOUNT (PKR)"><input ref={amountRef} inputMode="decimal" type="number" min="1" step="1" required value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} placeholder="0" className="amount-input"/></Field>
      <div className="form-pair"><Field label="FUND"><select required value={values.fundId} onChange={(e) => setValues({ ...values, fundId: e.target.value })}>{funds.map((fund) => <option value={fund.id} key={fund.id}>{fund.name}</option>)}</select></Field><Field label="DATE"><input required type="date" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })}/></Field></div>
      <Field label="WHAT WAS IT?"><input required maxLength="80" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} placeholder="Groceries, fuel, chai…"/></Field>
      <Field label="CATEGORY"><select value={values.categoryId} onChange={(e) => setValues({ ...values, categoryId: e.target.value })}>{data.categories.map((category) => <option value={category.id} key={category.id}>{category.symbol} {category.name}</option>)}</select></Field>
      <Field label="USE MONEY FROM"><select value={values.preferredLotId} onChange={(e) => setValues({ ...values, preferredLotId: e.target.value })}><option value="auto">Auto · oldest available first</option>{lots.filter((lot) => lot.remaining > 0).map((lot) => <option key={lot.id} value={lot.id}>Lot #{String(lot.number).padStart(2, '0')} · {lot.source} · {money(lot.remaining)} left</option>)}</select></Field>
      <Field label="NOTE — OPTIONAL"><textarea maxLength="300" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} rows="2"/></Field>
      {consumption.uncovered > 0 && <p className="form-error">This Fund is short by {money(consumption.uncovered)}.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button disabled={busy || !valid}>{busy ? 'SAVING…' : edit ? 'SAVE CHANGES' : 'ADD EXPENSE'}</Button>
    </form>}
  </Modal>;
}

function RemittanceForm({ data, funds, editIncome, amountRef, busy, error, onBack, onSubmit }) {
  const existingAllocations = editIncome ? data.allocations.filter((item) => item.remittanceId === editIncome.id) : [];
  const [values, setValues] = useState({ sender: editIncome?.sender || '', totalAmount: editIncome?.totalAmount || '', receivedAt: editIncome?.receivedAt || localISO(), note: editIncome?.note || '' });
  const [allocationValues, setAllocationValues] = useState(() => Object.fromEntries(existingAllocations.map((item) => [item.fundId, item.amount])));
  const [split, setSplit] = useState(existingAllocations.length > 1);
  const [purpose, setPurpose] = useState(existingAllocations[0]?.fundId || funds[0]?.id || '');
  const allocated = split ? Object.values(allocationValues).reduce((total, value) => total + (Number(value) || 0), 0) : (purpose ? Number(values.totalAmount) || 0 : 0);
  const remaining = (Number(values.totalAmount) || 0) - allocated;
  const valid = isPositive(values.totalAmount) && values.sender.trim() && values.receivedAt && remaining >= 0;
  const save = (event) => {
    event.preventDefault(); if (!valid || busy) return;
    const allocations = split ? funds.map((fund) => ({ fundId: fund.id, amount: Number(allocationValues[fund.id]) || 0 })) : (purpose ? [{ fundId: purpose, amount: Number(values.totalAmount) }] : []);
    onSubmit({ ...values, totalAmount: Number(values.totalAmount), sender: values.sender.trim(), note: values.note.trim() }, allocations);
  };
  return <Modal title={editIncome ? 'EDIT MONEY RECEIVED' : 'ADD MONEY'} onClose={onBack} wide><form onSubmit={save}>
    <div className="remit-layout"><div>
      <Field label="FROM"><input required maxLength="80" value={values.sender} onChange={(e) => setValues({ ...values, sender: e.target.value })} placeholder="Dad"/></Field>
      <Field label="AMOUNT (PKR)"><input ref={amountRef} required type="number" min="1" step="1" inputMode="decimal" className="amount-input" value={values.totalAmount} onChange={(e) => setValues({ ...values, totalAmount: e.target.value })}/></Field>
      <Field label="DATE"><input required type="date" value={values.receivedAt} onChange={(e) => setValues({ ...values, receivedAt: e.target.value })}/></Field>
      <Field label="NOTE — OPTIONAL"><textarea maxLength="300" rows="2" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })}/></Field>
    </div><div className="split-box"><h3>GIVE IT A JOB</h3>
      {funds.length ? <><Field label="PURPOSE"><select value={purpose} disabled={split} onChange={(event) => setPurpose(event.target.value)}>{funds.map((fund) => <option value={fund.id} key={fund.id}>{fund.name}</option>)}</select></Field><button type="button" className="split-toggle" onClick={() => setSplit(!split)}>{split ? '← USE ONE FUND' : '+ SPLIT ACROSS FUNDS'}</button>{split && funds.map((fund) => <Field key={fund.id} label={fund.name}><input type="number" min="0" step="1" inputMode="decimal" value={allocationValues[fund.id] || ''} onChange={(e) => setAllocationValues({ ...allocationValues, [fund.id]: e.target.value })} placeholder="0"/></Field>)}</> : <p>Create a Fund after saving to allocate this money later.</p>}
      <div className={`remaining ${remaining < 0 ? 'bad' : ''}`}><span>ALLOCATED</span><strong>{money(allocated)}</strong></div>
      <div className={`remaining ${remaining < 0 ? 'bad' : ''}`}><span>UNALLOCATED</span><strong>{money(remaining)}</strong></div>
      <small>Partial allocation is allowed.</small>
    </div></div>
    {remaining < 0 && <p className="form-error">Your split is {money(-remaining)} over the amount received.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button disabled={busy || !valid}>{busy ? 'SAVING…' : editIncome ? 'SAVE CHANGES' : 'SAVE MONEY'}</Button>
  </form></Modal>;
}

function TransferForm({ data, funds, amountRef, busy, error, onBack, onSubmit }) {
  const [values, setValues] = useState({ fromId: funds[0]?.id || '', toId: funds[1]?.id || '', amount: '', date: localISO(), note: '' });
  const available = values.fromId ? fundTotals(values.fromId, data.allocations, data.transactions).remaining : 0;
  const lots = values.fromId ? buildMoneyLots(values.fromId, data.allocations, data.remittances, data.transactions) : [];
  const consumption = consumeMoneyLots(lots, values.amount);
  const valid = isPositive(values.amount) && values.fromId && values.toId && values.fromId !== values.toId && Number(values.amount) <= available && consumption.uncovered === 0 && values.date;
  return <Modal title="TRANSFER" onClose={onBack}>
    {funds.length < 2 ? <NoFunds message="You need at least two active Funds to make a transfer."/> : <form onSubmit={(event) => { event.preventDefault(); if (valid && !busy) onSubmit({ ...values, amount: Number(values.amount), note: values.note.trim(), lotUsages: consumption.usages, sourceFundName: funds.find((fund) => fund.id === values.fromId)?.name || '' }); }}>
      <Field label={`AMOUNT — ${money(available)} AVAILABLE`}><input ref={amountRef} className="amount-input" type="number" min="1" max={Math.max(0, available)} step="1" required value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })}/></Field>
      <div className="form-pair"><Field label="FROM"><select value={values.fromId} onChange={(e) => setValues({ ...values, fromId: e.target.value })}>{funds.map((fund) => <option value={fund.id} key={fund.id}>{fund.name}</option>)}</select></Field><Field label="TO"><select value={values.toId} onChange={(e) => setValues({ ...values, toId: e.target.value })}>{funds.map((fund) => <option value={fund.id} key={fund.id}>{fund.name}</option>)}</select></Field></div>
      <Field label="DATE"><input required type="date" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })}/></Field>
      <Field label="NOTE — OPTIONAL"><input maxLength="300" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })}/></Field>
      {values.fromId === values.toId && <p className="form-error">Pick two different Funds.</p>}
      {Number(values.amount) > available && <p className="form-error">That Fund only has {money(available)} available.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button disabled={busy || !valid}>{busy ? 'TRANSFERRING…' : 'TRANSFER MONEY'}</Button>
    </form>}
  </Modal>;
}

function FundForm({ busy, error, onBack, onSubmit }) {
  const [values, setValues] = useState({ name: '', type: 'personal', accent: 'blue' });
  const valid = values.name.trim().length > 0;
  return <Modal title="CREATE FUND" onClose={onBack}><form onSubmit={(event) => { event.preventDefault(); if (valid && !busy) onSubmit({ ...values, name: values.name.trim() }); }}>
    <Field label="NAME"><input autoFocus required maxLength="35" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Personal, House…"/></Field>
    <Field label="TYPE"><select value={values.type} onChange={(e) => setValues({ ...values, type: e.target.value })}><option value="personal">Personal</option><option value="shared">Shared</option></select></Field>
    <fieldset className="swatches"><legend>ACCENT</legend>{['blue', 'red', 'green', 'purple', 'yellow'].map((accent) => <button type="button" aria-label={accent} className={`${accent} ${values.accent === accent ? 'active' : ''}`} onClick={() => setValues({ ...values, accent })} key={accent}/>)}</fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button disabled={busy || !valid}>{busy ? 'CREATING…' : 'CREATE FUND'}</Button>
  </form></Modal>;
}

function NoFunds({ message = 'Create your first Fund before recording an expense.' }) {
  return <div className="empty"><h3>NO FUNDS YET.</h3><p>{message}</p></div>;
}
