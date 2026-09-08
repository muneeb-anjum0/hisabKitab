import { NavLink, useLocation } from 'react-router-dom';

const links = [['/', '⌂', 'Home'], ['/funds', '▰', 'Funds'], ['/activity', '≡', 'Activity'], ['/summary', '▥', 'Summary'], ['/profile', '●', 'Profile']];

export default function Nav({ onQuick }) {
  const loc = useLocation();
  const mobileLinks = links.filter((item) => item[0] !== '/summary');
  const activeIndex = loc.pathname === '/' ? 0 : loc.pathname.startsWith('/funds') ? 1 : loc.pathname.startsWith('/activity') ? 2 : 3;
  return <><aside className="rail"><NavLink to="/" className="brand"><span>HISAB</span><b>KITAB!</b></NavLink><nav>{links.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'}><i>{icon}</i><span>{label}</span></NavLink>)}</nav><button className="rail-add" onClick={onQuick}>+ ADD</button><p className="rail-note">MONEY,<br/>WITHOUT THE<br/><em>MYSTERY.</em></p></aside><nav className="mobile-nav" style={{ '--nav-shift': `${activeIndex * 100}%` }}><i className="nav-liquid-indicator" aria-hidden="true"/>{mobileLinks.map(([to, icon, label], index) => <span key={to}>{index === 2 && <button onClick={onQuick} className="mobile-add" aria-label="Add">+</button>}<NavLink to={to} end={to === '/'}><i>{icon}</i><small>{label}</small></NavLink></span>)}</nav><div className="page-mark">{loc.pathname === '/' ? '01' : loc.pathname.includes('fund') ? '02' : loc.pathname.includes('activity') ? '03' : loc.pathname.includes('summary') ? '04' : '05'}</div></>;
}
