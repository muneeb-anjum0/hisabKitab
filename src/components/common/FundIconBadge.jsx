const paths = {
  gym: <><path d="M5 9v6M8 7v10M16 7v10M19 9v6M8 12h8"/></>,
  travel: <path d="m3 13 8-2 4-7 2 1-2 7 5 3-1 2-6-2-4 5-2-1 2-5-6 1Z"/>,
  home: <><path d="m4 11 8-7 8 7"/><path d="M6 10v10h12V10M10 20v-6h4v6"/></>,
  fuel: <><path d="M6 21V5h9v16M4 21h13M8 8h5"/><path d="m15 8 3 3v6c0 2 3 2 3 0V9l-2-2"/></>,
  study: <><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2Z"/><path d="M8 8h8M8 12h8"/></>,
  savings: <><path d="M5 9h14v10H5z"/><path d="M8 9V6h8v3M9 14h6"/></>,
  personal: <><circle cx="12" cy="8" r="4"/><path d="M5 21c.5-5 3-7 7-7s6.5 2 7 7"/></>,
  misc: <><rect x="5" y="5" width="14" height="14"/><path d="M9 9h6v6H9z"/></>,
};

export function fundIconType(name = '') {
  const value = name.toLowerCase();
  if (/gym|fitness/.test(value)) return 'gym';
  if (/travel|trip/.test(value)) return 'travel';
  if (/kitchen|food|house|home/.test(value)) return 'home';
  if (/fuel|car/.test(value)) return 'fuel';
  if (/university|study/.test(value)) return 'study';
  if (/saving|emergency/.test(value)) return 'savings';
  if (/personal/.test(value)) return 'personal';
  return 'misc';
}

export default function FundIconBadge({ name }) {
  return <span className="fund-icon-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">{paths[fundIconType(name)]}</svg></span>;
}
