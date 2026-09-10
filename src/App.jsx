import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import Nav from './components/navigation/Nav';
import Auth, { FirebaseSetup } from './pages/Auth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
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
  const [networkNotice, setNetworkNotice] = useState(navigator.onLine ? null : 'offline');
  const navigate = useNavigate();
  const location = useLocation();

  useComicTouchFeedback();
  useNativeLongPressGuard();
  useMobileNavigationGestures();

  useEffect(() => {
    let dismiss;
    const updateNetwork = () => {
      const connected = navigator.onLine;
      window.clearTimeout(dismiss);
      if (connected) { setNetworkNotice('back'); dismiss = window.setTimeout(() => setNetworkNotice(null), 2600); }
      else setNetworkNotice('offline');
    };
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      window.clearTimeout(dismiss);
    };
  }, []);

  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return undefined;
    let backHandle; let urlHandle; let cancelled = false;
    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return;
      backHandle = App.addListener('backButton', () => {
        if (quickAction) setQuickAction(null);
        else if (location.pathname !== '/') navigate(-1);
        else App.minimizeApp();
      });
      urlHandle = App.addListener('appUrlOpen', ({ url }) => {
        const action = url?.match(/hisabkitab:\/\/add\/(expense|remittance|transfer|fund)/)?.[1];
        if (action) setQuickAction(action);
      });
      App.getLaunchUrl().then(({ url }) => {
        const action = url?.match(/hisabkitab:\/\/add\/(expense|remittance|transfer|fund)/)?.[1];
        if (action) setQuickAction(action);
      });
    });
    return () => { cancelled = true; backHandle?.then?.((handle) => handle.remove()); urlHandle?.then?.((handle) => handle.remove()); };
  }, [location.pathname, navigate, quickAction]);

  if (!configured) return <FirebaseSetup/>;
  if (authLoading || (user && data.loading)) return <BookOpeningLoader/>;
  if (!user) return <Auth/>;

  return <div className="app-shell">
    {networkNotice && <div className={`network-banner ${networkNotice}`} role="status"><b>{networkNotice === 'offline' ? 'NO SIGNAL. STILL COUNTING.' : 'SIGNAL’S BACK!'}</b><span>{networkNotice === 'offline' ? 'Changes save here now and sync when the internet returns.' : 'Your queued changes are heading to the ledger.'}</span></div>}
    <Nav onQuick={() => setQuickAction('menu')}/>
    <main className="content">
      {data.error && <div className="error-banner" role="alert"><strong>FIRESTORE NEEDS ATTENTION.</strong><span>{data.error}</span><button onClick={data.refresh}>RETRY</button></div>}
      <Suspense fallback={<div className="route-loading">INKING THE NEXT PAGE…</div>}><AnimatedRoutes>
        <Route path="/" element={<Dashboard onAction={setQuickAction}/>}/>
        <Route path="/funds" element={<Funds/>}/>
        <Route path="/funds/:id" element={<FundDetail/>}/>
        <Route path="/activity" element={<Activity/>}/>
        <Route path="/summary" element={<Summary/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </AnimatedRoutes></Suspense>
    </main>
    {quickAction && <Suspense fallback={null}><QuickAdd initial={quickAction} onClose={() => setQuickAction(null)}/></Suspense>}
    {data.toast && <div className={`toast ${data.toast.type}`} role="status">{data.toast.message}</div>}
  </div>;
}

function useNativeLongPressGuard() {
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return undefined;
    const isProtectedControl = (target) => target instanceof Element
      && Boolean(target.closest('button, a[href], [role="button"], [role="menuitem"], [role="option"]'));
    const stopLongPressMenu = (event) => {
      if (isProtectedControl(event.target)) event.preventDefault();
    };
    const stopControlDrag = (event) => {
      if (isProtectedControl(event.target)) event.preventDefault();
    };
    document.addEventListener('contextmenu', stopLongPressMenu, { capture: true });
    document.addEventListener('dragstart', stopControlDrag, { capture: true });
    return () => {
      document.removeEventListener('contextmenu', stopLongPressMenu, { capture: true });
      document.removeEventListener('dragstart', stopControlDrag, { capture: true });
    };
  }, []);
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
      if (control.matches('[data-comic-option]')) {
        touchedControl = null;
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
      const variant = ((control.textContent?.length || control.tagName.length) % 6) + 1;
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

function useMobileNavigationGestures() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!window.matchMedia('(max-width: 800px)').matches) return undefined;
    let start = null;
    const down = (event) => {
      if (event.pointerType !== 'touch' || event.target.closest('input,textarea,select,[data-no-swipe],.dashboard-funds,.money-lots')) return;
      if (event.clientX <= 28 || event.clientX >= window.innerWidth - 28) start = { x: event.clientX, y: event.clientY, edge: event.clientX <= 28 ? 'left' : 'right' };
    };
    const up = (event) => {
      if (!start) return;
      const dx = event.clientX - start.x; const dy = Math.abs(event.clientY - start.y); const edge = start.edge; start = null;
      if (dy > 55 || Math.abs(dx) < 72) return;
      if (edge === 'left' && dx > 0) {
        const close = document.querySelector('.modal-close');
        if (close) close.click(); else navigate(-1);
      }
      if (edge === 'right' && dx < 0) navigate(1);
    };
    const cancel = () => { start = null; };
    window.addEventListener('pointerdown', down, { passive: true }); window.addEventListener('pointerup', up, { passive: true }); window.addEventListener('pointercancel', cancel, { passive: true });
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); };
  }, [navigate]);
}

function AnimatedRoutes({ children }) {
  const location = useLocation();
  return <div className="route-enter" key={location.pathname}><Routes location={location}>{children}</Routes></div>;
}

function BookOpeningLoader() {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => current >= 88 ? current : Math.min(88, current + Math.max(2, Math.round((88 - current) / 7))));
    }, 90);
    return () => window.clearInterval(timer);
  }, []);

  return <div className="splash book-opening-loader" role="status" aria-live="polite">
    <div className="startup-card">
      <div className="mini-logo" aria-hidden="true"><img src="/icon.svg" alt="" /></div>
      <div className="startup-copy"><strong>OPENING YOUR BOOK…</strong><small>Getting your latest ledger ready</small></div>
      <div className="startup-progress" aria-hidden="true"><i style={{ width: `${progress}%` }}/></div>
    </div>
  </div>;
}
