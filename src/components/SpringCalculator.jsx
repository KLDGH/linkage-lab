import { useState, useMemo, useEffect } from 'react'
import { springRateNmm, leverageRatio, nmmToLbin, G } from '../lib/springMath'
import { LINKAGE_PRESETS, getLrAtTravel, averageLr } from '../lib/linkagePresets'
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

// Rider-facing suspension type labels mapped to underlying LR presets
const SUSPENSION_TYPES = [
  {
    presetId: 'horst',
    label: 'Horst / Four-Bar',
    sublabel: 'Specialized FSR, Transition, Trek — most common baseline behavior',
    tip: 'Consistently falling LR curve. At 30% sag the LR sits ~5% above the travel average. The most common rear suspension geometry — if a published chart or calculator doesn\'t ask about linkage type, it\'s probably assuming something close to this. Curve based on measured 2025 Transition Sentinel V3 (3.36 → 2.56, 24% progression).',
  },
  {
    presetId: 'vpp',
    label: 'VPP — Modern',
    sublabel: 'Falling progressive curve, not the old U-shape',
    tip: 'Modern VPP is a falling progressive curve — starts high and drops steadily. Not the bathtub U-curve of older designs. At 30% sag the LR is ~6% above average. Curve based on measured 2025 Santa Cruz Bronson V5 (3.08 → 2.26, 27% progression).',
  },
  {
    presetId: 'dwlink',
    label: 'DW-Link / Maestro',
    sublabel: 'Ibis, Pivot, Evil — biggest spring correction of any type',
    tip: 'LR drops steeply in the first third of travel (right where sag sits), then levels off. At 30% sag the LR is ~14% above the travel average — the largest correction of any linkage type. Curve based on measured 2025 Ibis Ripmo V3 (3.50 → 2.12, 30% progression). Also covers Pivot and Evil bikes using similar DW-Link/Maestro geometry.',
  },
  {
    presetId: 'highpivot',
    label: 'High Pivot / Rearward Axle Path',
    sublabel: 'Forbidden, Norco Optic, Deviate Claymore — supple off the top, steeply progressive at end-stroke',
    tip: 'Bikes with an idler pulley and rearward axle path. LR starts high and falls gradually through the first half, then drops sharply toward bottom-out. At 30% sag LR is ~6% above average, but the steep end-stroke progression is the defining character. Curve based on Deviate Claymore measured data (2.97 → 2.30, 22.6% progression), validated against Forbidden Druid V2.',
  },
]

// LR at wheel-travel fraction t (0..1), accounting for active preset or custom progression
function lrAtTravelFrac(t, preset, customProg, geoLR) {
  if (!geoLR) return geoLR
  if (customProg !== null) {
    return geoLR * (1 + (customProg / 200) * (1 - 2 * t))
  }
  if (preset) {
    return geoLR * getLrAtTravel(preset, t) / averageLr(preset)
  }
  return geoLR
}

// Given wheel sag fraction, return corresponding shock displacement (mm)
// by integrating 1/LR from 0 to the wheel sag position.
function shockDispFromWheelSag(wheelSagPct, preset, customProg, geoLR, wheelTravel, N = 100) {
  if (!geoLR || wheelSagPct <= 0) return 0
  const wheelTarget = wheelSagPct * wheelTravel
  const dx = wheelTarget / N
  let shockDisp = 0
  for (let i = 0; i < N; i++) {
    const t = ((i + 0.5) / N) * wheelSagPct
    shockDisp += dx / lrAtTravelFrac(t, preset, customProg, geoLR)
  }
  return shockDisp
}

// Given shock sag fraction (of stroke), return corresponding wheel displacement (mm)
// by integrating up the wheel-travel axis until shock displacement reaches target.
function wheelDispFromShockSag(shockSagPct, preset, customProg, geoLR, wheelTravel, shockStroke, N = 200) {
  if (!geoLR || shockSagPct <= 0) return 0
  const shockTarget = shockSagPct * shockStroke
  const dx = wheelTravel / N
  let shockAcc = 0
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N
    const lr = lrAtTravelFrac(t, preset, customProg, geoLR)
    const newAcc = shockAcc + dx / lr
    if (newAcc >= shockTarget) {
      const frac = (shockTarget - shockAcc) / (newAcc - shockAcc)
      return (i + frac) * dx
    }
    shockAcc = newAcc
  }
  return wheelTravel
}

// Resolve user's sag input (shock or wheel) into all four representations
function resolveSag(sagInput, sagMode, preset, customProg, geoLR, wheelTravel, shockStroke) {
  if (!geoLR || !wheelTravel || !shockStroke) {
    return { wheelSagPct: 0, shockSagPct: 0, wheelSagMm: 0, shockSagMm: 0 }
  }
  if (sagMode === 'wheel') {
    const wheelSagPct = sagInput
    const wheelSagMm = wheelSagPct * wheelTravel
    const shockSagMm = shockDispFromWheelSag(wheelSagPct, preset, customProg, geoLR, wheelTravel)
    const shockSagPct = shockSagMm / shockStroke
    return { wheelSagPct, shockSagPct, wheelSagMm, shockSagMm }
  } else {
    const shockSagPct = sagInput
    const shockSagMm = shockSagPct * shockStroke
    const wheelSagMm = wheelDispFromShockSag(shockSagPct, preset, customProg, geoLR, wheelTravel, shockStroke)
    const wheelSagPct = wheelSagMm / wheelTravel
    return { wheelSagPct, shockSagPct, wheelSagMm, shockSagMm }
  }
}

// Numerically integrate shock displacement through the stroke using variable LR,
// then compute force at wheel at each travel point. Spring rate derived from
// instantaneous LR at sag and shock displacement at sag (correct physics).
function computeForceCurve(preset, customProg, geoLR, wheelTravel, shockStroke, wheelSagPct, riderKg, rearFrac, N = 20) {
  if (!geoLR) return Array(N + 1).fill(0)
  const lrAtSag = lrAtTravelFrac(wheelSagPct, preset, customProg, geoLR)
  const shockSagMm = shockDispFromWheelSag(wheelSagPct, preset, customProg, geoLR, wheelTravel)
  if (!shockSagMm) return Array(N + 1).fill(0)
  const k = (riderKg * G * rearFrac * lrAtSag) / shockSagMm // N/mm
  const pts = []
  let shockDisp = 0
  for (let i = 0; i <= N; i++) {
    if (i > 0) {
      const t_mid = (i - 0.5) / N
      const lr_t = lrAtTravelFrac(t_mid, preset, customProg, geoLR)
      shockDisp += (wheelTravel / N) / lr_t
    }
    const lr_t = lrAtTravelFrac(i / N, preset, customProg, geoLR)
    pts.push(Math.round(k * shockDisp / lr_t))
  }
  return pts
}

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

// Pure CSS tooltip — wrap any element
function Tip({ text, children, width = 220 }) {
  return (
    <span className="tip-host" data-tip={text} style={{ '--tip-w': `${width}px` }}>
      {children}
    </span>
  )
}

function InfoIcon({ text, width }) {
  return <Tip text={text} width={width}><span className="info-icon">ⓘ</span></Tip>
}

function InputField({ label, value, onChange, unit, min, max, step, tip }) {
  const [local, setLocal] = useState(String(value))

  // Sync when parent changes externally (e.g. unit toggle kg↔lbs)
  useEffect(() => { setLocal(String(value)) }, [value])

  return (
    <div className="input-group">
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
  const w = num('w'), t = num('t'), s = num('s'), b = num('b'), sag = num('sag'), prog = num('prog')
  const link = p.get('link')
  const mode = p.get('mode')
  const u = p.get('u')
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
    weightLbs: u === 'lb' ? true : u === 'kg' ? false : null,
  }
}

// Serialize current state to a URL search string
function stateToQuery({ vals, sagPct, sagMode, linkageId, customProg, weightLbs }) {
  const p = new URLSearchParams()
  p.set('w', vals.riderWeightKg.toFixed(1))
  p.set('t', String(vals.wheelTravel))
  p.set('s', String(vals.shockStroke))
  p.set('b', String(vals.rearPct))
  p.set('sag', String(Math.round(sagPct * 100)))
  p.set('mode', sagMode)
  if (linkageId) p.set('link', linkageId)
  if (customProg !== null) p.set('prog', String(customProg))
  p.set('u', weightLbs ? 'lb' : 'kg')
  return p.toString()
}

export default function SpringCalculator() {
  const initial = useMemo(() => parseUrlState(), [])
  const [vals, setVals] = useState(initial.vals ?? DEFAULTS)
  const [sagPct, setSagPct] = useState(initial.sagPct ?? 0.30) // raw slider value (interpreted via sagMode)
  const [sagMode, setSagMode] = useState(initial.sagMode ?? 'shock') // 'shock' | 'wheel'
  const [linkageId, setLinkageId] = useState(initial.linkageId ?? null)
  const [weightLbs, setWeightLbs] = useState(initial.weightLbs ?? true)
  const [customProg, setCustomProg] = useState(initial.customProg ?? null) // null = follow preset
  const [shareStatus, setShareStatus] = useState('idle') // idle | copied

  const set = (k) => (v) => setVals((p) => ({ ...p, [k]: v }))
  const displayWeight = (kg) => weightLbs ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10
  const toKg = (v) => weightLbs ? v / 2.20462 : v
  const wUnit = weightLbs ? 'lbs' : 'kg'

  // Sync state → URL (debounced so dragging sliders doesn't spam history)
  useEffect(() => {
    const id = setTimeout(() => {
      const query = stateToQuery({ vals, sagPct, sagMode, linkageId, customProg, weightLbs })
      window.history.replaceState(null, '', `${window.location.pathname}?${query}`)
    }, 200)
    return () => clearTimeout(id)
  }, [vals, sagPct, sagMode, linkageId, customProg, weightLbs])

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
    const geoLR = leverageRatio(vals.wheelTravel, vals.shockStroke)
    const preset = LINKAGE_PRESETS.find((p) => p.id === linkageId)
    const current = resolveSag(sagPct, sagMode, preset, customProg, geoLR, vals.wheelTravel, vals.shockStroke)
    const newVal = newMode === 'wheel' ? current.wheelSagPct : current.shockSagPct
    setSagMode(newMode)
    setSagPct(Math.max(SAG_MIN / 100, Math.min(SAG_MAX / 100, newVal)))
  }

  const calc = useMemo(() => {
    const riderKg = vals.riderWeightKg
    const rearFrac = vals.rearPct / 100
    const geoLR = leverageRatio(vals.wheelTravel, vals.shockStroke)
    const preset = LINKAGE_PRESETS.find((p) => p.id === linkageId)

    // Resolve user's sag input into both shock and wheel representations
    const userSag = resolveSag(sagPct, sagMode, preset, customProg, geoLR, vals.wheelTravel, vals.shockStroke)

    // LR at sag evaluated at wheel position (correct physics)
    const lrAtSag = lrAtTravelFrac(userSag.wheelSagPct, preset, customProg, geoLR)
    const linkageMod = geoLR ? lrAtSag / geoLR : 1.0
    const effectiveLR = lrAtSag

    // Spring rate: k = F_wheel × LR_at_sag / shock_disp_at_sag
    const nmm = (geoLR && userSag.shockSagMm)
      ? (riderKg * G * rearFrac * lrAtSag) / userSag.shockSagMm
      : null
    const lbin = nmm ? nmmToLbin(nmm) : null
    const rearForceN = riderKg * G * rearFrac

    const chartPresets = LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id))
    // For each comparison curve, resolve sag using that preset's own LR curve
    const neutralSag = resolveSag(sagPct, sagMode, null, null, geoLR, vals.wheelTravel, vals.shockStroke)
    const neutralPts = computeForceCurve(null, null, geoLR, vals.wheelTravel, vals.shockStroke, neutralSag.wheelSagPct, riderKg, rearFrac)
    const presetPts = chartPresets.map(p => {
      const pSag = resolveSag(sagPct, sagMode, p, null, geoLR, vals.wheelTravel, vals.shockStroke)
      return computeForceCurve(p, null, geoLR, vals.wheelTravel, vals.shockStroke, pSag.wheelSagPct, riderKg, rearFrac)
    })

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
      [d.lr_neutral, ...chartPresets.map(p => d[`lr_${p.id}`])].filter(Boolean)
    )
    const lrDomain = [
      parseFloat((Math.min(...allLRs) * 0.96).toFixed(2)),
      parseFloat((Math.max(...allLRs) * 1.04).toFixed(2)),
    ]

    return { riderKg, geoLR, effectiveLR, linkageMod, rearForceN, nmm, lbin, curveData, yDomain, yDomainClamped, lrDomain, userSag }
  }, [vals, sagPct, sagMode, linkageId, customProg])

  // Zone is always classified against shock sag conventions (XC/Trail/Enduro/DH)
  const zone = getSagZone(calc.userSag.shockSagPct)
  const biasZone = getBiasZone(vals.rearPct)
  const activePreset = LINKAGE_PRESETS.find((p) => p.id === linkageId)

  return (
    <section className="calc-section">
      <div className="section-header">
        <span className="section-tag">01</span>
        <h2 className="section-title">Spring Rate Calculator</h2>
      </div>

      <div className="calc-grid">

        {/* ── Inputs ── */}
        <div className="calc-inputs card">
          <div className="card-title">Inputs</div>

          {/* ── Essential three ── */}
          <div className="input-group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Rider Weight</span>
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
          <InputField
            label="Wheel Travel"
            tip="Total rear wheel travel from full extension to full compression. Found in your bike's spec sheet."
            value={vals.wheelTravel} onChange={set('wheelTravel')} unit="mm" min={50} max={300} step={5}
          />
          <InputField
            label="Shock Stroke"
            tip="How far the shock shaft travels. Usually printed on the shock body (e.g. '55mm'). Not the same as eye-to-eye length."
            value={vals.shockStroke} onChange={set('shockStroke')} unit="mm" min={20} max={120} step={0.5}
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
            <InfoIcon text={`End-to-end progression % — how much stiffer the suspension gets from top to bottom of travel. Most trail bikes are 15–25%.\n\nThe reference value shown is typical for the selected suspension type. Override with your bike's actual number if you have it (from Linkage Design, Cascade Components, or manufacturer data). The override uses a linear curve model.`} width={290} />
          </div>
          {selectedPreset && customProg === null && (
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: 6, paddingLeft: 2 }}>
              {selectedPreset.prog !== null && selectedPreset.prog !== undefined
                ? <>Typical for this type: <span style={{ color: activePreset?.color }}>{selectedPreset.prog}%</span> — override below if you know your bike's actual figure</>
                : <>This type has an S-shaped curve — progression varies through travel, a single % doesn't apply</>
              }
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <InputField
                label={customProg !== null ? 'Custom (linear model)' : 'Override (optional)'}
                value={customProg !== null ? customProg : ''}
                onChange={(v) => setCustomProg(Math.max(0, Math.min(50, v)))}
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
        </div>

        {/* ── Results + Linkage ── */}
        <div className="calc-outputs card">
          <div className="card-title">Results</div>

          {/* ── Spring rate — the answer ── */}
          <div className="results-rate">
            <div className="big-rate-row">
              <span className="big-rate-num" style={{ color: zone.color }}>{calc.lbin ? Math.round(calc.lbin) : '—'}</span>
              <span className="big-rate-unit">lb/in</span>
              <span className="big-rate-divider"> / </span>
              <span className="big-rate-num" style={{ color: zone.color }}>{calc.nmm ? calc.nmm.toFixed(1) : '—'}</span>
              <span className="big-rate-unit">N/mm</span>
            </div>
            <div className="big-rate-zone" style={{ color: zone.color }}>{zone.label} setup</div>
            {calc.lbin && (
              <div className="rate-nearest" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span>
                  Nearest stock: <strong>{Math.round(calc.lbin / 25) * 25} lb/in</strong>
                  <InfoIcon text={"Spring rates are sold in 25 lb/in steps (Fox, RockShox) or 50 lb/in steps (Cane Creek).\n\nThe gap is bridgeable with preload — a few collar turns can shift your effective rate by 25–50 lb/in. That's why Cane Creek can sell in larger increments without leaving riders between springs.\n\nWhen in doubt, go to the next stiffer spring and back off with preload."} width={280} />
                </span>
                <Tip text="Copy a link that opens this calculator with your exact inputs — useful for sharing setups on forums or saving for later." width={240}>
                  <button
                    onClick={copyShareLink}
                    style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: shareStatus === 'copied' ? 'var(--green, #00c97a)' : 'var(--text-dim)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                  >
                    {shareStatus === 'copied' ? '✓ Copied' : '↗ Share link'}
                  </button>
                </Tip>
              </div>
            )}
            {customProg !== null && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                custom {customProg}% progression · linear model
              </div>
            )}
            <div className="results-meta">
              <Tip text="Leverage Ratio = wheel travel ÷ shock stroke. Higher LR = shock moves less per mm of wheel travel = stiffer spring needed.">
                <span className="results-meta-tip">
                  LR {calc.geoLR ? calc.geoLR.toFixed(2) : '—'}:1
                  {(linkageId || customProg !== null) && calc.effectiveLR ? <> → <span style={{ color: activePreset?.color || zone.color }}>{calc.effectiveLR.toFixed(2)}:1</span></> : null}
                </span>
              </Tip>
              <span className="results-meta-sep">·</span>
              <Tip text="Rider weight × rear bias = force the rear shock must support at sag.">
                <span className="results-meta-tip">
                  Rear load {weightLbs
                    ? `${Math.round(calc.rearForceN / G * 2.20462)} lbs`
                    : `${Math.round(calc.rearForceN / G)} kg`} · {Math.round(calc.rearForceN)} N
                </span>
              </Tip>
            </div>
          </div>


          {/* ── Suspension Type Selector ── */}
          <div className="linkage-selector-header" style={{ marginTop: 18 }}>
            <span className="card-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none', fontSize: '10px' }}>
              Suspension Type
              <InfoIcon text={`Select your bike's rear suspension type to apply a linkage correction. "Geometric only" uses raw travel ÷ stroke with no progression — the same assumption as Fox and MRP calculators. Selecting a type corrects for where the leverage ratio sits at your sag point vs the travel average.`} width={300} />
            </span>
            {linkageId && (
              <span className="linkage-active-note" style={{ color: activePreset?.color }}>
                {calc.linkageMod > 1 ? '+' : ''}{Math.round((calc.linkageMod - 1) * 100)}% spring adjustment
              </span>
            )}
          </div>
          <div className="linkage-tabs">
            <Tip text="Raw travel ÷ stroke with no progression assumed — same baseline as Fox and MRP calculators. Use this when you don't know your bike's linkage type or you want the geometric-only number." width={280}>
              <div
                className={`linkage-tab ${!linkageId ? 'linkage-tab-active' : ''}`}
                onClick={() => { setLinkageId(null); setCustomProg(null) }}
              >
                <span className="lt-dot" style={{ background: 'var(--text-dim)' }} />
                <span className="lt-name">Geometric</span>
              </div>
            </Tip>
            {SUSPENSION_TYPES.map((type) => {
              const p = LINKAGE_PRESETS.find(pr => pr.id === type.presetId)
              if (!p) return null
              const active = linkageId === p.id
              const shortLabel = type.label.split(' /')[0].split(' —')[0]
              return (
                <Tip key={p.id} text={`${type.sublabel}\n\n${type.tip}`} width={300}>
                  <div
                    className={`linkage-tab ${active ? 'linkage-tab-active' : ''}`}
                    style={active ? { borderColor: p.color } : {}}
                    onClick={() => { setLinkageId(active ? null : p.id); setCustomProg(null) }}
                  >
                    <span className="lt-dot" style={{ background: p.color }} />
                    <span className="lt-name" style={active ? { color: p.color } : {}}>{shortLabel}</span>
                  </div>
                </Tip>
              )
            })}
          </div>

          {/* ── Dual charts ── */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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
                      contentStyle={{ background: '#1c1814', border: '1px solid #3a3530', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                      formatter={(v, name, props) => {
                        const activeKey = linkageId ? `force_${linkageId}` : 'force_neutral'
                        if (props.dataKey !== activeKey && props.dataKey !== 'targetLine') return [null, null]
                        return [`${Math.round(v * 0.2248)} lb · ${v} N`, props.dataKey === 'targetLine' ? 'Rear load' : 'Spring force']
                      }}
                      labelFormatter={(l) => `${l}mm travel`}
                    />
                    <ReferenceLine x={Math.round(calc.userSag.wheelSagMm)}
                      stroke={zone.color} strokeDasharray="4 2"
                      label={{ value: `sag · ${Math.round(calc.userSag.wheelSagPct * 100)}% wheel`, fill: zone.color, fontSize: 9, position: 'insideTopRight' }} />
                    <Line type="monotone" dataKey="force_neutral" dot={false}
                      stroke={!linkageId ? zone.color : '#bbb'} strokeWidth={!linkageId ? 2 : 1} strokeOpacity={!linkageId ? 1 : 0.2} />
                    {LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id)).map(p => {
                      const active = linkageId === p.id
                      return <Line key={p.id} type="monotone" dataKey={`force_${p.id}`} dot={false}
                        stroke={p.color} strokeWidth={active ? 2 : 1} strokeOpacity={active ? 1 : 0.15} />
                    })}
                    <Line type="monotone" dataKey="targetLine" stroke="#f0b429" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <span><span className="dot" style={{ background: !linkageId ? zone.color : activePreset?.color || zone.color }} /> Spring force</span>
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
                      contentStyle={{ background: '#1c1814', border: '1px solid #3a3530', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                      formatter={(v, name, props) => {
                        const activeKey = linkageId ? `lr_${linkageId}` : 'lr_neutral'
                        if (props.dataKey !== activeKey) return [null, null]
                        return [`${v.toFixed(2)}:1`, 'Leverage ratio']
                      }}
                      labelFormatter={(l) => `${l}mm travel`}
                    />
                    <ReferenceLine x={Math.round(calc.userSag.wheelSagMm)}
                      stroke={zone.color} strokeDasharray="4 2"
                      label={{ value: `sag · ${Math.round(calc.userSag.wheelSagPct * 100)}% wheel`, fill: zone.color, fontSize: 9, position: 'insideTopRight' }} />
                    <Line type="monotone" dataKey="lr_neutral" dot={false}
                      stroke={!linkageId ? zone.color : '#bbb'} strokeWidth={!linkageId ? 2 : 1} strokeOpacity={!linkageId ? 1 : 0.2} />
                    {LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id)).map(p => {
                      const active = linkageId === p.id
                      return <Line key={p.id} type="monotone" dataKey={`lr_${p.id}`} dot={false}
                        stroke={p.color} strokeWidth={active ? 2 : 1} strokeOpacity={active ? 1 : 0.15} />
                    })}
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <span><span className="dot" style={{ background: !linkageId ? zone.color : activePreset?.color || zone.color }} />
                    {activePreset ? activePreset.name : 'Your geometry'}
                  </span>
                </div>
              </div>

            </div>

            {/* ── Explainer below charts ── */}
            <div style={{ marginTop: 18, padding: '12px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, lineHeight: 1.7, color: 'var(--text-dim)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-bright)', marginBottom: 6, fontSize: 12, letterSpacing: '0.01em' }}>
                Why suspension type changes your spring rate
              </div>
              <p style={{ margin: 0 }}>
                Your spring rate is set so the shock reaches your sag target under your weight. But most linkages have a <em>higher</em> leverage ratio early in the stroke — right where sag sits. That means the spring is working harder at sag than the simple travel÷stroke ratio suggests, so a stiffer spring is required.
              </p>
              <p style={{ margin: '8px 0 0' }}>
                Selecting a type above applies a correction: it takes the LR at your exact sag point and divides by the travel average. DW-Link bikes need the biggest correction (+14%) because their LR drops most steeply in the first third of travel. High pivot and four-bar types need a moderate correction (+5–6%). Selecting nothing uses raw geometry only — the same assumption Fox and MRP calculators make.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
