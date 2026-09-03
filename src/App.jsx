import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import Nav from './components/navigation/Nav';
import QuickAdd from './components/forms/QuickAdd';
import Dashboard from './pages/Dashboard';
import Funds from './pages/Funds';
import FundDetail from './pages/FundDetail';
import Activity from './pages/Activity';
import Summary from './pages/Summary';
import Profile from './pages/Profile';
import Auth, { FirebaseSetup } from './pages/Auth';

export default function App() {
  const { user, loading: authLoading, configured } = useAuth();
  const data = useData();
  const [quickAction, setQuickAction] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  if (!configured) return <FirebaseSetup/>;
  if (authLoading) return <div className="splash"><div className="mini-logo">HK!</div><span>OPENING THE BOOK…</span></div>;
  if (!user) return <Auth/>;

  return <div className="app-shell">
    <Nav onQuick={() => setQuickAction('menu')}/>
    <main className="content">
      {!online && <div className="offline">OFFLINE — FIRESTORE WILL SYNC SUPPORTED WRITES WHEN YOU RETURN.</div>}
      {data.error && <div className="error-banner" role="alert">{data.error}<button onClick={data.refresh}>RETRY</button></div>}
      {data.loading ? <div className="ledger-loading"><span/><b>SYNCING YOUR BOOK…</b></div> : <Routes>
        <Route path="/" element={<Dashboard onAction={setQuickAction}/>}/>
        <Route path="/funds" element={<Funds/>}/>
        <Route path="/funds/:id" element={<FundDetail/>}/>
        <Route path="/activity" element={<Activity/>}/>
        <Route path="/summary" element={<Summary/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>}
    </main>
    {quickAction && <QuickAdd initial={quickAction} onClose={() => setQuickAction(null)}/>}
    {data.toast && <div className={`toast ${data.toast.type}`} role="status">{data.toast.message}</div>}
  </div>;
}
