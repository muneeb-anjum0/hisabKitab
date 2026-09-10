import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

export function ComicSelect({ label, value, options, onChange, disabled = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const root = useRef(null);
  const menu = useRef(null);
  const pickTimer = useRef(null);
  const selected = options.find(([id]) => id === value)?.[1] || options[0]?.[1] || 'Nothing to pick';

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === 'Escape' || (!root.current?.contains(event.target) && !menu.current?.contains(event.target))) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(pickTimer.current), []);

  const pick = (id) => {
    if (picked !== null) return;
    setPicked(id);
    pickTimer.current = window.setTimeout(() => {
      onChange(id);
      setOpen(false);
      setPicked(null);
    }, 520);
  };

  const popover = open && createPortal(<div className="comic-options-layer" onPointerDown={(event) => event.target === event.currentTarget && setOpen(false)}><div className="comic-options" ref={menu} role="listbox" aria-label={label}>{options.map(([id, text], index) => <button type="button" data-comic-option role="option" aria-selected={id === value} className={picked === id ? 'comic-option-picked' : ''} style={{ '--option-index': index }} key={id} onClick={() => pick(id)}>{text}<b>{picked === id ? 'POW!' : id === value ? '✓' : ''}</b></button>)}</div></div>, document.body);
  return <><div className={`comic-select ${open ? 'open' : ''} ${compact ? 'compact' : ''}`} ref={root}><span>{label}</span><button type="button" disabled={disabled || !options.length} onClick={() => { setPicked(null); setOpen(!open); }} aria-haspopup="listbox" aria-expanded={open}>{selected}<b>▾</b></button></div>{popover}</>;
}

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const padDate = (value) => String(value).padStart(2, '0');

export function ComicDatePicker({ label, value, onChange, mode = 'date', allowClear = false }) {
  const [open, setOpen] = useState(false);
  const initial = /^\d{4}-\d{2}/.test(value || '') ? value : new Date().toISOString().slice(0, 10);
  const [view, setView] = useState(() => ({ year: Number(initial.slice(0, 4)), month: Number(initial.slice(5, 7)) - 1 }));
  const selectedDay = mode === 'date' ? Number(String(value).slice(8, 10)) : 0;
  const shift = (amount) => setView((current) => {
    const next = new Date(current.year, current.month + amount, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });
  const chooseMonth = (month) => {
    onChange(`${view.year}-${padDate(month + 1)}`);
    setOpen(false);
  };
  const chooseDay = (day) => {
    onChange(`${view.year}-${padDate(view.month + 1)}-${padDate(day)}`);
    setOpen(false);
  };
  const days = mode === 'date' ? Array.from({ length: new Date(view.year, view.month + 1, 0).getDate() }, (_, index) => index + 1) : [];
  const blanks = mode === 'date' ? Array.from({ length: (new Date(view.year, view.month, 1).getDay() + 6) % 7 }) : [];
  const display = value ? (mode === 'month' ? `${monthNames[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}` : new Date(`${value}T12:00:00`).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })) : 'Pick a date';

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  const calendar = open && createPortal(<div className="comic-options-layer" onPointerDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="comic-calendar" role="dialog" aria-modal="true" aria-label={label}>
    <header><button type="button" onClick={() => mode === 'month' ? setView({ ...view, year: view.year - 1 }) : shift(-1)} aria-label="Previous">←</button><b>{mode === 'month' ? view.year : `${monthNames[view.month]} ${view.year}`}</b><button type="button" onClick={() => mode === 'month' ? setView({ ...view, year: view.year + 1 }) : shift(1)} aria-label="Next">→</button></header>
    {mode === 'month' ? <div className="comic-months">{monthNames.map((month, index) => <button type="button" className={value === `${view.year}-${padDate(index + 1)}` ? 'selected' : ''} onClick={() => chooseMonth(index)} key={month}>{month}</button>)}</div> : <><div className="comic-weekdays">{['M','T','W','T','F','S','S'].map((day, index) => <b key={`${day}-${index}`}>{day}</b>)}</div><div className="comic-days">{blanks.map((_, index) => <i key={`blank-${index}`}/>)}{days.map((day) => <button type="button" className={day === selectedDay && value?.startsWith(`${view.year}-${padDate(view.month + 1)}`) ? 'selected' : ''} onClick={() => chooseDay(day)} key={day}>{day}</button>)}</div></>}
    <footer>{allowClear && <button type="button" onClick={() => { onChange(''); setOpen(false); }}>CLEAR IT</button>}<button type="button" onClick={() => setOpen(false)}>NEVER MIND</button></footer>
  </section></div>, document.body);

  return <><div className="comic-select comic-date"><span>{label}</span><button type="button" onClick={() => { const source = /^\d{4}-\d{2}/.test(value || '') ? value : new Date().toISOString().slice(0, 10); setView({ year: Number(source.slice(0, 4)), month: Number(source.slice(5, 7)) - 1 }); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}>{display}<b>▾</b></button></div>{calendar}</>;
}

export function Modal({ title, onClose, children, wide = false }) {
  const dialogRef = useRef(null);
  const backdropRef = useRef(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    if (!dialog) return undefined;

    const resetToTop = () => {
      dialog.scrollTop = 0;
      if (backdrop) backdrop.scrollTop = 0;
    };

    resetToTop();
    const frame = window.requestAnimationFrame(resetToTop);
    const timer = window.setTimeout(resetToTop, 280);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [title, wide]);

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
    const fitViewport = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      backdropRef.current?.style.setProperty('--modal-viewport-height', `${viewport.height}px`);
      backdropRef.current?.style.setProperty('--modal-viewport-top', `${viewport.offsetTop}px`);
      if (document.activeElement?.matches?.('input,textarea,select')) {
        window.requestAnimationFrame(() => document.activeElement?.scrollIntoView?.({ block: 'nearest' }));
      }
    };
    fitViewport();
    window.visualViewport?.addEventListener('resize', fitViewport);
    window.visualViewport?.addEventListener('scroll', fitViewport);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.visualViewport?.removeEventListener('resize', fitViewport);
      window.visualViewport?.removeEventListener('scroll', fitViewport);
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return createPortal(<div ref={backdropRef} className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className={`modal panel ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header className="modal-heading"><div><div className="torn-label">DO THE MATH</div><h2 id="modal-title">{title}</h2></div><button className="modal-close" onClick={onClose} aria-label="Close">×</button></header>
      {children}
    </section>
  </div>, document.body);
}

export function Progress({ value, max, label }) {
  const percentage = max ? Math.min(100, Math.max(0, value / max * 100)) : 0;
  return <div className="progress-wrap">
    <div className="progress-label"><span>{label}</span><b>{Math.round(percentage)}%</b></div>
    <div className="progress"><i style={{ width: `${percentage}%` }}/></div>
  </div>;
}
