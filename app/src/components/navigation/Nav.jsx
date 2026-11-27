import { NavLink, useLocation } from 'react-router-dom';

const links = [
  ['/', '⌂', 'Home'],
  ['/funds', '▰', 'Funds'],
  ['/activity', '≡', 'Activity'],
  ['/summary', '▥', 'Summary'],
  ['/profile', '●', 'Profile'],
];

export default function Nav({ onQuick }) {
  const loc = useLocation();
  const mobileLinks = links.filter((item) => item[0] !== '/summary');
  return (
    <>
      <aside className="rail">
        <NavLink to="/" className="brand">
          <span>HISAB</span>
          <b>KITAB!</b>
        </NavLink>
        <nav aria-label="Main navigation">
          {links.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <i aria-hidden="true">{icon}</i>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="rail-add" onClick={onQuick} aria-label="Add money or expense">
          + ADD
        </button>
        <p className="rail-note">
          MONEY,
          <br />
          WITHOUT THE
          <br />
          <em>MYSTERY.</em>
        </p>
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileLinks.map(([to, icon, label], index) => (
          <span key={to}>
            {index === 2 && (
              <button onClick={onQuick} className="mobile-add" aria-label="Add">
                +
              </button>
            )}
            <NavLink to={to} end={to === '/'}>
              <i aria-hidden="true">{icon}</i>
              <small>{label}</small>
            </NavLink>
          </span>
        ))}
      </nav>
      <div className="page-mark">
        {loc.pathname === '/'
          ? '01'
          : loc.pathname.includes('fund')
            ? '02'
            : loc.pathname.includes('activity')
              ? '03'
              : loc.pathname.includes('summary')
                ? '04'
                : '05'}
      </div>
    </>
  );
}
