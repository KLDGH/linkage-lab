import { NavLink } from 'react-router-dom'

export default function SiteNav() {
  return (
    <header className="site-header">
      <NavLink to="/" className="site-logo">
        <svg className="site-logo-mark" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="4" y="4" width="92" height="92" rx="20" fill="#ad8b46" />
          <rect x="45.5" y="17" width="9" height="66" fill="#151311" />
          <rect x="39" y="13" width="22" height="8" rx="3" fill="#151311" />
          <rect x="43" y="79" width="14" height="10" rx="3" fill="#151311" />
          <g fill="#e6e6e6" stroke="#151311" strokeWidth="2.6" strokeLinejoin="round">
            <rect x="27" y="24" width="46" height="8.5" rx="4.25" transform="rotate(15 50 28.25)" />
            <rect x="27" y="34" width="46" height="8.5" rx="4.25" transform="rotate(-15 50 38.25)" />
            <rect x="27" y="44" width="46" height="8.5" rx="4.25" transform="rotate(15 50 48.25)" />
            <rect x="27" y="54" width="46" height="8.5" rx="4.25" transform="rotate(-15 50 58.25)" />
            <rect x="27" y="64" width="46" height="8.5" rx="4.25" transform="rotate(15 50 68.25)" />
          </g>
        </svg>
        <span>SOLITAIRE <span className="logo-accent">DYNAMICS</span></span>
      </NavLink>
      <nav className="site-nav">
        <NavLink to="/" end className={({ isActive }) => 'site-nav-link' + (isActive ? ' site-nav-active' : '')}>
          Tools
        </NavLink>
        <NavLink to="/learn" className={({ isActive }) => 'site-nav-link' + (isActive ? ' site-nav-active' : '')}>
          Learn
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => 'site-nav-link' + (isActive ? ' site-nav-active' : '')}>
          About
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => 'site-nav-link' + (isActive ? ' site-nav-active' : '')}>
          Contact
        </NavLink>
      </nav>
    </header>
  )
}
