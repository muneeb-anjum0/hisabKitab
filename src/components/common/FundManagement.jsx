import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { fundDeletionAssessment } from '../../lib/calculations';
import { money } from '../../lib/currency';
import { Button, Field, Modal } from '../comic/Comic';

const accents = ['blue', 'red', 'green', 'purple', 'yellow'];

export default function FundManagement({ fund, owner, detail = false }) {
  const data = useData(); const navigate = useNavigate(); const [menu, setMenu] = useState(false); const [mode, setMode] = useState(null); const menuRef = useRef(null); const triggerRef = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (event) => { if (event.key === 'Escape') { setMenu(false); triggerRef.current?.focus(); } else if (!menuRef.current?.contains(event.target)) setMenu(false); };
    document.addEventListener('keydown', close); document.addEventListener('mousedown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('mousedown', close); };
  }, [menu]);
  if (!owner) return null;
  const choose = (next) => { setMenu(false); setMode(next); };
  return <>
    {detail ? <div className="fund-header-controls"><button onClick={() => choose('edit')}>EDIT</button><button onClick={() => choose('archive')}>{fund.archived ? 'RESTORE' : 'ARCHIVE'}</button><button onClick={() => choose('delete')}>DELETE</button></div> : <div className="fund-manage" ref={menuRef}><button ref={triggerRef} className="fund-menu-trigger" aria-label={`Manage ${fund.name} fund`} aria-haspopup="menu" aria-expanded={menu} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenu(!menu); }}>•••</button>{menu && <div className="fund-menu" role="menu"><button role="menuitem" autoFocus onClick={() => choose('edit')}>EDIT FUND</button><button role="menuitem" onClick={() => choose('archive')}>{fund.archived ? 'RESTORE FUND' : 'ARCHIVE FUND'}</button><button role="menuitem" onClick={() => choose('delete')}>DELETE FUND</button></div>}</div>}
    {mode === 'edit' && createPortal(<EditFund fund={fund} onClose={() => setMode(null)} onSave={async (values) => { await data.updateFund(fund.id, values); setMode(null); }}/>, document.body)}
    {mode === 'archive' && createPortal(<ArchiveFund fund={fund} onClose={() => setMode(null)} onSave={async () => { await data.updateFund(fund.id, { archived: !fund.archived }); setMode(null); if (!fund.archived && detail) navigate('/funds'); }}/>, document.body)}
    {mode === 'delete' && createPortal(<DeleteFund fund={fund} data={data} onClose={() => setMode(null)} onArchive={async () => { await data.updateFund(fund.id, { archived: true }); setMode(null); if (detail) navigate('/funds'); }} onDelete={async () => { await data.removeFund(fund.id); setMode(null); if (detail) navigate('/funds'); }}/>, document.body)}
  </>;
}

export function EditFund({ fund, onClose, onSave }) {
  const [values, setValues] = useState({ name: fund.name, type: fund.type || 'personal', accent: fund.accent || 'blue' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title="EDIT FUND" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); if (!values.name.trim() || busy) return; setBusy(true); try { await onSave({ ...values, name: values.name.trim() }); } catch (saveError) { setError(saveError.message); setBusy(false); } }}><Field label="FUND NAME"><input autoFocus required maxLength="35" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })}/></Field><Field label="TYPE"><select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}><option value="personal">Personal</option><option value="shared">Shared</option></select></Field><fieldset className="swatches"><legend>ACCENT</legend>{accents.map((accent) => <button type="button" aria-label={`${accent} accent`} className={`${accent} ${values.accent === accent ? 'active' : ''}`} onClick={() => setValues({ ...values, accent })} key={accent}/>)}</fieldset>{error && <p className="form-error">{error}</p>}<Button disabled={busy || !values.name.trim()}>{busy ? 'SAVING…' : 'SAVE FUND'}</Button></form></Modal>;
}

function ArchiveFund({ fund, onClose, onSave }) { const [busy, setBusy] = useState(false); return <Modal title={`${fund.archived ? 'RESTORE' : 'ARCHIVE'} ${fund.name}?`} onClose={onClose}><p>{fund.archived ? 'This Fund will return to active cards and money selectors.' : 'Its history stays intact, but it will be hidden from active cards and money selectors.'}</p><div className="confirm-actions"><Button variant="paper" onClick={onClose}>CANCEL</Button><Button disabled={busy} onClick={async () => { setBusy(true); try { await onSave(); } catch { setBusy(false); } }}>{busy ? 'SAVING…' : `${fund.archived ? 'RESTORE' : 'ARCHIVE'} FUND`}</Button></div></Modal>; }

function DeleteFund({ fund, data, onClose, onArchive, onDelete }) {
  const assessment = fundDeletionAssessment(fund.id, data); const [busy, setBusy] = useState(false);
  return <Modal title={`DELETE “${fund.name}”?`} onClose={onClose}><div className="delete-preview"><strong>{money(assessment.totals.remaining)} available</strong><span>{assessment.transactionCount} transaction{assessment.transactionCount !== 1 ? 's' : ''} · {assessment.moneyLots} Money Lot{assessment.moneyLots !== 1 ? 's' : ''}</span></div>{assessment.empty ? <><p>This Fund is completely empty. Deleting it cannot be undone.</p><div className="confirm-actions"><Button variant="paper" onClick={onClose}>CANCEL</Button><Button className="danger-button" disabled={busy} onClick={async () => { setBusy(true); try { await onDelete(); } catch { setBusy(false); } }}>{busy ? 'DELETING…' : 'DELETE FUND'}</Button></div></> : <><div className="history-warning"><b>THIS FUND HAS HISTORY.</b><p>To preserve your ledger, archive it instead. Funds with allocations, transactions, transfers, Money Lots, shared members, or a balance cannot be hard-deleted.</p></div><div className="confirm-actions"><Button variant="paper" onClick={onClose}>CANCEL</Button><Button disabled={busy} onClick={async () => { setBusy(true); try { await onArchive(); } catch { setBusy(false); } }}>{busy ? 'ARCHIVING…' : 'ARCHIVE FUND'}</Button></div></>}</Modal>;
}
