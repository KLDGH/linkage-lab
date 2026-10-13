import { useState, useMemo, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  leverageRatio, nmmToLbin, lbinToNmm, G,
  lrAtTravelFrac, effectiveStroke, resolveSag, computeForceCurve, sagForRate, lrAtShockMm,
} from '../lib/springMath'
import { LINKAGE_PRESETS, getLrAtTravel, averageLr } from '../lib/linkagePresets'
import { BIKE_PRESETS } from '../lib/bikePresets'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

const DEFAULTS = {
  riderWeightKg: 83.9,
  wheelTravel: 150,
  shockStroke: 55,
  rearPct: 65,
}

const SAG_MIN = 18
const SAG_MAX = 40

const SAG_ZONES = [
  { id: 'xc',     label: 'XC',     min: 18, max: 24, color: '#8b5cf6' },
  { id: 'trail',  label: 'Trail',  min: 23, max: 29, color: '#3b82f6' },
  { id: 'enduro', label: 'Enduro', min: 27, max: 34, color: '#00c97a' },
  { id: 'dh',     label: 'DH',     min: 32, max: 40, color: '#f0b429' },
]

const BIAS_MIN = 45
const BIAS_MAX = 80

const BIAS_ZONES = [
  { id: 'xc',     label: 'XC',     min: 45, max: 58, color: '#8b5cf6' },
  { id: 'trail',  label: 'Trail',  min: 58, max: 65, color: '#3b82f6' },
  { id: 'enduro', label: 'Enduro', min: 65, max: 71, color: '#00c97a' },
  { id: 'dh',     label: 'DH',     min: 71, max: 80, color: '#f0b429' },
]

const CHART_PRESET_IDS = ['dwlink', 'horst', 'vpp', 'highpivot']

// Color for the active measured-bike / custom curve in charts and notes
const BIKE_COLOR = '#8b5cf6'

// Rider-facing suspension types. Each maps to an archetype whose curve comes
// from the measured bike named in `source`. The size of the correction is
// computed live at the rider's own sag and appended to the tooltip, so no
// percentage is written down here to drift away from the math.
const SUSPENSION_TYPES = [
  {
    presetId: 'horst',
    label: 'Horst',
    examples: 'Specialized FSR, Transition',
    shape: 'Falling curve: high leverage early, steadily lower toward bottom-out. The most common layout.',
  },
  {
    presetId: 'vpp',
    label: 'VPP',
    examples: 'Santa Cruz, Intense',
    shape: 'Modern VPP falls steadily through the travel, not the U-shaped curve older VPP bikes had.',
  },
  {
    presetId: 'dwlink',
    label: 'DW-Link',
    examples: 'Ibis, Pivot, Giant (Maestro)',
    shape: 'Falls fastest in the first third of the travel, then flattens out.',
  },
  {
    presetId: 'highpivot',
    label: 'High Pivot',
    examples: 'Forbidden, Norco Optic, Deviate',
    shape: 'Idler pulley and rearward axle path. Falls gradually, then steepens toward bottom-out.',
  },
]

const fmtPct = (mod) => `${mod >= 1 ? '+' : ''}${((mod - 1) * 100).toFixed(1)}%`

function getBiasZone(pct) {
  if (pct < 58) return BIAS_ZONES[0]
  if (pct < 65) return BIAS_ZONES[1]
  if (pct < 71) return BIAS_ZONES[2]
  return BIAS_ZONES[3]
}

function getSagZone(pct) {
  const p = pct * 100
  if (p < 24) return SAG_ZONES[0]
  if (p < 28) return SAG_ZONES[1]
  if (p < 33) return SAG_ZONES[2]
  return SAG_ZONES[3]
}

// Portal-rendered tooltip: mounts as a direct child of <body> with
// position:fixed, so no ancestor's overflow or stacking context can trap it.
// Placement is a first guess from the trigger's position, corrected once the
// portal has rendered and its real height is known (long tooltips near the
// top of the page flip below instead of running off the top edge).
//
// Mouse users get it on hover everywhere. `interactive` hosts (the ⓘ icons,
// which carry the actual explanations) also open on tap and from the
// keyboard; tooltips wrapped around buttons stay hover-only so tapping the
// button doesn't also pop a tooltip.
function Tip({ text, children, width = 220, interactive = false }) {
  const ref = useRef(null)
  const portalRef = useRef(null)
  const flippedRef = useRef(false)
  const pointerRef = useRef('mouse')
  const tipId = useId()
  const [pos, setPos] = useState(null) // { left, top, bottom, placement, w } or null = hidden

  const place = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 10
    const w = Math.min(width, window.innerWidth - margin * 2)
    let left = r.left + r.width / 2
    left = Math.min(Math.max(left, w / 2 + margin), window.innerWidth - w / 2 - margin)
    flippedRef.current = false
    const placement = r.top > 150 ? 'above' : 'below'
    setPos({ left, top: r.top, bottom: r.bottom, placement, w })
  }
  const hide = () => setPos(null)
  const toggle = () => (pos ? hide() : place())

  useEffect(() => {
    if (!pos || !portalRef.current || flippedRef.current) return
    const pr = portalRef.current.getBoundingClientRect()
    if (pos.placement === 'above' && pr.top < 10) {
      flippedRef.current = true
      setPos((p) => (p ? { ...p, placement: 'below' } : p))
    }
  }, [pos])

  // While open: Escape closes, and so does a tap or click anywhere else.
  useEffect(() => {
    if (!pos) return
    const onKey = (e) => { if (e.key === 'Escape') hide() }
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || portalRef.current?.contains(e.target)) return
      hide()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [pos])

  const hostProps = {
    onPointerDown: (e) => { pointerRef.current = e.pointerType },
    onPointerEnter: (e) => { if (e.pointerType === 'mouse') place() },
    onPointerLeave: (e) => { if (e.pointerType === 'mouse') hide() },
  }
  if (interactive) {
    Object.assign(hostProps, {
      tabIndex: 0,
      role: 'button',
      'aria-label': 'More info',
      'aria-expanded': !!pos,
      'aria-describedby': pos ? tipId : undefined,
      // Taps toggle; mouse clicks are left alone since hover already shows it.
      onClick: (e) => { if (pointerRef.current !== 'mouse') { e.preventDefault(); e.stopPropagation(); toggle() } },
      // Only keyboard focus opens it; focus from a tap is handled by onClick.
      onFocus: (e) => { if (e.target.matches(':focus-visible')) place() },
      onBlur: hide,
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } },
    })
  }

  return (
    <span ref={ref} className={`tip-host${interactive ? ' tip-interactive' : ''}`} {...hostProps}>
      {children}
      {pos && createPortal(
        <div
          ref={portalRef}
          id={tipId}
          role="tooltip"
          className="tip-portal"
          style={{
            left: pos.left, width: pos.w,
            top: pos.placement === 'above' ? pos.top - 10 : pos.bottom + 10,
            transform: pos.placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}

function InfoIcon({ text, width }) {
  return <Tip text={text} width={width} interactive><span className="info-icon" aria-hidden="true">ⓘ</span></Tip>
}

// Rotating caret used by the fold-out blocks (preload, measured sag).
function Chevron({ open }) {
  return (
    <span className={`fold-chevron${open ? ' fold-chevron-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 15 12 9 18 15" />
      </svg>
    </span>
  )
}

function InputField({ label, value, onChange, unit, min, max, step, tip, dim }) {
  const [local, setLocal] = useState(String(value))

  // Sync when parent changes externally (e.g. unit toggle kg↔lbs)
  useEffect(() => { setLocal(String(value)) }, [value])

  return (
    <div className="input-group" style={dim ? { opacity: 0.5 } : undefined}>
      <label className="input-label">
        {label}
        {tip && <InfoIcon text={tip} />}
      </label>
      <div className="input-row">
        <input
          type="number" className="calc-input"
          value={local} min={min} max={max} step={step}
          onChange={(e) => {
            const raw = e.target.value
            setLocal(raw)
            const num = parseFloat(raw)
            if (!isNaN(num)) onChange(num)
          }}
          onBlur={() => {
            if (isNaN(parseFloat(local))) setLocal(String(value))
          }}
        />
        <span className="input-unit">{unit}</span>
      </div>
    </div>
  )
}

// Read state from URL search params (falls back to nulls when missing/invalid)
function parseUrlState() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  if (![...p.keys()].length) return {}
  const num = (k) => { const v = parseFloat(p.get(k)); return isNaN(v) ? null : v }
  const w = num('w'), t = num('t'), s = num('s'), b = num('b'), sag = num('sag'), prog = num('prog'), pl = num('pl')
  const link = p.get('link')
  const mode = p.get('mode')
  const u = p.get('u')
  const curveRaw = p.get('curve')
  let curve = null
  if (curveRaw) {
    const parts = curveRaw.split(',').map(Number)
    if (parts.length === 3 && parts.every((n) => n > 0)) {
      curve = { start: String(parts[0]), mid: String(parts[1]), end: String(parts[2]) }
    }
  }
  return {
    vals: (w !== null || t !== null || s !== null || b !== null) ? {
      riderWeightKg: w !== null ? w : DEFAULTS.riderWeightKg,
      wheelTravel: t !== null ? t : DEFAULTS.wheelTravel,
      shockStroke: s !== null ? s : DEFAULTS.shockStroke,
      rearPct: b !== null ? b : DEFAULTS.rearPct,
    } : null,
    sagPct: sag !== null ? sag / 100 : null,
    sagMode: mode === 'wheel' || mode === 'shock' ? mode : null,
    linkageId: link && LINKAGE_PRESETS.some(pr => pr.id === link) ? link : null,
    customProg: prog !== null ? prog : null,
    curve,
    bikeId: BIKE_PRESETS.some(bk => bk.id === p.get('bike')) ? p.get('bike') : null,
    preloadMm: pl,
    weightLbs: u === 'lb' ? true : u === 'kg' ? false : null,
  }
}

// Serialize current state to a URL search string
function stateToQuery({ vals, sagPct, sagMode, linkageId, customProg, customPreset, bikeId, preloadMm, weightLbs }) {
  const p = new URLSearchParams()
  p.set('w', vals.riderWeightKg.toFixed(1))
  p.set('t', String(vals.wheelTravel))
  p.set('s', String(vals.shockStroke))
  p.set('b', String(vals.rearPct))
  p.set('sag', String(Math.round(sagPct * 100)))
  p.set('mode', sagMode)
  if (linkageId) p.set('link', linkageId)
  if (customProg !== null) p.set('prog', String(customProg))
  if (customPreset && !bikeId) p.set('curve', customPreset.points.map((pt) => pt.lr).join(','))
  if (bikeId) p.set('bike', bikeId)
  if (preloadMm) p.set('pl', String(preloadMm))
  p.set('u', weightLbs ? 'lb' : 'kg')
  return p.toString()
}

export default function SpringCalculator({ requestedBike = null }) {
  const initial = useMemo(() => parseUrlState(), [])
  const [vals, setVals] = useState(initial.vals ?? DEFAULTS)
  const [sagPct, setSagPct] = useState(initial.sagPct ?? 0.30) // raw slider value (interpreted via sagMode)
  const [sagMode, setSagMode] = useState(initial.sagMode ?? 'shock') // 'shock' | 'wheel'
  const [linkageId, setLinkageId] = useState(initial.linkageId ?? null)
  const [weightLbs, setWeightLbs] = useState(initial.weightLbs ?? true)
  const [customProg, setCustomProg] = useState(initial.customProg ?? null) // null = follow preset
  const [curveInput, setCurveInput] = useState(initial.curve ?? { start: '', mid: '', end: '' })
  const [bikeId, setBikeId] = useState(initial.bikeId ?? null) // measured bike preset
  const [preloadMm, setPreloadMm] = useState(initial.preloadMm ?? 0) // optional preload fine-tune
  const [preloadOpen, setPreloadOpen] = useState(!!initial.preloadMm) // collapsed unless a shared link sets preload
  const [shareStatus, setShareStatus] = useState('idle') // idle | copied
  // "Check your measured sag": the rider's current spring and o-ring reading
  const [checkOpen, setCheckOpen] = useState(false)
  const [checkSpring, setCheckSpring] = useState('')
  const [checkSagMm, setCheckSagMm] = useState('')
  const [checkPreload, setCheckPreload] = useState('')

  // A user-entered 3-point leverage curve becomes a preset with points at
  // 0/50/100% travel. Only the shape (ratio through the curve) is used, so the
  // absolute LR values can be read straight off a published graph.
  const customPreset = useMemo(() => {
    const s = parseFloat(curveInput.start), m = parseFloat(curveInput.mid), e = parseFloat(curveInput.end)
    if (s > 0 && m > 0 && e > 0) {
      return { id: 'custom', absolute: true, points: [{ t: 0, lr: s }, { t: 0.5, lr: m }, { t: 1, lr: e }] }
    }
    return null
  }, [curveInput])

  // Measured bike: its curve overrides everything else, exactly like a
  // custom curve but sourced from bikePresets.js.
  const activeBike = BIKE_PRESETS.find((bk) => bk.id === bikeId) || null
  const overridePreset = activeBike ? { id: 'bike', points: activeBike.points } : customPreset

  const clearCurve = () => setCurveInput({ start: '', mid: '', end: '' })
  const setCurveField = (field) => (raw) => {
    setCurveInput((prev) => ({ ...prev, [field]: raw }))
    if (raw !== '') { setLinkageId(null); setCustomProg(null); setBikeId(null) }
  }

  // Selecting a bike loads its measured curve and fills travel/stroke from
  // its spec; selecting the empty option returns to the geometric baseline.
  const selectBike = (id) => {
    const bike = BIKE_PRESETS.find((bk) => bk.id === id)
    setBikeId(bike ? bike.id : null)
    if (bike) {
      setVals((prev) => ({ ...prev, wheelTravel: bike.travel, shockStroke: bike.stroke }))
      setLinkageId(null)
      setCustomProg(null)
      clearCurve()
    }
  }

  // The bike comparison below can hand a bike to the calculator. The request
  // carries a counter so picking the same bike twice still re-applies it.
  useEffect(() => {
    if (requestedBike?.id) selectBike(requestedBike.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedBike])

  const set = (k) => (v) => setVals((p) => ({ ...p, [k]: v }))
  const displayWeight = (kg) => weightLbs ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10
  const toKg = (v) => weightLbs ? v / 2.20462 : v
  const wUnit = weightLbs ? 'lbs' : 'kg'

  // Sync state → URL (debounced so dragging sliders doesn't spam history)
  useEffect(() => {
    const id = setTimeout(() => {
      const query = stateToQuery({ vals, sagPct, sagMode, linkageId, customProg, customPreset, bikeId, preloadMm, weightLbs })
      window.history.replaceState(null, '', `${window.location.pathname}?${query}`)
    }, 200)
    return () => clearTimeout(id)
  }, [vals, sagPct, sagMode, linkageId, customProg, customPreset, bikeId, preloadMm, weightLbs])

  // Copy current URL to clipboard with brief "copied" feedback
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 1800)
    } catch {
      // Fallback for old browsers: select-all-and-copy via temporary input
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 1800)
    }
  }

  const selectedPreset = LINKAGE_PRESETS.find((p) => p.id === linkageId)

  // Switching modes converts the slider value so the physical sag is preserved
  const switchSagMode = (newMode) => {
    if (newMode === sagMode) return
    const preset = overridePreset || LINKAGE_PRESETS.find((p) => p.id === linkageId)
    const effProg = overridePreset ? null : customProg
    const effStroke = effectiveStroke(overridePreset, vals.wheelTravel, vals.shockStroke)
    const geoLR = leverageRatio(vals.wheelTravel, effStroke)
    const current = resolveSag(sagPct, sagMode, preset, effProg, geoLR, vals.wheelTravel, effStroke)
    const newVal = newMode === 'wheel' ? current.wheelSagPct : current.shockSagPct
    setSagMode(newMode)
    setSagPct(Math.max(SAG_MIN / 100, Math.min(SAG_MAX / 100, newVal)))
  }

  const calc = useMemo(() => {
    const riderKg = vals.riderWeightKg
    const rearFrac = vals.rearPct / 100
    const preset = overridePreset || LINKAGE_PRESETS.find((p) => p.id === linkageId)
    const effProg = overridePreset ? null : customProg
    // A 3-point custom curve is honored at absolute magnitude and derives its own
    // stroke; every other mode uses the typed stroke unchanged.
    const effStroke = effectiveStroke(overridePreset, vals.wheelTravel, vals.shockStroke)
    const usesAbsCurve = !!(overridePreset && overridePreset.absolute)
    const geoLR = leverageRatio(vals.wheelTravel, effStroke)

    // Resolve user's sag input into both shock and wheel representations
    const userSag = resolveSag(sagPct, sagMode, preset, effProg, geoLR, vals.wheelTravel, effStroke)

    // LR at sag evaluated at wheel position (correct physics)
    const lrAtSag = lrAtTravelFrac(userSag.wheelSagPct, preset, effProg, geoLR)
    const linkageMod = geoLR ? lrAtSag / geoLR : 1.0
    const effectiveLR = lrAtSag

    // Spring rate: k = F_wheel × LR_at_sag / shock_disp_at_sag
    const nmm = (geoLR && userSag.shockSagMm)
      ? (riderKg * G * rearFrac * lrAtSag) / userSag.shockSagMm
      : null
    const lbin = nmm ? nmmToLbin(nmm) : null
    const rearForceN = riderKg * G * rearFrac

    // Nearby stock springs and the sag each one actually lands at. Solved
    // exactly (the leverage ratio moves with sag), so this is the number you'd
    // read off the o-ring, not a ratio estimate.
    const solveSag = (kNmm, preloadMm = 0) =>
      sagForRate(kNmm, rearForceN, preset, effProg, geoLR, vals.wheelTravel, effStroke, preloadMm)
    const toModePct = (shockMm) => {
      if (shockMm == null) return null
      if (sagMode === 'shock') return shockMm / effStroke
      return resolveSag(shockMm / effStroke, 'shock', preset, effProg, geoLR, vals.wheelTravel, effStroke).wheelSagPct
    }
    let springOptions = []
    if (lbin) {
      const base = Math.round(lbin / 25) * 25
      springOptions = [-50, -25, 0, 25, 50]
        .map((d) => base + d)
        .filter((r) => r > 0)
        .map((rate) => ({ rate, sagPct: toModePct(solveSag(lbinToNmm(rate))), nearest: rate === base }))
    }

    // Preload as an optional fine-tune layer. The headline rate is the
    // zero-preload rate that hits target sag. Preload only shifts the force
    // curve (ride height), it does not change rate. The wind needed to put a
    // stock spring exactly on target is exact: at the target position LR is
    // known, so k·(d + p) = F·LR(d) gives p = d·(k_exact/k − 1).
    let preload = null
    if (lbin && nmm && userSag.shockSagMm) {
      const nearestLbin = Math.round(lbin / 25) * 25
      const kStockNmm = lbinToNmm(nearestLbin)
      const dTarget = userSag.shockSagMm
      const dStock0 = solveSag(kStockNmm)
      const stockSagPct = toModePct(dStock0)
      const toTargetMm = dTarget * (nmm / kStockNmm - 1) // >0 → wind preload in; <0 → top-out gap
      preload = { nearestLbin, kStockNmm, dTarget, dStock0, stockSagPct, toTargetMm, solveSag, toModePct }
    }

    const chartPresets = LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id))
    // For each comparison curve, resolve sag using that preset's own LR curve
    const neutralSag = resolveSag(sagPct, sagMode, null, null, geoLR, vals.wheelTravel, effStroke)
    const neutralPts = computeForceCurve(null, null, geoLR, vals.wheelTravel, effStroke, neutralSag.wheelSagPct, riderKg, rearFrac)
    // Each type's correction at the rider's own sag, computed rather than
    // quoted, so tooltips and the explainer can never disagree with the math.
    const typeMods = {}
    const presetPts = chartPresets.map(p => {
      const pSag = resolveSag(sagPct, sagMode, p, null, geoLR, vals.wheelTravel, effStroke)
      typeMods[p.id] = geoLR ? lrAtTravelFrac(pSag.wheelSagPct, p, null, geoLR) / geoLR : 1
      return computeForceCurve(p, null, geoLR, vals.wheelTravel, effStroke, pSag.wheelSagPct, riderKg, rearFrac)
    })
    // Active override curve (measured bike or 3-point custom) gets its own series
    const overridePts = overridePreset
      ? computeForceCurve(overridePreset, null, geoLR, vals.wheelTravel, effStroke, userSag.wheelSagPct, riderKg, rearFrac)
      : null

    const curveData = Array.from({ length: 21 }, (_, i) => {
      const t = i / 20
      const obj = {
        sagMm: Math.round(vals.wheelTravel * t),
        targetLine: Math.round(rearForceN),
        force_neutral: neutralPts[i],
        lr_neutral: geoLR ? parseFloat(geoLR.toFixed(3)) : null,
      }
      chartPresets.forEach((p, j) => {
        obj[`force_${p.id}`] = presetPts[j][i]
        obj[`lr_${p.id}`] = geoLR
          ? parseFloat((geoLR * getLrAtTravel(p, t) / averageLr(p)).toFixed(3))
          : null
      })
      if (overridePreset) {
        obj.force_active = overridePts[i]
        // Route through lrAtTravelFrac so an absolute custom curve is plotted at the
        // values entered (matching the rate calc), not the old rescaled shape.
        const lrActive = lrAtTravelFrac(t, overridePreset, null, geoLR)
        obj.lr_active = lrActive != null ? parseFloat(lrActive.toFixed(3)) : null
      }
      return obj
    })

    const maxForce = Math.max(rearForceN, ...neutralPts, ...presetPts.flat())
    const yDomain = [0, Math.ceil(maxForce * 1.1 / 200) * 200]

    // Clamped domain — keeps the sag crossing point prominent
    const yDomainClamped = [
      Math.max(0, Math.floor(rearForceN * 0.55 / 100) * 100),
      Math.ceil(rearForceN * 1.55 / 100) * 100,
    ]

    // LR curve domain
    const allLRs = curveData.flatMap(d =>
      [d.lr_neutral, d.lr_active, ...chartPresets.map(p => d[`lr_${p.id}`])].filter(Boolean)
    )
    const lrDomain = [
      parseFloat((Math.min(...allLRs) * 0.96).toFixed(2)),
      parseFloat((Math.max(...allLRs) * 1.04).toFixed(2)),
    ]

    return { riderKg, geoLR, effectiveLR, linkageMod, rearForceN, nmm, lbin, curveData, yDomain, yDomainClamped, lrDomain, userSag, effStroke, usesAbsCurve, preload, springOptions, typeMods, preset, effProg, lrAtSag }
  }, [vals, sagPct, sagMode, linkageId, customProg, overridePreset])

  // Zone is always classified against shock sag conventions (XC/Trail/Enduro/DH)
  const zone = getSagZone(calc.userSag.shockSagPct)
  const biasZone = getBiasZone(vals.rearPct)
  const activePreset = LINKAGE_PRESETS.find((p) => p.id === linkageId)

  // ── Check your measured sag ──
  // Works backwards from an o-ring reading. The spring force at that sag,
  // divided by the leverage ratio there, is the load actually on the rear
  // wheel, which replaces the rear-weight-bias guess with a measurement.
  // From that load we size the spring for the rider's target sag.
  const check = useMemo(() => {
    const rate = parseFloat(checkSpring), d = parseFloat(checkSagMm)
    const p = parseFloat(checkPreload) || 0
    if (!(rate > 0) || !(d > 0) || !calc.geoLR || !calc.effStroke || !calc.userSag.shockSagMm) return null
    if (d >= calc.effStroke) return { error: `That's past the full ${calc.effStroke.toFixed(1)} mm of shock stroke.` }
    const { lr } = lrAtShockMm(d, calc.preset, calc.effProg, calc.geoLR, vals.wheelTravel, calc.effStroke)
    const wheelForceN = (lbinToNmm(rate) * (d + p)) / lr
    const bias = wheelForceN / G / vals.riderWeightKg
    const recLbin = nmmToLbin((wheelForceN * calc.lrAtSag) / calc.userSag.shockSagMm)
    return {
      rate, measuredPct: d / calc.effStroke, wheelForceN, bias, recLbin,
      recStock: Math.round(recLbin / 25) * 25,
      plausible: bias >= 0.5 && bias <= 0.82,
    }
  }, [checkSpring, checkSagMm, checkPreload, calc, vals.wheelTravel, vals.riderWeightKg])

  // ── Mobile result bar ──
  // On a phone the inputs stack above the result, so while you're adjusting
  // inputs the answer is off-screen. A fixed bar shows it until the real
  // result scrolls into view.
  const rateRef = useRef(null)
  const inputsRef = useRef(null)
  const [rateVisible, setRateVisible] = useState(true)
  const [inputsVisible, setInputsVisible] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === rateRef.current) setRateVisible(e.isIntersecting)
        else if (e.target === inputsRef.current) setInputsVisible(e.isIntersecting)
      })
    })
    if (rateRef.current) io.observe(rateRef.current)
    if (inputsRef.current) io.observe(inputsRef.current)
    return () => io.disconnect()
  }, [])
  const showBar = inputsVisible && !rateVisible && !!calc.lbin

  const nearestStock = calc.lbin ? Math.round(calc.lbin / 25) * 25 : null
  const sagLabel = `${sagMode} sag`
  const targetPct = Math.round(sagPct * 100)
  const pct0 = (x) => Math.round(x * 100)
  const pct1 = (x) => (x * 100).toFixed(1)
  const hasCurve = !!(linkageId || customProg !== null || overridePreset)
  const curveColor = activeBike ? BIKE_COLOR : activePreset?.color || zone.color
  const typeLabel = (id) => SUSPENSION_TYPES.find((t) => t.presetId === id)?.label
  const bikeProg = (bk) => Math.round(((bk.points[0].lr - bk.points.at(-1).lr) / bk.points[0].lr) * 100)
  const weightOut = (kg) => (weightLbs ? `${Math.round(kg * 2.20462)} lb` : `${Math.round(kg)} kg`)

  const typeTip = (type, p) => {
    const b = p.bike
    const n = ((calc.typeMods[p.id] ?? 1) - 1) * 100
    const mag = Math.abs(n).toFixed(1)
    return `${type.examples}\n\n${type.shape} Shape from the measured ${b.name} (${b.points[0].lr.toFixed(2)} → ${b.points.at(-1).lr.toFixed(2)}, ${p.prog}% progression).\n\nAt your current sag the leverage ratio is ${mag}% ${n >= 0 ? 'above' : 'below'} its average, so the spring needs about ${mag}% ${n >= 0 ? 'more' : 'less'} than travel ÷ stroke suggests.`
  }

  return (
    <>
      <div className="calc-grid">

        {/* ── Inputs ── */}
        <div className="calc-inputs card" ref={inputsRef}>
          <div className="card-title">Inputs</div>

          {/* ── Bike: a measured curve is the fastest route to a right answer ── */}
          <div className="input-group-header">
            <span>
              Bike
              <InfoIcon width={290} text={"Measured leverage curves for specific bikes, from published Avalanche, Linkage Design and Blister data. Picking one loads its curve and fills in travel and stroke.\n\nNot listed? Pick its suspension type below, or enter three points off its leverage graph under Refine."} />
            </span>
          </div>
          <select
            className={`bike-select bike-select-full ${activeBike ? 'bike-select-active' : ''}`}
            value={bikeId ?? ''}
            onChange={(e) => selectBike(e.target.value)}
            aria-label="Bike"
          >
            <option value="">Choose your bike…</option>
            {BIKE_PRESETS.map((bk) => (
              <option key={bk.id} value={bk.id}>{bk.name} ({bk.year})</option>
            ))}
          </select>
          <div className="bike-note">
            {activeBike
              ? <>Measured curve loaded: {bikeProg(activeBike)}% progression.</>
              : <>{BIKE_PRESETS.length} measured bikes so far. Not listed? Pick its type below, or{' '}
                  <a className="bike-request" href="mailto:hello@solitairedynamics.com?subject=Bike%20request%20for%20the%20spring%20calculator">request it</a>.</>}
          </div>

          {!activeBike && (
            <>
              <div className="input-label sub-label">
                Suspension type
                <InfoIcon width={300} text={`"Geometric" uses raw travel ÷ stroke with no linkage correction, the same assumption Fox and MRP calculators make. Picking a type corrects for where the leverage ratio sits at your sag point compared with its average.`} />
              </div>
              <div className="linkage-tabs">
                <Tip text="Raw travel ÷ stroke, no linkage correction. The same assumption Fox and MRP calculators make. Use it if you don't know your bike's layout." width={280}>
                  <button
                    type="button"
                    className={`linkage-tab ${!hasCurve ? 'linkage-tab-active' : ''}`}
                    onClick={() => { setLinkageId(null); setCustomProg(null); clearCurve(); setBikeId(null) }}
                  >
                    <span className="lt-dot" style={{ background: 'var(--text-dim)' }} />
                    <span className="lt-name">Geometric</span>
                  </button>
                </Tip>
                {SUSPENSION_TYPES.map((type) => {
                  const p = LINKAGE_PRESETS.find((pr) => pr.id === type.presetId)
                  if (!p) return null
                  const active = linkageId === p.id
                  return (
                    <Tip key={p.id} text={typeTip(type, p)} width={300}>
                      <button
                        type="button"
                        className={`linkage-tab ${active ? 'linkage-tab-active' : ''}`}
                        style={active ? { borderColor: p.color, boxShadow: `0 0 0 1px ${p.color}` } : {}}
                        onClick={() => { setLinkageId(active ? null : p.id); setCustomProg(null); clearCurve(); setBikeId(null) }}
                      >
                        <span className="lt-dot" style={{ background: p.color }} />
                        <span className="lt-name" style={active ? { color: p.color } : {}}>{type.label}</span>
                      </button>
                    </Tip>
                  )
                })}
              </div>
            </>
          )}

          <InputField
            label="Wheel Travel"
            tip="Total rear wheel travel from full extension to full compression. Found in your bike's spec sheet."
            value={vals.wheelTravel} onChange={set('wheelTravel')} unit="mm" min={50} max={300} step={5}
          />
          <InputField
            label="Shock Stroke"
            tip="How far the shock shaft travels. Usually printed on the shock body (e.g. '55mm'). Not the same as eye-to-eye length."
            value={vals.shockStroke} onChange={set('shockStroke')} unit="mm" min={20} max={120} step={0.5}
            dim={!!customPreset}
          />

          {/* ── Rider ── */}
          <div className="input-group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span>Rider</span>
            <div className="unit-pill">
              <button className={`unit-pill-btn ${!weightLbs ? 'unit-pill-active' : ''}`} onClick={() => setWeightLbs(false)}>kg</button>
              <button className={`unit-pill-btn ${weightLbs ? 'unit-pill-active' : ''}`} onClick={() => setWeightLbs(true)}>lbs</button>
            </div>
          </div>
          <InputField
            label="Rider + Gear"
            tip="Your body weight plus riding gear. Add ~2-3 kg / 5 lbs for helmet, pads, pack, shoes. E-bike riders: bike weight doesn't affect sag-based calculations, but if you want a more conservative estimate you can fold motor/battery weight (~6-8 kg) in here."
            value={displayWeight(vals.riderWeightKg)}
            onChange={(v) => set('riderWeightKg')(toKg(v))}
            unit={wUnit} min={weightLbs ? 66 : 30} max={weightLbs ? 440 : 200} step={weightLbs ? 1 : 0.5}
          />

          {/* ── Tune divider ── */}
          <div className="tune-divider">
            <span>Refine</span>
          </div>

          {/* Sag — compact inline */}
          <div className="input-group-header tune-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Target Sag
              <InfoIcon text={`Sag is how much your suspension compresses under your weight alone. By default measured at the shock o-ring (the universal convention). Toggle to wheel sag if you want to target a specific wheel-travel position — useful for cross-bike comparisons where progression differs.\n\nCoil shocks are typically run at 25-33% shock sag. On a progressive bike that corresponds to a few % more at the wheel.`} width={290} />
            </span>
            <Tip text={`Choose how the slider value is measured:\n\n• Shock — sag as % of shock stroke (the universal convention; what Fox, RockShox, and frame manufacturers reference)\n• Wheel — sag as % of wheel travel (a position-based reference, useful for comparing across bikes with different progression)\n\nOn most bikes the two are within a few % of each other. Switching modes converts the slider value so your physical sag position stays the same.`} width={300}>
              <div className="unit-pill">
                <button className={`unit-pill-btn ${sagMode === 'shock' ? 'unit-pill-active' : ''}`} onClick={() => switchSagMode('shock')}>shock</button>
                <button className={`unit-pill-btn ${sagMode === 'wheel' ? 'unit-pill-active' : ''}`} onClick={() => switchSagMode('wheel')}>wheel</button>
              </div>
            </Tip>
          </div>
          <div className="sag-compact">
            <div className="sag-compact-top">
              <span className="sag-compact-val" style={{ color: zone.color }}>{Math.round(sagPct * 100)}%</span>
              <span className="sag-compact-zone" style={{ color: zone.color }}>{zone.label}</span>
              <span className="sag-compact-mm">
                {Math.round(calc.userSag.shockSagMm)} mm shock ({Math.round(calc.userSag.shockSagPct * 100)}%) · {Math.round(calc.userSag.wheelSagMm)} mm wheel ({Math.round(calc.userSag.wheelSagPct * 100)}%)
              </span>
            </div>
            <div className="sag-track-wrap">
              {SAG_ZONES.map((z) => (
                <div key={z.id} className="sag-seg" style={{
                  left: `${(z.min - SAG_MIN) / (SAG_MAX - SAG_MIN) * 100}%`,
                  width: `${(z.max - z.min) / (SAG_MAX - SAG_MIN) * 100}%`,
                  background: z.color, opacity: zone.id === z.id ? 0.4 : 0.13,
                }} />
              ))}
            </div>
            <input
              type="range" min={SAG_MIN} max={SAG_MAX} step={1}
              value={Math.round(sagPct * 100)}
              onChange={(e) => setSagPct(parseInt(e.target.value) / 100)}
              className="sag-slider" style={{ '--sag-color': zone.color }}
            />
            <div className="sag-zone-labels">
              {SAG_ZONES.map((z) => (
                <span key={z.id} style={{
                  left: `${(z.min - SAG_MIN) / (SAG_MAX - SAG_MIN) * 100}%`,
                  color: zone.id === z.id ? z.color : 'var(--text-dim)',
                  fontWeight: zone.id === z.id ? 600 : 400,
                }}>{z.label}</span>
              ))}
            </div>
          </div>


          {/* Rear weight bias */}
          <div className="input-group-header tune-header">
            Rear Weight Bias
            <InfoIcon text={`How much of your body weight loads the rear wheel. Depends on riding position and bike geometry.\n\nMost calculators (Fox, TF Tuned) assume 60-65% implicitly. Slack enduro bikes push this to 68-75% because the geometry shifts your mass rearward.`} width={280} />
          </div>
          <div className="sag-compact">
            <div className="sag-compact-top">
              <span className="sag-compact-val" style={{ color: biasZone.color }}>{vals.rearPct}%</span>
              <span className="sag-compact-zone" style={{ color: biasZone.color }}>{biasZone.label}</span>
            </div>
            <div className="sag-track-wrap">
              {BIAS_ZONES.map((z) => (
                <div key={z.id} className="sag-seg" style={{
                  left: `${(z.min - BIAS_MIN) / (BIAS_MAX - BIAS_MIN) * 100}%`,
                  width: `${(z.max - z.min) / (BIAS_MAX - BIAS_MIN) * 100}%`,
                  background: z.color, opacity: biasZone.id === z.id ? 0.4 : 0.13,
                }} />
              ))}
            </div>
            <input
              type="range" min={BIAS_MIN} max={BIAS_MAX} step={1}
              value={vals.rearPct}
              onChange={(e) => set('rearPct')(parseInt(e.target.value))}
              className="sag-slider" style={{ '--sag-color': biasZone.color }}
            />
            <div className="sag-zone-labels">
              {BIAS_ZONES.map((z) => (
                <span key={z.id} style={{
                  left: `${(z.min - BIAS_MIN) / (BIAS_MAX - BIAS_MIN) * 100}%`,
                  color: biasZone.id === z.id ? z.color : 'var(--text-dim)',
                  fontWeight: biasZone.id === z.id ? 600 : 400,
                }}>{z.label}</span>
              ))}
            </div>
          </div>

          {/* Progression override */}
          <div className="input-group-header tune-header" style={{ marginTop: 12 }}>
            Linkage Progression
            <InfoIcon text={`End-to-end progression % — how much stiffer the suspension gets from top to bottom of travel. Most trail bikes are 15–25%.\n\nFormula: progression = (LR at top − LR at bottom) ÷ LR at top. A bike going 3.0 → 2.4 is (3.0 − 2.4) / 3.0 = 20%.\n\nThe reference value shown is typical for the selected suspension type. Override with your bike's actual number if you have it (from Linkage Design, Cascade Components, or manufacturer data). The override uses a linear curve model.`} width={290} />
          </div>
          {selectedPreset && customProg === null && (
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: 6, paddingLeft: 2 }}>
              From the measured {selectedPreset.bike.name}: <span style={{ color: selectedPreset.color }}>{selectedPreset.prog}%</span>. Override below if you know your own bike's figure.
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <InputField
                label={customProg !== null ? 'Custom (linear model)' : 'Override (optional)'}
                value={customProg !== null ? customProg : ''}
                onChange={(v) => { setCustomProg(Math.max(0, Math.min(50, v))); clearCurve() }}
                unit="%" min={0} max={50} step={1}
                tip="Optional. Enter your bike's actual end-to-end progression % from linkage software or manufacturer data. Overrides the suspension type preset with a linear curve model."
              />
            </div>
            {customProg !== null && (
              <button
                onClick={() => setCustomProg(null)}
                style={{ fontSize: 10, color: 'var(--text-dim)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', marginTop: 18, whiteSpace: 'nowrap' }}
              >
                reset
              </button>
            )}
          </div>

          {/* Measured curve — 3 points off a published graph */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: customPreset ? 'var(--accent)' : 'var(--text-dim)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              Or a measured curve (3 pts)
              <InfoIcon text={`For bikes where you have the leverage numbers off a graph (Linkage Design, Cascade, Blister). Read LR at the top, middle, and bottom of travel and enter them here. The tool builds a curve through the three points and corrects the spring rate for its shape. Only the shape matters, so read the values straight off the graph.`} width={290} />
              {customPreset && (
                <button onClick={clearCurve} style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-dim)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}>reset</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['start', 'top', '0%'], ['mid', 'mid', '50%'], ['end', 'end', '100%']].map(([field, ph, pos]) => (
                <div key={field} style={{ flex: 1 }}>
                  <input
                    type="number" className="calc-input" style={{ width: '100%', textAlign: 'center', padding: '7px 6px' }}
                    value={curveInput[field]} placeholder={ph}
                    onChange={(e) => setCurveField(field)(e.target.value)}
                    min={1} max={5} step={0.05}
                  />
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{pos} · LR</div>
                </div>
              ))}
            </div>
            {customPreset && calc.usesAbsCurve && calc.effStroke && (
              <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 7, lineHeight: 1.55 }}>
                Your numbers are used as-is. With {vals.wheelTravel}mm travel they imply a{' '}
                <span style={{ color: 'var(--accent)' }}>{calc.effStroke.toFixed(1)}mm stroke</span>, which the calc uses.
                {Math.abs(calc.effStroke - vals.shockStroke) / vals.shockStroke > 0.04 && (
                  <span style={{ color: '#f0b429' }}> Your Shock Stroke field says {vals.shockStroke}mm — worth a re-check.</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        <div className="calc-outputs card">
          <div className="card-title results-title">
            <span>Results</span>
            <Tip text="Copy a link that opens this calculator with your exact inputs, for sharing a setup or saving it for later." width={240}>
              <button type="button" className={`share-btn${shareStatus === 'copied' ? ' share-btn-done' : ''}`} onClick={copyShareLink}>
                {shareStatus === 'copied' ? '✓ Copied' : '↗ Share link'}
              </button>
            </Tip>
          </div>

          <div className="results-rate">
            <div className="big-rate-row" ref={rateRef}>
              <span className="big-rate-num" style={{ color: zone.color }}>{calc.lbin ? Math.round(calc.lbin) : '—'}</span>
              <span className="big-rate-unit">lb/in</span>
              <span className="big-rate-divider"> / </span>
              <span className="big-rate-num" style={{ color: zone.color }}>{calc.nmm ? calc.nmm.toFixed(1) : '—'}</span>
              <span className="big-rate-unit">N/mm</span>
            </div>
            <div className="big-rate-zone" style={{ color: zone.color }}>{zone.label} setup</div>
            {calc.lbin && (
              <div className="rate-sentence">
                The linear coil rate that puts you at {Math.round(calc.userSag.shockSagPct * 100)}% shock sag on this bike.
              </div>
            )}

            {/* ── Stock springs, and the sag each one actually gives ── */}
            {calc.springOptions.length > 0 && (
              <div className="spring-options">
                <div className="spring-options-label">
                  Stock springs (lb/in) · {sagLabel}
                  <InfoIcon width={290} text={"Where each stock spring actually puts you. Solved at each spring's own sag point, since the leverage ratio changes as the bike sits deeper.\n\nMost brands sell in 25 lb/in steps, Cane Creek in 50. Stamped rates can be a few percent off."} />
                </div>
                <div className="spring-options-row">
                  {calc.springOptions.map((o) => (
                    <span key={o.rate} className={`spring-opt${o.nearest ? ' spring-opt-nearest' : ''}`}
                      style={o.nearest ? { color: zone.color } : undefined}>
                      <span className="spring-opt-rate">{o.rate}</span> → {o.sagPct != null ? `${pct1(o.sagPct)}%` : '—'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Preload fine-tune (optional layer on top of the sag-anchored rate) ── */}
            {calc.preload && (() => {
              const pl = calc.preload
              const resultMm = pl.solveSag(pl.kStockNmm, preloadMm)
              const resultPct = pl.toModePct(resultMm)
              const forceLb = Math.round(pl.kStockNmm * preloadMm * 0.224809)
              const toTargetLb = Math.round(pl.kStockNmm * pl.toTargetMm * 0.224809)
              const hint = pl.toTargetMm >= 0.15
                ? `wind ~${pl.toTargetMm.toFixed(1)}mm to target`
                : pl.toTargetMm <= -0.15 ? `~${Math.abs(pl.toTargetMm).toFixed(1)}mm gap to target` : 'lands on target'
              return (
                <div className="fold-block">
                  <div className="fold-head-row">
                    <button type="button" className="fold-head" onClick={() => setPreloadOpen((o) => !o)} aria-expanded={preloadOpen}>
                      <Chevron open={preloadOpen} />
                      Preload <span className="fold-tag">optional</span>
                      {!preloadOpen && <span className="fold-collapsed-hint">· {hint}</span>}
                    </button>
                    <InfoIcon width={300} text={"Preload pre-compresses the spring by winding the collar. It does NOT change spring rate. It shifts the whole force curve up, so it only moves ride height (sag). Winding X mm of preload reduces shock sag by X mm on any spring.\n\nUse it to land the nearest stock size on your sag, not as a substitute for rate. Most coil shocks cap around 2-3 turns (~5mm) to stay clear of coil bind. Negative = a top-out gap (collar backed off, or a spring a hair short of installed length)."} />
                  </div>
                  {preloadOpen && (
                    <>
                      <div className="fold-suggest">
                        {pl.nearestLbin} lb/in sits at <strong>{pct1(pl.stockSagPct)}%</strong> {sagLabel} on its own.{' '}
                        {pl.toTargetMm >= 0.15
                          ? <>Wind <strong>~{pl.toTargetMm.toFixed(1)}mm</strong> (≈{toTargetLb} lb) to reach {targetPct}%.</>
                          : pl.toTargetMm <= -0.15
                            ? <>Back off <strong>~{Math.abs(pl.toTargetMm).toFixed(1)}mm</strong> (top-out gap) for {targetPct}%, or just run it as-is.</>
                            : <>Lands right on your {targetPct}% target.</>}
                      </div>
                      <div className="fold-row">
                        <label htmlFor="preload-mm">Try preload</label>
                        <div className="fold-input-wrap">
                          <input id="preload-mm" type="number" step={0.5} value={preloadMm}
                            onChange={(e) => { const v = parseFloat(e.target.value); setPreloadMm(isNaN(v) ? 0 : v) }} />
                          <span className="fold-unit">mm</span>
                        </div>
                        <span className="fold-out">
                          → <strong>{resultPct != null ? `${pct1(resultPct)}%` : '—'}</strong> {sagLabel}{resultMm != null ? ` (${resultMm.toFixed(0)} mm at the shock)` : ''}{preloadMm ? `, ≈${forceLb > 0 ? '+' : ''}${forceLb} lb` : ''}
                        </span>
                      </div>
                      {Math.abs(preloadMm) > 5 && (
                        <div className="fold-warn">Over ~5mm / 2-3 turns. Check your shock's stated limit before winding this far.</div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

            {/* ── Check your measured sag ── */}
            {calc.lbin && (
              <div className="fold-block">
                <div className="fold-head-row">
                  <button type="button" className="fold-head" onClick={() => setCheckOpen((o) => !o)} aria-expanded={checkOpen}>
                    <Chevron open={checkOpen} />
                    Check your measured sag
                    {!checkOpen && <span className="fold-collapsed-hint">· already running a spring?</span>}
                  </button>
                  <InfoIcon width={300} text={"Enter the spring you run and the sag you measure at the shock's o-ring. The spring force at that sag, divided by the leverage ratio there, is the load actually on your rear wheel. That replaces the rear weight bias guess with a measurement, and the spring for your target is sized from it.\n\nBounce a few times and let the bike settle before reading. Seal friction can hold it a few mm high or low."} />
                </div>
                {checkOpen && (
                  <>
                    <div className="fold-row">
                      <label htmlFor="check-spring">Spring</label>
                      <div className="fold-input-wrap">
                        <input id="check-spring" type="number" inputMode="numeric" step={25} placeholder={nearestStock ?? ''}
                          value={checkSpring} onChange={(e) => setCheckSpring(e.target.value)} />
                        <span className="fold-unit">lb/in</span>
                      </div>
                      <label htmlFor="check-sag">Sag</label>
                      <div className="fold-input-wrap">
                        <input id="check-sag" type="number" inputMode="decimal" step={0.5} placeholder="mm"
                          value={checkSagMm} onChange={(e) => setCheckSagMm(e.target.value)} />
                        <span className="fold-unit">mm</span>
                      </div>
                      <label htmlFor="check-preload">Preload</label>
                      <div className="fold-input-wrap">
                        <input id="check-preload" type="number" inputMode="decimal" step={0.5} placeholder="0"
                          value={checkPreload} onChange={(e) => setCheckPreload(e.target.value)} />
                        <span className="fold-unit">mm</span>
                      </div>
                    </div>
                    {!check && (
                      <div className="fold-suggest">Measured at the shock: how far the o-ring moved from full extension.</div>
                    )}
                    {check?.error && <div className="fold-warn">{check.error}</div>}
                    {check && !check.error && (() => {
                      const steps = Math.round((check.recStock - check.rate) / 25)
                      const onTarget = Math.abs(check.recLbin - check.rate) < 12.5
                      const biasPct = pct0(check.bias)
                      return (
                        <>
                          <div className="fold-suggest">
                            Your {check.rate} lb/in sits at <strong>{pct1(check.measuredPct)}%</strong> shock sag. That puts
                            about <strong>{weightOut(check.wheelForceN / G)}</strong> on the rear wheel,{' '}
                            <strong>{biasPct}%</strong> of your weight{biasPct !== vals.rearPct ? ` (the calculator is assuming ${vals.rearPct}%)` : ''}.{' '}
                            {onTarget
                              ? <>That spring is right for {targetPct}% {sagLabel}.</>
                              : <>For {targetPct}% {sagLabel} you want <strong>{Math.round(check.recLbin)} lb/in</strong>, so
                                  a {check.recStock}{steps !== 0 ? ` (${Math.abs(steps)} size${Math.abs(steps) > 1 ? 's' : ''} ${steps > 0 ? 'stiffer' : 'softer'})` : ''}.</>}
                          </div>
                          {!check.plausible && (
                            <div className="fold-warn">That's well outside the usual 55–75% rear bias. Re-check the reading, your rider weight, and the spring's stamped rate.</div>
                          )}
                          {check.plausible && biasPct !== vals.rearPct && (
                            <button type="button" className="fold-apply"
                              onClick={() => set('rearPct')(Math.min(BIAS_MAX, Math.max(BIAS_MIN, biasPct)))}>
                              Use {biasPct}% rear bias in the calculator
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </>
                )}
              </div>
            )}

            <div className="results-meta">
              <Tip text="Leverage ratio = wheel travel ÷ shock stroke. The arrow shows the ratio at your sag point for the selected curve, which is what the spring actually works against." width={260}>
                <span className="results-meta-tip">
                  LR {calc.geoLR ? calc.geoLR.toFixed(2) : '—'}:1
                  {hasCurve && calc.effectiveLR ? <> → <span style={{ color: curveColor }}>{calc.effectiveLR.toFixed(2)}:1</span></> : null}
                </span>
              </Tip>
              <span className="results-meta-sep">·</span>
              <Tip text="Rider weight × rear bias: the load the rear shock has to hold at sag.">
                <span className="results-meta-tip">
                  Rear load {weightOut(calc.rearForceN / G)} · {Math.round(calc.rearForceN)} N
                </span>
              </Tip>
              {hasCurve && (
                <>
                  <span className="results-meta-sep">·</span>
                  <span style={{ color: curveColor }}>{fmtPct(calc.linkageMod)} linkage correction</span>
                </>
              )}
            </div>
            {hasCurve && (
              <div className="curve-source" style={{ color: curveColor }}>
                {activeBike
                  ? <>measured curve · {activeBike.name} ({activeBike.year})</>
                  : customPreset
                    ? <>your 3-point curve</>
                    : customProg !== null
                      ? <>custom {customProg}% progression · linear model</>
                      : activePreset
                        ? <>{typeLabel(activePreset.id)} shape · from the measured {activePreset.bike.name}</>
                        : null}
              </div>
            )}
          </div>

          {/* ── Charts ── */}
          <div className="calc-charts">
            <div className="chart-pair">

              {/* A — Spring force (clamped Y so crossing is prominent) */}
              <div>
                <div className="chart-pair-title">
                  Spring Force at Wheel
                  <InfoIcon text={`Force your spring delivers at the rear wheel as it compresses. Yellow dashed line = your rear load.\n\nWhere they cross is your sag point. Y-axis is zoomed to that region so you can see clearly whether you're over or under-sprung.`} width={260} />
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={calc.curveData} margin={{ top: 22, right: 12, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
                    <XAxis dataKey="sagMm" tickFormatter={(v) => `${v}mm`}
                      tick={{ fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis domain={calc.yDomainClamped}
                      tickFormatter={(v) => `${Math.round(v * 0.2248)}lb`}
                      tick={{ fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      width={44} />
                    <RechartTooltip
                      contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                      formatter={(v, name, props) => {
                        const activeKey = overridePreset ? 'force_active' : linkageId ? `force_${linkageId}` : 'force_neutral'
                        if (props.dataKey !== activeKey && props.dataKey !== 'targetLine') return [null, null]
                        return [`${Math.round(v * 0.2248)} lb · ${v} N`, props.dataKey === 'targetLine' ? 'Rear load' : 'Spring force']
                      }}
                      labelFormatter={(l) => `${l}mm travel`}
                    />
                    <ReferenceLine x={Math.round(calc.userSag.wheelSagMm)}
                      stroke={zone.color} strokeDasharray="4 2"
                      label={{ value: `sag · ${Math.round(calc.userSag.wheelSagPct * 100)}% wheel`, fill: zone.color, fontSize: 9, position: 'insideTopRight' }} />
                    <Line type="monotone" dataKey="force_neutral" dot={false}
                      stroke={!linkageId && !overridePreset ? zone.color : '#bbb'} strokeWidth={!linkageId && !overridePreset ? 2 : 1} strokeOpacity={!linkageId && !overridePreset ? 1 : 0.2} />
                    {LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id)).map(p => {
                      const active = linkageId === p.id
                      return <Line key={p.id} type="monotone" dataKey={`force_${p.id}`} dot={false}
                        stroke={p.color} strokeWidth={active ? 2 : 1} strokeOpacity={active ? 1 : 0.15} />
                    })}
                    {overridePreset && (
                      <Line type="monotone" dataKey="force_active" dot={false}
                        stroke={BIKE_COLOR} strokeWidth={2} />
                    )}
                    <Line type="monotone" dataKey="targetLine" stroke="#f0b429" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <span><span className="dot" style={{ background: overridePreset ? BIKE_COLOR : !linkageId ? zone.color : activePreset?.color || zone.color }} /> Spring force</span>
                  <span><span className="dot" style={{ background: '#f0b429' }} /> Rear load</span>
                </div>
              </div>

              {/* B — Your bike's LR curve */}
              <div>
                <div className="chart-pair-title">
                  Your Leverage Curve · wheel/shock
                  <InfoIcon text={`LR = wheel travel ÷ shock travel at each point in the stroke.\n\nCounter-intuitive but important: a FALLING curve means PROGRESSIVE (rising-rate) suspension — the shock gets harder to compress deeper in travel, resisting bottom-out. A RISING curve is digressive (less support deeper in travel). Flat = linear.\n\nThe "Unknown" baseline is flat because without linkage shape data we can only use your overall geometry ratio.`} width={290} />
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={calc.curveData} margin={{ top: 22, right: 12, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
                    <XAxis dataKey="sagMm" tickFormatter={(v) => `${v}mm`}
                      tick={{ fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis domain={calc.lrDomain}
                      tickFormatter={(v) => `${v.toFixed(1)}`}
                      tick={{ fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      label={{ value: 'LR', position: 'insideTopLeft', offset: 4, fill: '#8896aa', fontSize: 10 }}
                      width={36} />
                    <RechartTooltip
                      contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                      formatter={(v, name, props) => {
                        const activeKey = overridePreset ? 'lr_active' : linkageId ? `lr_${linkageId}` : 'lr_neutral'
                        if (props.dataKey !== activeKey) return [null, null]
                        return [`${v.toFixed(2)}:1`, 'Leverage ratio']
                      }}
                      labelFormatter={(l) => `${l}mm travel`}
                    />
                    <ReferenceLine x={Math.round(calc.userSag.wheelSagMm)}
                      stroke={zone.color} strokeDasharray="4 2"
                      label={{ value: `sag · ${Math.round(calc.userSag.wheelSagPct * 100)}% wheel`, fill: zone.color, fontSize: 9, position: 'insideTopRight' }} />
                    <Line type="monotone" dataKey="lr_neutral" dot={false}
                      stroke={!linkageId && !overridePreset ? zone.color : '#bbb'} strokeWidth={!linkageId && !overridePreset ? 2 : 1} strokeOpacity={!linkageId && !overridePreset ? 1 : 0.2} />
                    {LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id)).map(p => {
                      const active = linkageId === p.id
                      return <Line key={p.id} type="monotone" dataKey={`lr_${p.id}`} dot={false}
                        stroke={p.color} strokeWidth={active ? 2 : 1} strokeOpacity={active ? 1 : 0.15} />
                    })}
                    {overridePreset && (
                      <Line type="monotone" dataKey="lr_active" dot={false}
                        stroke={BIKE_COLOR} strokeWidth={2} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <span><span className="dot" style={{ background: overridePreset ? BIKE_COLOR : !linkageId ? zone.color : activePreset?.color || zone.color }} />
                    {activeBike ? `${activeBike.name} (measured)` : customPreset ? 'Custom curve (3 pts)' : activePreset ? activePreset.name : 'Your geometry'}
                  </span>
                </div>
              </div>

            </div>

            <div className="calc-explainer">
              <div className="calc-explainer-title">Why linkage type changes your spring rate</div>
              <p>
                Your spring is sized so the shock reaches target sag under your weight. Most linkages have a
                higher leverage ratio early in the stroke, right where sag sits, so at sag the spring is working
                harder than travel ÷ stroke suggests and needs to be stiffer.
              </p>
              <p>
                At your current sag:{' '}
                {SUSPENSION_TYPES.map((t, i) => {
                  const p = LINKAGE_PRESETS.find((pr) => pr.id === t.presetId)
                  return (
                    <span key={t.presetId}>
                      <strong style={{ color: p?.color }}>{t.label} {fmtPct(calc.typeMods[t.presetId] ?? 1)}</strong>
                      {i < SUSPENSION_TYPES.length - 1 ? ', ' : ''}
                    </span>
                  )
                })}
                {activeBike ? <>, and the measured <strong style={{ color: BIKE_COLOR }}>{activeBike.name} {fmtPct(calc.linkageMod)}</strong></> : null}.
                {' '}The correction shrinks as you run more sag, because sag moves deeper into the travel, where the
                leverage ratio has fallen closer to its average. Geometric applies none, the same assumption Fox and
                MRP calculators make.
              </p>
            </div>
          </div>

          {/* ── Where to go next ── */}
          <nav className="next-steps" aria-label="Next setup steps">
            <span className="next-steps-label">Setup order</span>
            <span className="next-step next-step-here"><span className="next-step-num">1</span>Spring rate</span>
            <Link to="/learn/packing" className="next-step"><span className="next-step-num">2</span>Rebound</Link>
            <Link to="/learn/clickers" className="next-step"><span className="next-step-num">3</span>Compression</Link>
            <span className="next-steps-note">Damping can't fix the wrong spring, so set it first.</span>
          </nav>
        </div>

      </div>

      {/* ── Mobile result bar ── */}
      {createPortal(
        <button
          type="button"
          className={`mobile-rate-bar${showBar ? ' is-visible' : ''}`}
          tabIndex={showBar ? 0 : -1}
          aria-hidden={!showBar}
          onClick={() => rateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          <span className="mrb-rate" style={{ color: zone.color }}>
            {calc.lbin ? Math.round(calc.lbin) : '—'}<small> lb/in</small>
          </span>
          <span className="mrb-meta">{targetPct}% {sagLabel}{nearestStock ? ` · nearest ${nearestStock}` : ''}</span>
          <span className="mrb-go">Details ↓</span>
        </button>,
        document.body
      )}
    </>
  )
}
