import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import Nav from './components/navigation/Nav';
import Dashboard from './pages/Dashboard';
import Auth, { FirebaseSetup } from './pages/Auth';

const QuickAdd = lazy(() => import('./components/forms/QuickAdd'));
const Funds = lazy(() => import('./pages/Funds'));
const FundDetail = lazy(() => import('./pages/FundDetail'));
const Activity = lazy(() => import('./pages/Activity'));
const Summary = lazy(() => import('./pages/Summary'));
const Profile = lazy(() => import('./pages/Profile'));

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
      {data.error && <div className="error-banner" role="alert"><strong>FIRESTORE NEEDS ATTENTION.</strong><span>{data.error}</span><button onClick={data.refresh}>RETRY</button></div>}
      {data.loading ? <LedgerLoading/> : <Suspense fallback={<div className="route-loading">INKING THE NEXT PAGE…</div>}><Routes>
        <Route path="/" element={<Dashboard onAction={setQuickAction}/>}/>
        <Route path="/funds" element={<Funds/>}/>
        <Route path="/funds/:id" element={<FundDetail/>}/>
        <Route path="/activity" element={<Activity/>}/>
        <Route path="/summary" element={<Summary/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes></Suspense>}
    </main>
    {quickAction && <Suspense fallback={null}><QuickAdd initial={quickAction} onClose={() => setQuickAction(null)}/></Suspense>}
    {data.toast && <div className={`toast ${data.toast.type}`} role="status">{data.toast.message}</div>}
  </div>;
}

function LedgerLoading() {
  return <div className="ledger-loading" role="status" aria-live="polite">
    <div className="sync-minimal"><span className="sync-dot" aria-hidden="true"/><b>SYNCING YOUR BOOK…</b><small>Fetching your latest ledger</small></div>
  </div>;
}
