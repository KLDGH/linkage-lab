import { useState } from 'react'

// Accordion-style section panel. The whole header strip is the toggle —
// click (or Enter/Space) to fold the body away, with an SVG chevron that
// rotates as the indicator. State is in-memory only, so a page refresh
// always returns every section to expanded.
export default function CollapsibleSection({ id, tag, title, badge, defaultCollapsed = false, children }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const toggle = () => setCollapsed((c) => !c)

  return (
    <section id={id} className={`calc-section section-accordion${collapsed ? ' collapsed' : ''}`}>
      <div
        className="section-header acc-header"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`${title} section, ${collapsed ? 'collapsed' : 'expanded'}`}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
      >
        <span className="section-tag">{tag}</span>
        <h2 className="section-title">{title}</h2>
        {badge}
        <span className="acc-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 15 12 9 18 15" />
          </svg>
        </span>
      </div>
      {!collapsed && <div className="acc-body">{children}</div>}
    </section>
  )
}
