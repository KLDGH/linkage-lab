import { useState, useMemo } from 'react'
import { springRateNmm, leverageRatio, nmmToLbin, G } from '../lib/springMath'
import { LINKAGE_PRESETS, getLrAtTravel, averageLr } from '../lib/linkagePresets'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

const DEFAULTS = {
  riderWeightKg: 83.9,
  ebonusKg: 0,
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

const CHART_PRESET_IDS = ['dwlink', 'horst', 'vpp', 'cbf']

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
  return (
    <div className="input-group">
      <label className="input-label">
        {label}
        {tip && <InfoIcon text={tip} />}
      </label>
      <div className="input-row">
        <input
          type="number" className="calc-input"
          value={value} min={min} max={max} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        <span className="input-unit">{unit}</span>
      </div>
    </div>
  )
}

export default function SpringCalculator() {
  const [vals, setVals] = useState(DEFAULTS)
  const [sagPct, setSagPct] = useState(0.28)
  const [linkageId, setLinkageId] = useState(null)
  const [weightLbs, setWeightLbs] = useState(true)

  const set = (k) => (v) => setVals((p) => ({ ...p, [k]: v }))
  const displayWeight = (kg) => weightLbs ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10
  const toKg = (v) => weightLbs ? v / 2.20462 : v
  const wUnit = weightLbs ? 'lbs' : 'kg'

  const calc = useMemo(() => {
    const riderKg = vals.riderWeightKg + vals.ebonusKg
    const rearFrac = vals.rearPct / 100
    const geoLR = leverageRatio(vals.wheelTravel, vals.shockStroke)
    const preset = LINKAGE_PRESETS.find((p) => p.id === linkageId)
    const linkageMod = preset ? getLrAtTravel(preset, sagPct) / averageLr(preset) : 1.0
    const effectiveLR = geoLR ? geoLR * linkageMod : null
    const nmm = springRateNmm(riderKg, rearFrac, effectiveLR, sagPct, vals.shockStroke)
    const lbin = nmm ? nmmToLbin(nmm) : null
    const rearForceN = riderKg * G * rearFrac

    const chartPresets = LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id))
    const neutralPts = computeForceCurve(null, geoLR, vals.wheelTravel, sagPct, vals.shockStroke, riderKg, rearFrac)
    const presetPts = chartPresets.map(p => computeForceCurve(p, geoLR, vals.wheelTravel, sagPct, vals.shockStroke, riderKg, rearFrac))

    const curveData = Array.from({ length: 21 }, (_, i) => {
      const obj = {
        sagMm: Math.round(vals.wheelTravel * i / 20),
        targetLine: Math.round(rearForceN),
        force_neutral: neutralPts[i],
      }
      chartPresets.forEach((p, j) => { obj[`force_${p.id}`] = presetPts[j][i] })
      return obj
    })

    const maxForce = Math.max(
      rearForceN,
      ...neutralPts,
      ...presetPts.flat(),
    )
    const yDomain = [0, Math.ceil(maxForce * 1.1 / 200) * 200]

    return { riderKg, geoLR, effectiveLR, linkageMod, rearForceN, nmm, lbin, curveData, yDomain }
  }, [vals, sagPct, linkageId])

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

          {/* Rider weight */}
          <div className="input-group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Rider Weight</span>
            <div className="unit-pill">
              <button className={`unit-pill-btn ${!weightLbs ? 'unit-pill-active' : ''}`} onClick={() => setWeightLbs(false)}>kg</button>
              <button className={`unit-pill-btn ${weightLbs ? 'unit-pill-active' : ''}`} onClick={() => setWeightLbs(true)}>lbs</button>
            </div>
          </div>
          <InputField
            label="Rider + Gear"
            tip="Your body weight plus riding gear. Add ~2-3 kg / 5 lbs for helmet, pads, pack, shoes."
            value={displayWeight(vals.riderWeightKg)}
            onChange={(v) => set('riderWeightKg')(toKg(v))}
            unit={wUnit} min={weightLbs ? 66 : 30} max={weightLbs ? 440 : 200} step={weightLbs ? 1 : 0.5}
          />
          <InputField
            label="E-bike Motor / Battery"
            tip="Extra mass from motor + battery. Only needed for e-bikes — adds directly to the spring load. 0 for regular bikes."
            value={displayWeight(vals.ebonusKg)}
            onChange={(v) => set('ebonusKg')(toKg(v))}
            unit={wUnit} min={0} max={weightLbs ? 55 : 25} step={weightLbs ? 0.5 : 0.1}
          />

          {/* Suspension geometry */}
          <div className="input-group-header">
            Suspension Geometry
            <InfoIcon text="These define your leverage ratio (LR = wheel travel ÷ shock stroke). LR tells you how much the shock moves per mm of wheel travel. Higher LR = shock moves less = stiffer spring needed." width={260} />
          </div>
          <InputField
            label="Wheel Travel"
            tip="Total rear wheel travel from full extension to full compression. Found in your bike's spec sheet."
            value={vals.wheelTravel} onChange={set('wheelTravel')} unit="mm" min={50} max={300} step={5}
          />
          <InputField
            label="Shock Stroke"
            tip="How far the shock shaft travels. Usually printed on the shock body (e.g. '57.5mm'). Not the same as eye-to-eye length."
            value={vals.shockStroke} onChange={set('shockStroke')} unit="mm" min={20} max={120} step={0.5}
          />

          {/* Sag — compact inline */}
          <div className="input-group-header">
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
          <div className="input-group-header">
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
            <div className="results-meta">
              <Tip text="Leverage Ratio = wheel travel ÷ shock stroke. Higher LR = shock moves less per mm of wheel travel = stiffer spring needed.">
                <span className="results-meta-tip">
                  LR {calc.geoLR ? calc.geoLR.toFixed(2) : '—'}:1
                  {linkageId && calc.effectiveLR ? <> → <span style={{ color: activePreset?.color }}>{calc.effectiveLR.toFixed(2)}:1</span></> : null}
                </span>
              </Tip>
              <span className="results-meta-sep">·</span>
              <Tip text="Rider weight × rear bias = force the rear shock must support at sag.">
                <span className="results-meta-tip">
                  Rear load {Math.round(calc.rearForceN / G)} kg · {Math.round(calc.rearForceN)} N
                </span>
              </Tip>
            </div>
          </div>

          {/* ── Linkage Selector (inline) ── */}
          <div className="linkage-selector-header" style={{ marginTop: 18 }}>
            <span className="card-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none', fontSize: '10px' }}>
              LR at Sag — Linkage Correction
              <InfoIcon text={`What matters for spring rate is the leverage ratio at your sag point — not the average LR.\n\nLinkage names below are examples only. Two bikes with the same linkage name can have different curves. Select the category that best matches your bike's behavior.`} width={290} />
            </span>
            {linkageId && (
              <span className="linkage-active-note" style={{ color: activePreset?.color }}>
                {calc.linkageMod > 1 ? '+' : ''}{Math.round((calc.linkageMod - 1) * 100)}% LR at {Math.round(sagPct * 100)}% sag
              </span>
            )}
          </div>
          <div className="linkage-pills">
            <div
              className={`linkage-pill ${!linkageId ? 'linkage-pill-active' : ''}`}
              onClick={() => setLinkageId(null)}
            >
              <span className="lp-dot" style={{ background: 'var(--text-dim)' }} />
              <div className="lp-text">
                <span className="lp-name" style={{ color: !linkageId ? 'var(--text-bright)' : undefined }}>Neutral / Unknown</span>
                <span className="lp-feel">average LR at sag ≈ travel ÷ stroke</span>
              </div>
              <span className="lp-mod" style={{ color: 'var(--text-dim)' }}>0%</span>
            </div>
            {LINKAGE_PRESETS.filter(p => ['dwlink', 'horst', 'vpp', 'cbf'].includes(p.id)).map((p) => {
              const mod = getLrAtTravel(p, sagPct) / averageLr(p)
              const modStr = (mod > 1 ? '+' : '') + Math.round((mod - 1) * 100) + '%'
              const active = linkageId === p.id
              return (
                <Tip key={p.id} text={p.description} width={260}>
                  <div
                    className={`linkage-pill ${active ? 'linkage-pill-active' : ''}`}
                    style={active ? { borderColor: p.color } : {}}
                    onClick={() => setLinkageId(active ? null : p.id)}
                  >
                    <span className="lp-dot" style={{ background: p.color }} />
                    <div className="lp-text">
                      <span className="lp-name" style={{ color: active ? p.color : undefined }}>{p.name}</span>
                      <span className="lp-feel">{p.feel}</span>
                      <span className="lp-sub">{p.examples}</span>
                    </div>
                    <span className="lp-mod" style={{ color: mod > 1.01 ? '#f0b429' : mod < 0.99 ? '#00c97a' : 'var(--text-dim)' }}>
                      {modStr}
                    </span>
                  </div>
                </Tip>
              )
            })}
          </div>

          {/* ── Force Chart (inside outputs card) ── */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              Spring Force at Wheel · Wheel Travel
              <InfoIcon text={`The colored line shows the force your spring provides at the rear wheel as it compresses. The yellow dashed line is your actual rear load (rider weight × bias).\n\nWhere they cross is your sag point. A correct spring rate makes them cross exactly at your target sag %.`} width={280} />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={calc.curveData} margin={{ top: 8, right: 20, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3048" />
                <XAxis
                  dataKey="sagMm"
                  tickFormatter={(v) => `${v}mm`}
                  tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  label={{ value: 'Wheel travel (mm)', position: 'insideBottom', offset: -8, fill: '#8896aa', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  domain={calc.yDomain}
                  tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(v) => v === 0 ? '0' : `${Math.round(v * 0.2248)}lb / ${v}N`}
                  width={96}
                />
                <RechartTooltip
                  contentStyle={{ background: '#111e30', border: '1px solid #1e3048', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                  formatter={(v, name, props) => {
                    const activeKey = linkageId ? `force_${linkageId}` : 'force_neutral'
                    if (props.dataKey !== activeKey && props.dataKey !== 'targetLine') return [null, null]
                    return [
                      `${v} N · ${Math.round(v * 0.2248)} lb`,
                      props.dataKey === 'targetLine' ? 'Rear load' : 'Spring force at wheel',
                    ]
                  }}
                  labelFormatter={(l) => `Wheel travel: ${l} mm`}
                />
                <ReferenceLine
                  yAxisId="left"
                  x={Math.round(vals.wheelTravel * sagPct)}
                  stroke={zone.color} strokeDasharray="4 2"
                  label={{ value: `${Math.round(sagPct * 100)}% sag`, fill: zone.color, fontSize: 10, position: 'top' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone" dataKey="force_neutral" dot={false} name="Neutral"
                  stroke={!linkageId ? zone.color : '#888'}
                  strokeWidth={!linkageId ? 2.5 : 1}
                  strokeOpacity={!linkageId ? 1 : 0.2}
                />
                {LINKAGE_PRESETS.filter(p => CHART_PRESET_IDS.includes(p.id)).map(p => {
                  const active = linkageId === p.id
                  return (
                    <Line
                      yAxisId="left"
                      key={p.id} type="monotone" dataKey={`force_${p.id}`} dot={false} name={p.name}
                      stroke={p.color}
                      strokeWidth={active ? 2.5 : 1}
                      strokeOpacity={active ? 1 : 0.18}
                    />
                  )
                })}
                <Line yAxisId="left" type="monotone" dataKey="targetLine" stroke="#f0b429" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="targetLine" />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <span><span className="dot" style={{ background: !linkageId ? zone.color : activePreset?.color || zone.color }} />
                {activePreset ? activePreset.name : 'Neutral'} spring force at wheel
              </span>
              <span><span className="dot" style={{ background: '#f0b429' }} /> Your rear load — lines cross at target sag</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
