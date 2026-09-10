import { useEffect, useState } from 'react';

export default function BookOpeningLoader() {
  const [progress, setProgress] = useState(12);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) =>
        current >= 88
          ? current
          : Math.min(88, current + Math.max(2, Math.round((88 - current) / 7))),
      );
    }, 90);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="splash book-opening-loader" role="status" aria-live="polite">
      <div className="startup-card">
        <div className="mini-logo" aria-hidden="true">
          <img src="/icon.svg" alt="" />
        </div>
        <div className="startup-copy">
          <strong>OPENING YOUR BOOK…</strong>
          <small>Getting your latest ledger ready</small>
        </div>
        <div className="startup-progress" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
