import { useEffect, useState } from 'react';

const ONLINE_NOTICE_DURATION = 2600;

export function useNetworkNotice() {
  const [notice, setNotice] = useState(navigator.onLine ? null : 'offline');

  useEffect(() => {
    let dismissTimer;
    const updateNotice = () => {
      window.clearTimeout(dismissTimer);
      if (!navigator.onLine) {
        setNotice('offline');
        return;
      }
      setNotice('back');
      dismissTimer = window.setTimeout(() => setNotice(null), ONLINE_NOTICE_DURATION);
    };
    window.addEventListener('online', updateNotice);
    window.addEventListener('offline', updateNotice);
    return () => {
      window.removeEventListener('online', updateNotice);
      window.removeEventListener('offline', updateNotice);
      window.clearTimeout(dismissTimer);
    };
  }, []);

  return notice;
}
