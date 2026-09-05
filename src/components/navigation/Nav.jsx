import { useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const links = [['/', '⌂', 'Home'], ['/funds', '▰', 'Funds'], ['/activity', '≡', 'Activity'], ['/summary', '▥', 'Summary'], ['/profile', '●', 'Profile']];

export default function Nav({ onQuick }) {
  const loc = useLocation(); const navigate = useNavigate();
  const [pressed, setPressed] = useState(''); const pressTimer = useRef(null);
  const press = (key, action) => {
    window.clearTimeout(pressTimer.current); setPressed(key);
    pressTimer.current = window.setTimeout(() => { setPressed(''); action(); }, 140);
  };
  return <><aside className="rail"><NavLink to="/" className="brand"><span>HISAB</span><b>KITAB!</b></NavLink><nav>{links.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'}><i>{icon}</i><span>{label}</span></NavLink>)}</nav><button className="rail-add" onClick={onQuick}>+ ADD</button><p className="rail-note">MONEY,<br/>WITHOUT THE<br/><em>MYSTERY.</em></p></aside><nav className="mobile-nav">{links.filter((item) => item[0] !== '/summary').map(([to, icon, label], index) => <span key={to}>{index === 2 && <button onClick={() => press('add', onQuick)} className={`mobile-add ${pressed === 'add' ? 'is-pressed' : ''}`} aria-label="Add">+</button>}<NavLink to={to} end={to === '/'} className={({ isActive }) => `${isActive ? 'active' : ''} ${pressed === to ? 'is-pressed' : ''}`} onClick={(event) => { event.preventDefault(); press(to, () => navigate(to)); }}><i>{icon}</i><small>{label}</small></NavLink></span>)}</nav><div className="page-mark">{loc.pathname === '/' ? '01' : loc.pathname.includes('fund') ? '02' : loc.pathname.includes('activity') ? '03' : loc.pathname.includes('summary') ? '04' : '05'}</div></>;
}
