import { useState, useMemo } from 'react'
import {
  springRate, leverageRatio, lbinToNmm,
  kgToLbs, mmToIn, SAG_PRESETS,
} from '../lib/springMath'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'

const DEFAULTS_IMPERIAL = {
  riderWeight: 175,
  bikeWeight: 32,
  wheelTravel: 6.0,
  shockStroke: 2.0,
  rearPct: 60,
}

const DEFAULTS_METRIC = {
  riderWeight: 79,
  bikeWeight: 14.5,
  wheelTravel: 152,
  shockStroke: 51,
  rearPct: 60,
}

function InputField({ label, value, onChange, unit, min, max, step }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <div className="input-row">
        <input
          type="number"
          className="calc-input"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        <span className="input-unit">{unit}</span>
      </div>
    </div>
  )
}

function SagBar({ sagPct, label, color }) {
  return (
    <div className="sag-bar-row">
      <span className="sag-bar-label">{label}</span>
      <div className="sag-bar-track">
        <div
          className="sag-bar-fill"
          style={{ width: `${sagPct * 100}%`, background: color }}
        />
        <span className="sag-bar-pct">{Math.round(sagPct * 100)}%</span>
      </div>
    </div>
  )
}

export default function SpringCalculator() {
  const [metric, setMetric] = useState(false)
  const [vals, setVals] = useState(DEFAULTS_IMPERIAL)
  const [selectedSag, setSelectedSag] = useState(0.28)

  const set = (k) => (v) => setVals((p) => ({ ...p, [k]: v }))

  const toggleUnits = () => {
    if (!metric) {
      setVals({
        riderWeight: Math.round(vals.riderWeight * 0.453592 * 10) / 10,
        bikeWeight: Math.round(vals.bikeWeight * 0.453592 * 10) / 10,
        wheelTravel: Math.round(vals.wheelTravel * 25.4),
        shockStroke: Math.round(vals.shockStroke * 25.4),
        rearPct: vals.rearPct,
      })
    } else {
      setVals({
        riderWeight: Math.round(vals.riderWeight * 2.20462),
        bikeWeight: Math.round(vals.bikeWeight * 2.20462 * 10) / 10,
        wheelTravel: Math.round(vals.wheelTravel / 25.4 * 10) / 10,
        shockStroke: Math.round(vals.shockStroke / 25.4 * 100) / 100,
        rearPct: vals.rearPct,
      })
    }
    setMetric((m) => !m)
  }

  const calc = useMemo(() => {
    const riderLbs = metric ? kgToLbs(vals.riderWeight) : vals.riderWeight
    const bikeLbs = metric ? kgToLbs(vals.bikeWeight) : vals.bikeWeight
    const travelIn = metric ? mmToIn(vals.wheelTravel) : vals.wheelTravel
    const strokeIn = metric ? mmToIn(vals.shockStroke) : vals.shockStroke
    const total = riderLbs + bikeLbs
    const lr = leverageRatio(travelIn, strokeIn)
    const rearFrac = vals.rearPct / 100

    const rates = SAG_PRESETS.map(({ label, pct }) => ({
      label,
      pct,
      lbin: springRate(total, rearFrac, lr, pct, strokeIn),
    })).map((r) => ({
      ...r,
      nmm: r.lbin ? lbinToNmm(r.lbin) : null,
    }))

    // Force curve data: spring force at wheel vs sag %
    const curveData = Array.from({ length: 21 }, (_, i) => {
      const sagFrac = i / 20
      const strokeSag = strokeIn * sagFrac
      const forceAtShock = (springRate(total, rearFrac, lr, selectedSag, strokeIn) || 0) * strokeSag
      const forceAtWheel = forceAtShock * lr
      return {
        sag: Math.round(sagFrac * 100),
        forceWheel: Math.round(forceAtWheel),
        targetLine: total * rearFrac,
      }
    })

    return { lr, total, rates, curveData }
  }, [vals, metric, selectedSag])

  const wUnit = metric ? 'kg' : 'lbs'
  const dUnit = metric ? 'mm' : 'in'
  const dStep = metric ? 1 : 0.1

  const selectedRate = calc.rates.find((r) => r.pct === selectedSag)

  return (
    <section className="calc-section">
      <div className="section-header">
        <span className="section-tag">01</span>
        <h2 className="section-title">Spring Rate Calculator</h2>
        <button className="unit-toggle" onClick={toggleUnits}>
          {metric ? '⇄ Switch to Imperial' : '⇄ Switch to Metric'}
        </button>
      </div>

      <div className="calc-grid">
        <div className="calc-inputs card">
          <div className="card-title">Inputs</div>

          <div className="input-group-header">Weights</div>
          <InputField label="Rider Weight" value={vals.riderWeight} onChange={set('riderWeight')} unit={wUnit} min={0} max={metric ? 200 : 440} step={metric ? 0.5 : 1} />
          <InputField label="Bike Weight" value={vals.bikeWeight} onChange={set('bikeWeight')} unit={wUnit} min={0} max={metric ? 30 : 66} step={metric ? 0.1 : 0.5} />

          <div className="input-group-header">Suspension</div>
          <InputField label="Wheel Travel" value={vals.wheelTravel} onChange={set('wheelTravel')} unit={dUnit} min={0} max={metric ? 300 : 12} step={dStep} />
          <InputField label="Shock Stroke" value={vals.shockStroke} onChange={set('shockStroke')} unit={dUnit} min={0} max={metric ? 120 : 4.5} step={metric ? 0.5 : 0.05} />

          <div className="input-group-header">Weight Distribution</div>
          <div className="input-group">
            <label className="input-label">Rear Wheel Load</label>
            <div className="input-row">
              <input
                type="range"
                min={45} max={75} step={1}
                value={vals.rearPct}
                onChange={(e) => set('rearPct')(parseInt(e.target.value))}
                className="slider"
              />
              <span className="input-unit">{vals.rearPct}%</span>
            </div>
          </div>
        </div>

        <div className="calc-outputs card">
          <div className="card-title">Results</div>

          <div className="stat-row">
            <span className="stat-label">Total System Weight</span>
            <span className="stat-value">{metric ? Math.round(vals.riderWeight + vals.bikeWeight * 10) / 10 : Math.round(calc.total)} {wUnit}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Leverage Ratio (avg)</span>
            <span className="stat-value accent">{calc.lr ? calc.lr.toFixed(2) : '—'} : 1</span>
          </div>

          <div className="rate-table">
            <div className="rate-table-header">
              <span>Style</span>
              <span>Sag</span>
              <span>lb/in</span>
              <span>N/mm</span>
            </div>
            {calc.rates.map((r) => (
              <div
                key={r.label}
                className={`rate-row ${r.pct === selectedSag ? 'rate-row-selected' : ''}`}
                onClick={() => setSelectedSag(r.pct)}
              >
                <span>{r.label}</span>
                <span>{Math.round(r.pct * 100)}%</span>
                <span className="rate-value">{r.lbin ? Math.round(r.lbin) : '—'}</span>
                <span className="rate-value">{r.nmm ? r.nmm.toFixed(1) : '—'}</span>
              </div>
            ))}
          </div>

          {selectedRate && (
            <div className="selected-rate-callout">
              <span className="callout-label">Selected ({selectedRate.label}, {Math.round(selectedRate.pct * 100)}% sag)</span>
              <span className="callout-value">
                {Math.round(selectedRate.lbin)} lb/in
                <span className="callout-secondary"> · {selectedRate.nmm?.toFixed(1)} N/mm</span>
              </span>
            </div>
          )}
        </div>

        <div className="calc-chart card chart-wide">
          <div className="card-title">Spring Force Curve at Wheel — {selectedRate?.label} ({Math.round((selectedSag || 0) * 100)}% sag target)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={calc.curveData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3048" />
              <XAxis
                dataKey="sag"
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                label={{ value: 'Sag (%)', position: 'insideBottom', offset: -4, fill: '#8896aa', fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => `${v} lbs`}
                width={72}
              />
              <Tooltip
                contentStyle={{ background: '#111e30', border: '1px solid #1e3048', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                formatter={(v, name) => [`${v} lbs`, name === 'forceWheel' ? 'Spring force' : 'Rider + bike rear load']}
                labelFormatter={(l) => `Sag: ${l}%`}
              />
              <ReferenceLine
                x={Math.round(selectedSag * 100)}
                stroke="#3b82f6"
                strokeDasharray="4 2"
                label={{ value: 'target sag', fill: '#3b82f6', fontSize: 10, position: 'top' }}
              />
              <Line type="monotone" dataKey="forceWheel" stroke="#00c97a" strokeWidth={2} dot={false} name="forceWheel" />
              <Line type="monotone" dataKey="targetLine" stroke="#f0b429" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="targetLine" />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span><span className="dot" style={{ background: '#00c97a' }} /> Spring force at wheel</span>
            <span><span className="dot" style={{ background: '#f0b429' }} /> Rider + bike rear load (target)</span>
            <span><span className="dot" style={{ background: '#3b82f6' }} /> Selected sag point</span>
          </div>
        </div>
      </div>
    </section>
  )
}
