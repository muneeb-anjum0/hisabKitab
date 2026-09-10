import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import BookOpeningLoader from './components/common/BookOpeningLoader';
import Nav from './components/navigation/Nav';
import { useAuth } from './contexts/auth';
import { useData } from './contexts/data';
import { useComicTouchFeedback, useMobileNavigationGestures } from './hooks/useComicInteractions';
import { useNativeAppNavigation, useNativeLongPressGuard } from './hooks/useNativeApp';
import { useNetworkNotice } from './hooks/useNetworkNotice';
import Auth, { FirebaseSetup } from './pages/Auth';

const Activity = lazy(() => import('./pages/Activity'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FundDetail = lazy(() => import('./pages/FundDetail'));
const Funds = lazy(() => import('./pages/Funds'));
const Profile = lazy(() => import('./pages/Profile'));
const QuickAdd = lazy(() => import('./components/forms/QuickAdd'));
const Summary = lazy(() => import('./pages/Summary'));

export default function App() {
  const { user, loading: authLoading, configured } = useAuth();
  const data = useData();
  const [quickAction, setQuickAction] = useState(null);
  const networkNotice = useNetworkNotice();
  const navigate = useNavigate();
  const location = useLocation();

  useComicTouchFeedback();
  useNativeLongPressGuard();
  useMobileNavigationGestures();
  useNativeAppNavigation({ location, navigate, quickAction, setQuickAction });

  if (!configured) return <FirebaseSetup />;
  if (authLoading || (user && data.loading)) return <BookOpeningLoader />;
  if (!user) return <Auth />;

  return (
    <div className="app-shell">
      {networkNotice && <NetworkBanner state={networkNotice} />}
      <Nav onQuick={() => setQuickAction('menu')} />
      <main className="content">
        {data.error && <DataError message={data.error} onRetry={data.refresh} />}
        <Suspense fallback={<div className="route-loading">INKING THE NEXT PAGE…</div>}>
          <AnimatedRoutes>
            <Route path="/" element={<Dashboard onAction={setQuickAction} />} />
            <Route path="/funds" element={<Funds />} />
            <Route path="/funds/:id" element={<FundDetail />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </AnimatedRoutes>
        </Suspense>
      </main>
      {quickAction && (
        <Suspense fallback={null}>
          <QuickAdd initial={quickAction} onClose={() => setQuickAction(null)} />
        </Suspense>
      )}
      {data.toast && (
        <div className={`toast ${data.toast.type}`} role="status">
          {data.toast.message}
        </div>
      )}
    </div>
  );
}

function AnimatedRoutes({ children }) {
  const location = useLocation();
  return (
    <div className="route-enter" key={location.pathname}>
      <Routes location={location}>{children}</Routes>
    </div>
  );
}

function NetworkBanner({ state }) {
  const offline = state === 'offline';
  return (
    <div className={`network-banner ${state}`} role="status">
      <b>{offline ? 'NO SIGNAL. STILL COUNTING.' : 'SIGNAL’S BACK!'}</b>
      <span>
        {offline
          ? 'Changes save here now and sync when the internet returns.'
          : 'Your queued changes are heading to the ledger.'}
      </span>
    </div>
  );
}

function DataError({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <strong>FIRESTORE NEEDS ATTENTION.</strong>
      <span>{message}</span>
      <button onClick={onRetry}>RETRY</button>
    </div>
  );
}
