import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Button, Field } from '../components/comic/Comic';

export default function Profile() {
  const auth = useAuth(); const data = useData();
  const [category, setCategory] = useState('');
  const [name, setName] = useState(auth.user?.displayName || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const provider = auth.user?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email and password';
  const updateName = async (event) => {
    event.preventDefault(); if (!name.trim() || busy) return;
    setBusy(true); setError('');
    try { await auth.changeDisplayName(name.trim()); data.setToast({ type: 'success', message: 'PROFILE UPDATED.' }); }
    catch (updateError) { setError(updateError.message); }
    finally { setBusy(false); }
  };
  return <div className="profile-compact"><div className="profile-heading"><span className="kicker">YOUR ACCOUNT</span><h1>PROFILE</h1></div><section className="panel profile-card"><header><div className="big-avatar">{auth.user?.displayName?.[0] || auth.user?.email?.[0] || 'H'}</div><div><h2>{auth.user?.displayName || 'Ledger keeper'}</h2><p>{auth.user?.email}</p></div></header><form onSubmit={updateName}><Field label="DISPLAY NAME"><input required maxLength="60" value={name} onChange={(event) => setName(event.target.value)}/></Field>{error && <p className="form-error">{error}</p>}<Button disabled={busy || !name.trim()}>{busy ? 'SAVING…' : 'SAVE NAME'}</Button></form><dl><div><dt>AUTH</dt><dd>{provider}</dd></div><div><dt>APP STATUS</dt><dd>{navigator.onLine ? 'Online' : 'Offline'} · {window.matchMedia('(display-mode: standalone)').matches ? 'Installed' : 'Browser'}</dd></div></dl><details><summary>CUSTOM CATEGORIES</summary><div className="category-cloud">{data.categories.map((item) => <span key={item.id}>{item.symbol} {item.name}</span>)}</div><form onSubmit={async (event) => { event.preventDefault(); if (!category.trim()) return; await data.addCategory(category.trim()); setCategory(''); }}><Field label="NEW CATEGORY"><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength="30" placeholder="Pets, Gifts…"/></Field><Button disabled={!category.trim()}>ADD</Button></form></details><Button variant="paper" onClick={auth.logout}>LOG OUT</Button></section></div>;
}
