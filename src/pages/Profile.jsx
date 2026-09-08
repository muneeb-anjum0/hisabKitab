import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/comic/Comic';

export default function Profile() {
  const auth = useAuth(); const data = useData();
  const [category, setCategory] = useState('');
  return <>
    <div className="page-title compact"><span className="kicker">BEHIND THE BOOK</span><h1>PROFILE</h1></div>
    <section className="profile-grid">
      <div className="panel identity"><div className="big-avatar">{auth.user?.displayName?.[0] || auth.user?.email?.[0] || 'H'}</div><h2>{auth.user?.displayName || 'Ledger keeper'}</h2><p>{auth.user?.email}</p><Button variant="paper" onClick={auth.logout}>LOG OUT</Button></div>
      <div className="panel settings"><details className="category-settings"><summary role="button"><span>CATEGORIES</span><b>OPEN</b></summary><div className="category-settings-body"><p>System categories are always available. Add only what helps explain your spending.</p><div className="category-cloud">{data.categories.map((item) => <span key={item.id}>{item.symbol} {item.name}</span>)}</div><form onSubmit={async (event) => { event.preventDefault(); if (!category.trim()) return; await data.addCategory(category.trim()); setCategory(''); }}><label className="field"><span>NEW CATEGORY</span><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength="30" placeholder="Pets, Gifts…"/></label><Button disabled={!category.trim()}>ADD CATEGORY</Button></form></div></details></div>
      <div className="panel pwa-note"><b>PUT IT IN YOUR POCKET</b><p>Install HisabKitab from your browser menu for a full-screen application and cached shell.</p></div>
    </section>
  </>;
}
