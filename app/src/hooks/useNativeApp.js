import { useEffect } from 'react';

const QUICK_ACTION_PATTERN = /hisabkitab:\/\/add\/(expense|remittance|transfer|fund)/;
const PROTECTED_CONTROL_SELECTOR =
  'button, a[href], [role="button"], [role="menuitem"], [role="option"]';

const quickActionFromUrl = (url) => url?.match(QUICK_ACTION_PATTERN)?.[1] ?? null;

export function useNativeAppNavigation({ location, navigate, quickAction, setQuickAction }) {
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return undefined;
    let backHandle;
    let urlHandle;
    let cancelled = false;

    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return;
      backHandle = App.addListener('backButton', () => {
        if (quickAction) setQuickAction(null);
        else if (location.pathname !== '/') navigate(-1);
        else App.minimizeApp();
      });
      urlHandle = App.addListener('appUrlOpen', ({ url }) => {
        const action = quickActionFromUrl(url);
        if (action) setQuickAction(action);
      });
      App.getLaunchUrl().then(({ url }) => {
        const action = quickActionFromUrl(url);
        if (action) setQuickAction(action);
      });
    });

    return () => {
      cancelled = true;
      backHandle?.then?.((handle) => handle.remove());
      urlHandle?.then?.((handle) => handle.remove());
    };
  }, [location.pathname, navigate, quickAction, setQuickAction]);
}

export function useNativeLongPressGuard() {
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return undefined;
    const isProtectedControl = (target) =>
      target instanceof Element && Boolean(target.closest(PROTECTED_CONTROL_SELECTOR));
    const protectControl = (event) => {
      if (isProtectedControl(event.target)) event.preventDefault();
    };
    document.addEventListener('contextmenu', protectControl, { capture: true });
    document.addEventListener('dragstart', protectControl, { capture: true });
    return () => {
      document.removeEventListener('contextmenu', protectControl, { capture: true });
      document.removeEventListener('dragstart', protectControl, { capture: true });
    };
  }, []);
}
