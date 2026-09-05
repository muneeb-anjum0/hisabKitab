import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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

  useComicTouchFeedback();

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
  if (authLoading) return <BookOpeningLoader label="OPENING THE BOOK…"/>;
  if (!user) return <Auth/>;

  return <div className="app-shell">
    <Nav onQuick={() => setQuickAction('menu')}/>
    <main className="content">
      {!online && <div className="offline">OFFLINE — FIRESTORE WILL SYNC SUPPORTED WRITES WHEN YOU RETURN.</div>}
      {data.error && <div className="error-banner" role="alert"><strong>FIRESTORE NEEDS ATTENTION.</strong><span>{data.error}</span><button onClick={data.refresh}>RETRY</button></div>}
      {data.loading ? <LedgerLoading/> : <Suspense fallback={<div className="route-loading">INKING THE NEXT PAGE…</div>}><AnimatedRoutes>
        <Route path="/" element={<Dashboard onAction={setQuickAction}/>}/>
        <Route path="/funds" element={<Funds/>}/>
        <Route path="/funds/:id" element={<FundDetail/>}/>
        <Route path="/activity" element={<Activity/>}/>
        <Route path="/summary" element={<Summary/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </AnimatedRoutes></Suspense>}
    </main>
    {quickAction && <Suspense fallback={null}><QuickAdd initial={quickAction} onClose={() => setQuickAction(null)}/></Suspense>}
    {data.toast && <div className={`toast ${data.toast.type}`} role="status">{data.toast.message}</div>}
  </div>;
}

const comicControlSelector = 'button, a[href], [role="button"]';
const comicTapDuration = 190;

function useComicTouchFeedback() {
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 800px)');
    const replaying = new WeakSet();
    const pending = new WeakSet();
    const timers = new Set();
    let touchedControl = null;

    const findControl = (target) => target instanceof Element ? target.closest(comicControlSelector) : null;
    const rememberTouch = (event) => {
      touchedControl = event.pointerType === 'touch' || event.pointerType === 'pen'
        ? findControl(event.target)
        : null;
    };
    const clearTouch = () => { touchedControl = null; };
    const animateBeforeAction = (event) => {
      const control = findControl(event.target);
      if (!mobile.matches || !control || control !== touchedControl || replaying.has(control)) {
        if (control && replaying.has(control)) replaying.delete(control);
        return;
      }
      touchedControl = null;
      if (control.matches(':disabled, [aria-disabled="true"]') || pending.has(control)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      pending.add(control);
      const controls = [...document.querySelectorAll(comicControlSelector)].filter((item) => item.offsetParent !== null);
      const variant = (Math.max(0, controls.indexOf(control)) % 6) + 1;
      control.classList.remove('comic-tap-1', 'comic-tap-2', 'comic-tap-3', 'comic-tap-4', 'comic-tap-5', 'comic-tap-6');
      void control.offsetWidth;
      control.classList.add('comic-touching', `comic-tap-${variant}`);

      const timer = window.setTimeout(() => {
        timers.delete(timer);
        pending.delete(control);
        control.classList.remove('comic-touching', `comic-tap-${variant}`);
        if (!control.isConnected) return;
        replaying.add(control);
        control.click();
      }, comicTapDuration);
      timers.add(timer);
    };

    document.addEventListener('pointerdown', rememberTouch, true);
    document.addEventListener('pointercancel', clearTouch, true);
    document.addEventListener('click', animateBeforeAction, true);
    return () => {
      document.removeEventListener('pointerdown', rememberTouch, true);
      document.removeEventListener('pointercancel', clearTouch, true);
      document.removeEventListener('click', animateBeforeAction, true);
      timers.forEach(window.clearTimeout);
    };
  }, []);
}

function AnimatedRoutes({ children }) {
  const location = useLocation();
  return <div className="route-enter" key={location.pathname}><Routes location={location}>{children}</Routes></div>;
}

function LedgerLoading() {
  return <BookOpeningLoader label="SYNCING YOUR BOOK…"/>;
}

function BookOpeningLoader({ label }) {
  return <div className="splash book-opening-loader" role="status" aria-live="polite"><div className="mini-logo" aria-hidden="true">HK!</div><span>{label}</span></div>;
}
