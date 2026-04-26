import { NavLink } from 'react-router-dom'

export default function SiteNav() {
  return (
    <header className="site-header">
      <NavLink to="/" className="site-logo">
        SOLITAIRE <span className="logo-accent">DYNAMICS</span>
      </NavLink>
      <nav className="site-nav">
        <NavLink to="/" end className={({ isActive }) => 'site-nav-link' + (isActive ? ' site-nav-active' : '')}>
          Tools
        </NavLink>
        <NavLink to="/services" className={({ isActive }) => 'site-nav-link' + (isActive ? ' site-nav-active' : '')}>
          Services
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
