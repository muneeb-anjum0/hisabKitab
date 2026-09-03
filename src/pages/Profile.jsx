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
  return <>
    <div className="page-title compact"><span className="kicker">BEHIND THE BOOK</span><h1>PROFILE</h1></div>
    <section className="profile-grid">
      <div className="panel identity"><div className="big-avatar">{auth.user?.displayName?.[0] || auth.user?.email?.[0] || 'H'}</div><h2>{auth.user?.displayName || 'Ledger keeper'}</h2><p>{auth.user?.email}</p><span className="status live">● FIREBASE CONNECTED · {provider.toUpperCase()}</span><Button variant="paper" onClick={auth.logout}>LOG OUT</Button></div>
      <div className="panel settings"><h2>ACCOUNT</h2><form onSubmit={updateName}><Field label="DISPLAY NAME"><input required maxLength="60" value={name} onChange={(event) => setName(event.target.value)}/></Field>{error && <p className="form-error">{error}</p>}<Button disabled={busy || !name.trim()}>{busy ? 'SAVING…' : 'SAVE NAME'}</Button></form><hr/><h2>CATEGORIES</h2><p>System categories are always available. Add only what helps explain your spending.</p><div className="category-cloud">{data.categories.map((item) => <span key={item.id}>{item.symbol} {item.name}</span>)}</div><form onSubmit={async (event) => { event.preventDefault(); if (!category.trim()) return; await data.addCategory(category.trim()); setCategory(''); }}><Field label="NEW CATEGORY"><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength="30" placeholder="Pets, Gifts…"/></Field><Button disabled={!category.trim()}>ADD CATEGORY</Button></form></div>
      <div className="panel pwa-note"><b>PUT IT IN YOUR POCKET</b><p>Install HisabKitab from your browser menu for a full-screen application and cached shell.</p></div>
    </section>
  </>;
}
