import { useEffect, useRef } from 'react';

export function Panel({ children, className = '', as: Tag = 'section', ...props }) {
  return <Tag className={`panel ${className}`} {...props}>{children}</Tag>;
}

export function Button({ children, variant = 'ink', className = '', ...props }) {
  return <button className={`ink-button ${variant} ${className}`} {...props}>{children}</button>;
}

export function Empty({ title = 'THIS PLACE IS TOO QUIET…', children, action }) {
  return <div className="empty">
    <div className="empty-burst">?</div>
    <h3>{title}</h3>
    <p>{children}</p>
    {action}
  </div>;
}

export function Field({ label, error, children, className = '' }) {
  return <label className={`field ${className}`}>
    <span>{label}</span>{children}
    {error && <small className="field-error">{error}</small>}
  </label>;
}

export function Modal({ title, onClose, children, wide = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
    const first = focusable()[0];
    window.setTimeout(() => first?.focus(), 20);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const firstItem = items[0]; const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className={`modal panel ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      <div className="torn-label">DO THE MATH</div>
      <h2 id="modal-title">{title}</h2>
      {children}
    </section>
  </div>;
}

export function Progress({ value, max, label }) {
  const percentage = max ? Math.min(100, Math.max(0, value / max * 100)) : 0;
  return <div className="progress-wrap">
    <div className="progress-label"><span>{label}</span><b>{Math.round(percentage)}%</b></div>
    <div className="progress"><i style={{ width: `${percentage}%` }}/></div>
  </div>;
}
