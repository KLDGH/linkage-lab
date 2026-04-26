import { useState, useMemo, useEffect } from 'react'
import { springRateNmm, leverageRatio, nmmToLbin, G } from '../lib/springMath'
import { LINKAGE_PRESETS, getLrAtTravel, averageLr } from '../lib/linkagePresets'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ReferenceDot, ResponsiveContainer,
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
    presetId: 'dwlink',
    label: 'DW / High Support Linkage',
    sublabel: 'DW-Link, Maestro, firm midstroke, higher sag support',
    tip: 'Higher leverage ratio at sag than average. The shock must work harder to reach sag, so the calc adjusts your spring rate softer to compensate. Firm, supportive midstroke feel.',
  },
  {
    presetId: 'vpp',
    label: 'VPP / Progressive Linkage',
    sublabel: 'VPP-style bikes, balanced support with progressive feel',
    tip: 'Slightly lower LR at sag that rises through the stroke. The progressive ramp gives bottom-out resistance without needing a stiffer spring. Balanced, poppy feel.',
  },
  {
    presetId: 'horst',
    label: 'Horst / Four-Bar (Neutral Baseline)',
    sublabel: 'FSR / Horst-link bikes, most common modern baseline behavior',
    tip: 'Near-neutral leverage ratio at sag. The most common rear suspension category and the implicit baseline most published spring rate charts are built around. If unsure, this or Unknown are your safest options.',
  },
  {
    presetId: 'highpivot',
    label: 'High Pivot / Rearward Kinematics',
    sublabel: 'High pivot with idler pulley — supple off the top, steeply progressive at end-stroke',
    tip: 'Bikes with an idler pulley and rearward axle path (e.g. Forbidden Druid, Norco Optic, Deviate Claymore). LR starts high and falls steeply — very progressive. Curve based on Deviate Claymore data (2.97 → 2.30, 22.6% progression).',
  },
]

// Numerically integrate shock displacement through the stroke using variable LR,
// then compute force at wheel at each travel point.
function computeForceCurve(preset, geoLR, wheelTravel, sagPct, shockStroke, riderKg, rearFrac, N = 20) {
  if (!geoLR) return Array(N + 1).fill(0)
  const mod = preset ? getLrAtTravel(preset, sagPct) / averageLr(preset) : 1.0
  const k = springRateNmm(riderKg, rearFrac, geoLR * mod, sagPct, shockStroke)
  const pts = []
  let shockDisp = 0
  for (let i = 0; i <= N; i++) {
    if (i > 0) {
      const t_mid = (i - 0.5) / N
      const lr_t = preset ? geoLR * getLrAtTravel(preset, t_mid) / averageLr(preset) : geoLR
      shockDisp += (wheelTravel / N) / lr_t
    }
    const lr_t = preset ? geoLR * getLrAtTravel(preset, i / N) / averageLr(preset) : geoLR
    pts.push(k ? Math.round(k * shockDisp / lr_t) : 0)
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

export default function SpringCalculator() {
  const [vals, setVals] = useState(DEFAULTS)
  const [sagPct, setSagPct] = useState(0.30)
  const [linkageId, setLinkageId] = useState(null)
  const [weightLbs, setWeightLbs] = useState(true)
  const [customProg, setCustomProg] = useState(null) // null = follow preset

  const set = (k) => (v) => setVals((p) => ({ ...p, [k]: v }))
  const displayWeight = (kg) => weightLbs ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10
  const toKg = (v) => weightLbs ? v / 2.20462 : v
  const wUnit = weightLbs ? 'lbs' : 'kg'

  const selectedPreset = LINKAGE_PRESETS.find((p) => p.id === linkageId)

  const calc = useMemo(() => {
    const riderKg = vals.riderWeightKg
    const rearFrac = vals.rearPct / 100
    const geoLR = leverageRatio(vals.wheelTravel, vals.shockStroke)
    const preset = LINKAGE_PRESETS.find((p) => p.id === linkageId)
    // If user entered a custom progression %, compute linkageMod from a linear curve model.
    // For a linear curve with P% progression, LR at sag = 1 + (P/200)*(1 - 2*sagPct), avg = 1.0
    const linkageMod = customProg !== null
      ? 1 + (customProg / 200) * (1 - 2 * sagPct)
      : preset ? getLrAtTravel(preset, sagPct) / averageLr(preset) : 1.0
    const effectiveLR = geoLR ? geoLR * linkageMod : null
    const nmm = springRateNmm(riderKg, rearFrac, effectiveLR, sagPct, vals.shockStroke)
    const lbin = nmm ? nmmToLbin(nmm) : null
    const rearForceN = riderKg * G * rearFrac

    const chartPresets = LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id))
    const neutralPts = computeForceCurve(null, geoLR, vals.wheelTravel, sagPct, vals.shockStroke, riderKg, rearFrac)
    const presetPts = chartPresets.map(p => computeForceCurve(p, geoLR, vals.wheelTravel, sagPct, vals.shockStroke, riderKg, rearFrac))

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

    return { riderKg, geoLR, effectiveLR, linkageMod, rearForceN, nmm, lbin, curveData, yDomain, yDomainClamped, lrDomain }
  }, [vals, sagPct, linkageId, customProg])

  const zone = getSagZone(sagPct)
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
          <div className="input-group-header tune-header">
            Target Sag
            <InfoIcon text="Sag is how much your suspension compresses under your weight alone, expressed as % of wheel travel. More sag = softer feel but less travel reserve. Coil shocks are typically run at 25-33%." width={260} />
          </div>
          <div className="sag-compact">
            <div className="sag-compact-top">
              <span className="sag-compact-val" style={{ color: zone.color }}>{Math.round(sagPct * 100)}%</span>
              <span className="sag-compact-zone" style={{ color: zone.color }}>{zone.label}</span>
              <span className="sag-compact-mm">
                {Math.round(vals.shockStroke * sagPct)} mm shock · {Math.round(vals.wheelTravel * sagPct)} mm wheel
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
            <InfoIcon text={`End-to-end progression % — how much stiffer the suspension gets from top to bottom of travel.\n\nAuto-fills from your selected suspension type. Override if you know your bike's actual number (from Linkage Design, manufacturer data, or Cascade Components pages).\n\nSwitching suspension type resets this to the preset value.`} width={280} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <InputField
                label={customProg !== null ? 'Custom (linear model)' : 'Enter to override preset'}
                value={customProg !== null ? customProg : ''}
                onChange={(v) => setCustomProg(Math.max(0, Math.min(50, v)))}
                unit="%" min={0} max={50} step={1}
                tip="Optional. Enter your bike's actual end-to-end progression % from linkage software or manufacturer data (e.g. Cascade Components product pages show this). Overrides the suspension type preset. Leave blank to use the preset."
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
              <div className="rate-nearest">
                Nearest stock: <strong>{Math.round(calc.lbin / 25) * 25} lb/in</strong>
                <InfoIcon text={"Spring rates are sold in 25 lb/in steps (Fox, RockShox) or 50 lb/in steps (Cane Creek).\n\nThe gap is bridgeable with preload — a few collar turns can shift your effective rate by 25–50 lb/in. That's why Cane Creek can sell in larger increments without leaving riders between springs.\n\nWhen in doubt, go to the next stiffer spring and back off with preload."} width={280} />
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
              <InfoIcon text={`Select the category closest to your bike's rear linkage. These are kinematic tendencies — two bikes with the same name can behave differently. When in doubt, leave it on Unknown.`} width={280} />
            </span>
            {linkageId && (
              <span className="linkage-active-note" style={{ color: activePreset?.color }}>
                {calc.linkageMod > 1 ? '+' : ''}{Math.round((calc.linkageMod - 1) * 100)}% spring adjustment
              </span>
            )}
          </div>
          <div className="linkage-pills">
            <div
              className={`linkage-pill ${!linkageId ? 'linkage-pill-active' : ''}`}
              onClick={() => { setLinkageId(null); setCustomProg(null) }}
            >
              <span className="lp-dot" style={{ background: 'var(--text-dim)' }} />
              <div className="lp-text">
                <span className="lp-name" style={{ color: !linkageId ? 'var(--text-bright)' : undefined }}>Unknown / Not sure</span>
                <span className="lp-sub">use geometry alone — safe default</span>
              </div>
              <span className="lp-mod" style={{ color: 'var(--text-dim)' }}>0%</span>
            </div>
            {SUSPENSION_TYPES.map((type) => {
              const p = LINKAGE_PRESETS.find(pr => pr.id === type.presetId)
              if (!p) return null
              const mod = getLrAtTravel(p, sagPct) / averageLr(p)
              const modStr = (mod > 1 ? '+' : '') + Math.round((mod - 1) * 100) + '%'
              const active = linkageId === p.id
              return (
                <Tip key={p.id} text={type.tip} width={280}>
                  <div
                    className={`linkage-pill ${active ? 'linkage-pill-active' : ''}`}
                    style={active ? { borderColor: p.color } : {}}
                    onClick={() => { setLinkageId(active ? null : p.id); setCustomProg(null) }}
                  >
                    <span className="lp-dot" style={{ background: p.color }} />
                    <div className="lp-text">
                      <span className="lp-name" style={{ color: active ? p.color : undefined }}>{type.label}</span>
                      <span className="lp-sub">{type.sublabel}</span>
                    </div>
                    <span className="lp-mod" style={{ color: mod > 1.01 ? '#f0b429' : mod < 0.99 ? '#00c97a' : 'var(--text-dim)' }}>
                      {modStr}
                    </span>
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
                <ResponsiveContainer width="100%" height={220}>
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
                    <ReferenceLine x={Math.round(vals.wheelTravel * sagPct)}
                      stroke={zone.color} strokeDasharray="4 2"
                      label={{ value: `${Math.round(sagPct * 100)}% sag`, fill: zone.color, fontSize: 9, position: 'insideTopRight' }} />
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
                <ResponsiveContainer width="100%" height={220}>
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
                    <ReferenceLine x={Math.round(vals.wheelTravel * sagPct)}
                      stroke={zone.color} strokeDasharray="4 2"
                      label={{ value: `${Math.round(sagPct * 100)}% sag`, fill: zone.color, fontSize: 9, position: 'insideTopRight' }} />
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
          </div>

        </div>

      </div>
    </section>
  )
}
