import { useEffect, useRef } from 'react'
import { NavLink, useParams, Navigate } from 'react-router-dom'
import BumpVelocity from '../components/learn/BumpVelocity'
import Packing from '../components/learn/Packing'
import Clickers from '../components/learn/Clickers'
import AxlePath from '../components/learn/AxlePath'

// Each entry is one explainer. Add new modules here — they render in order,
// numbered, so later concepts can build on earlier ones. Each gets its own
// URL (/learn/<id>) so a specific module can be linked to directly.
const MODULES = [
  {
    id: 'bump-velocity',
    num: '01',
    title: 'Velocity, not position',
    short: 'Velocity',
    subtitle: 'Why a damper responds to how fast the suspension moves — not where it sits in the travel.',
    Component: BumpVelocity,
  },
  {
    id: 'packing',
    num: '02',
    title: 'Packing and rebound',
    short: 'Packing',
    subtitle: 'Why rebound damping matters most across repeated hits — and how to tell when it\'s wrong.',
    Component: Packing,
  },
  {
    id: 'clickers',
    num: '03',
    title: 'What your clickers do',
    short: 'Clickers',
    subtitle: 'How low- and high-speed compression and rebound each reshape one curve — and which terrain each one is for.',
    Component: Clickers,
  },
  {
    id: 'axle-path',
    num: '04',
    title: 'Axle path and chain growth',
    short: 'Axle path',
    subtitle: 'Where the rear wheel travels, why rearward paths eat square edges, and what that costs in pedal kickback.',
    Component: AxlePath,
  },
]

export default function LearnPage() {
  const { moduleId } = useParams()
  const active = MODULES.find((m) => m.id === moduleId)
  const tabsRef = useRef(null)

  // Switching modules starts you at the top of the new one, not wherever the
  // previous module's scroll position happened to be.
  useEffect(() => { window.scrollTo(0, 0) }, [moduleId])

  // On narrow screens the tab strip scrolls horizontally, so a later module can
  // sit off-screen. Keep the active tab visible without moving the page itself.
  useEffect(() => {
    const strip = tabsRef.current
    const tab = strip?.querySelector('.learn-tab-active')
    if (!strip || !tab) return
    const left = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [moduleId])

  // Bare /learn opens the first module; an unknown id falls back to it too.
  if (!active) return <Navigate to={`/learn/${MODULES[0].id}`} replace />

  const C = active.Component
  const idx = MODULES.findIndex((m) => m.id === active.id)
  const prev = MODULES[idx - 1]
  const next = MODULES[idx + 1]

  return (
    <div className="page">
      <h1 className="learn-eyebrow">Learn</h1>

      <nav className="learn-tabs" aria-label="Learn modules" ref={tabsRef}>
        {MODULES.map((m) => (
          <NavLink
            key={m.id}
            to={`/learn/${m.id}`}
            className={({ isActive }) => 'learn-tab' + (isActive ? ' learn-tab-active' : '')}
          >
            <span className="learn-tab-num">{m.num}</span>
            <span className="learn-tab-label">{m.short}</span>
          </NavLink>
        ))}
      </nav>

      <article className="learn-module">
        <div className="learn-module-head">
          <span className="learn-module-num">{active.num}</span>
          <h2 className="learn-module-title">{active.title}</h2>
        </div>
        <p className="learn-subtitle">{active.subtitle}</p>
        <C />
      </article>

      <nav className="learn-pager" aria-label="Module navigation">
        {prev ? (
          <NavLink to={`/learn/${prev.id}`} className="learn-pager-link">
            <span className="learn-pager-dir">← Previous</span>
            <span className="learn-pager-title">{prev.num} · {prev.title}</span>
          </NavLink>
        ) : <span />}
        {next && (
          <NavLink to={`/learn/${next.id}`} className="learn-pager-link learn-pager-next">
            <span className="learn-pager-dir">Next →</span>
            <span className="learn-pager-title">{next.num} · {next.title}</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}
