import { useEffect, useRef } from 'react'
import { NavLink, Link, useParams, Navigate } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import BumpVelocity from '../components/learn/BumpVelocity'
import Packing from '../components/learn/Packing'
import Clickers from '../components/learn/Clickers'
import AxlePath from '../components/learn/AxlePath'
import Valving from '../components/learn/Valving'
import HeatFade from '../components/learn/HeatFade'
import Stiction from '../components/learn/Stiction'
import AntiSquat from '../components/learn/AntiSquat'
import DynamicGeometry from '../components/learn/DynamicGeometry'
import WhatSuspensionDoes from '../components/learn/WhatSuspensionDoes'
import RatePreloadSag from '../components/learn/RatePreloadSag'
import LeverageRatio from '../components/learn/LeverageRatio'
import AirSprings from '../components/learn/AirSprings'
import MeasuringSag from '../components/learn/MeasuringSag'
import SymptomFinder from '../components/learn/SymptomFinder'
import TestingMethod from '../components/learn/TestingMethod'

// Learn follows the order of a suspension course: what suspension is for,
// then springs, damping, friction, geometry, and finally putting it to work
// on the bike. Each chapter holds one or more modules; each module gets a URL
// (/learn/<chapter>/<module>) and a number like 3.1 from its position.
// Chapters with no modules yet are hidden.
const CALC = { to: '/', text: 'Set spring rate before touching damping. No clicker fixes the wrong spring.', cta: 'Find your spring rate' }

const CHAPTERS = [
  {
    id: 'basics',
    title: 'Basics',
    modules: [
      {
        id: 'what-suspension-does',
        title: 'What suspension does',
        short: 'What it does',
        subtitle: 'Why a bike needs both a spring and a damper to keep the tire on the ground.',
        Component: WhatSuspensionDoes,
      },
    ],
  },
  {
    id: 'springs',
    title: 'Springs',
    modules: [
      {
        id: 'rate-preload-sag',
        title: 'Rate, preload and sag',
        short: 'Rate & sag',
        subtitle: 'How rate, preload and sag relate, and why preload doesn\'t change the rate.',
        related: { to: '/', text: 'Work out the rate that puts you at your target sag on your own bike.', cta: 'Find your spring rate' },
        Component: RatePreloadSag,
      },
      {
        id: 'leverage-ratio',
        title: 'Leverage ratio',
        short: 'Leverage',
        subtitle: 'How the frame turns your shock\'s spring into the spring the wheel feels.',
        related: { to: '/#compare', text: 'Compare the measured leverage curves of real bikes side by side.', cta: 'Compare leverage curves' },
        Component: LeverageRatio,
      },
      {
        id: 'air-springs',
        title: 'Air springs',
        short: 'Air',
        subtitle: 'Why air ramps up, and what pressure, spacers and the negative chamber do.',
        Component: AirSprings,
      },
      {
        id: 'measuring-sag',
        title: 'Measuring sag',
        short: 'Measuring sag',
        subtitle: 'How to read sag at the shock, and why one reading isn\'t enough.',
        related: { to: '/', text: 'Put your midpoint reading into the calculator\'s measured-sag check to size the spring from your real load.', cta: 'Check your sag' },
        Component: MeasuringSag,
      },
    ],
  },
  {
    id: 'damping',
    title: 'Damping',
    modules: [
      {
        id: 'bump-velocity',
        title: 'Velocity, not position',
        short: 'Velocity',
        subtitle: 'Why a damper responds to how fast the suspension moves.',
        Component: BumpVelocity,
      },
      {
        id: 'packing',
        title: 'Packing and rebound',
        short: 'Packing',
        subtitle: 'Why rebound matters most over repeated hits, and how to tell when it\'s off.',
        related: { to: '/', text: 'Rebound returns the bike to sag, so the spring has to hold the right sag first.', cta: 'Find your spring rate' },
        Component: Packing,
      },
      {
        id: 'clickers',
        title: 'What your clickers do',
        short: 'Clickers',
        subtitle: 'How each clicker reshapes the damper\'s curve, and which terrain it\'s for.',
        related: CALC,
        Component: Clickers,
      },
      {
        id: 'valving',
        title: 'Firm and plush at once',
        short: 'Valving',
        subtitle: 'Why shim stacks beat plain holes, and what a digressive curve buys you.',
        Component: Valving,
      },
      {
        id: 'heat-fade',
        title: 'Heat and fade',
        short: 'Heat',
        subtitle: 'Where a damper\'s energy goes on a long descent, and what heat does to it.',
        Component: HeatFade,
      },
    ],
  },
  {
    id: 'friction',
    title: 'Friction',
    modules: [
      {
        id: 'stiction',
        title: 'Stiction',
        short: 'Stiction',
        subtitle: 'Why friction matters most on small bumps, and why forks feel it most.',
        related: { to: '/learn/springs/measuring-sag', text: 'Measure your own friction with two sag readings.', cta: 'Measuring sag' },
        Component: Stiction,
      },
    ],
  },
  {
    id: 'geometry',
    title: 'Geometry',
    modules: [
      {
        id: 'axle-path',
        title: 'Axle path and chain growth',
        short: 'Axle path',
        subtitle: 'Why rearward axle paths eat square edges, and what they cost in kickback.',
        related: { to: '/#compare', text: 'See the measured leverage curves of real high-pivot and DW-Link bikes side by side.', cta: 'Compare leverage curves' },
        Component: AxlePath,
      },
      {
        id: 'anti-squat',
        title: 'Anti-squat',
        short: 'Anti-squat',
        subtitle: 'How chain tension holds the suspension up when you pedal, gear by gear.',
        Component: AntiSquat,
      },
      {
        id: 'dynamic-geometry',
        title: 'Sag moves your geometry',
        short: 'Geometry',
        subtitle: 'How sag and braking change your head angle, BB height and trail.',
        Component: DynamicGeometry,
      },
    ],
  },
  {
    id: 'setup',
    title: 'Setup',
    modules: [
      {
        id: 'symptoms',
        title: 'Symptom finder',
        short: 'Symptoms',
        subtitle: 'What the bike is doing, the likely causes, and what to check first.',
        related: CALC,
        Component: SymptomFinder,
      },
      {
        id: 'testing',
        title: 'Testing method',
        short: 'Testing',
        subtitle: 'How to test a change so you can trust the result, with a log to keep.',
        Component: TestingMethod,
      },
    ],
  },
]

const VISIBLE = CHAPTERS.filter((c) => c.modules.length).map((c, ci) => ({ ...c, num: ci + 1 }))
const ALL = VISIBLE.flatMap((c) => c.modules.map((m, i) => ({ ...m, chapter: c, num: `${c.num}.${i + 1}` })))
const pathOf = (m) => `/learn/${m.chapter.id}/${m.id}`

export default function LearnPage() {
  const { chapterId, moduleId } = useParams()
  const chapter = VISIBLE.find((c) => c.id === chapterId)
  const active = chapter ? ALL.find((m) => m.chapter.id === chapter.id && m.id === moduleId) : null
  const tabsRef = useRef(null)
  useDocumentTitle(active ? active.title : 'Learn')

  // Switching modules starts you at the top of the new one, not wherever the
  // previous module's scroll position happened to be.
  useEffect(() => { window.scrollTo(0, 0) }, [moduleId])

  // On narrow screens the chapter strip scrolls horizontally, so a later
  // chapter can sit off-screen. Keep the active one visible.
  useEffect(() => {
    const strip = tabsRef.current
    const tab = strip?.querySelector('.learn-tab-active')
    if (!strip || !tab) return
    const left = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [chapterId])

  if (!active) {
    // Old flat links (/learn/packing) and bare chapter links land on a module.
    const legacy = ALL.find((m) => m.id === chapterId)
    const target = legacy || (chapter ? ALL.find((m) => m.chapter.id === chapter.id) : ALL[0])
    return <Navigate to={pathOf(target)} replace />
  }

  const C = active.Component
  const idx = ALL.indexOf(active)
  const prev = ALL[idx - 1]
  const next = ALL[idx + 1]

  return (
    <div className="page">
      <h1 className="visually-hidden">Learn</h1>

      <nav className="learn-tabs" aria-label="Learn chapters" ref={tabsRef}>
        {VISIBLE.map((c) => (
          <NavLink
            key={c.id}
            to={pathOf(ALL.find((m) => m.chapter.id === c.id))}
            className={'learn-tab' + (c.id === chapter.id ? ' learn-tab-active' : '')}
          >
            <span className="learn-tab-num">{c.num}</span>
            <span className="learn-tab-label">{c.title}</span>
          </NavLink>
        ))}
      </nav>

      {chapter.modules.length > 1 && (
        <nav className="learn-subtabs" aria-label={`${chapter.title} modules`}>
          {ALL.filter((m) => m.chapter.id === chapter.id).map((m) => (
            <NavLink key={m.id} to={pathOf(m)}
              className={'learn-subtab' + (m.id === active.id ? ' learn-subtab-active' : '')}>
              {m.short}
            </NavLink>
          ))}
        </nav>
      )}

      <article className="learn-module">
        <div className="learn-module-head">
          <span className="learn-module-num">{active.num}</span>
          <h2 className="learn-module-title">{active.title}</h2>
        </div>
        <p className="learn-subtitle">{active.subtitle}</p>
        <C />
      </article>

      {active.related && (
        <Link to={active.related.to} className="learn-related">
          <span className="learn-related-text">{active.related.text}</span>
          <span className="learn-related-cta">{active.related.cta} →</span>
        </Link>
      )}

      <nav className="learn-pager" aria-label="Module navigation">
        {prev ? (
          <NavLink to={pathOf(prev)} className="learn-pager-link">
            <span className="learn-pager-dir">← Previous</span>
            <span className="learn-pager-title">{prev.num} · {prev.title}</span>
          </NavLink>
        ) : <span />}
        {next && (
          <NavLink to={pathOf(next)} className="learn-pager-link learn-pager-next">
            <span className="learn-pager-dir">Next →</span>
            <span className="learn-pager-title">{next.num} · {next.title}</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}
