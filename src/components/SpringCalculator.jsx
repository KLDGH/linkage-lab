import { useState, useMemo } from 'react'
import {
  springRateNmm, leverageRatio, nmmToKgmm, G, SAG_PRESETS,
} from '../lib/springMath'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'

const DEFAULTS = {
  riderWeight: 80,
  bikeWeight: 14,
  wheelTravel: 150,
  shockStroke: 50,
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

export default function SpringCalculator() {
  const [vals, setVals] = useState(DEFAULTS)
  const [selectedSag, setSelectedSag] = useState(0.28)

  const set = (k) => (v) => setVals((p) => ({ ...p, [k]: v }))

  const calc = useMemo(() => {
    const totalKg = vals.riderWeight + vals.bikeWeight
    const rearFrac = vals.rearPct / 100
    const lr = leverageRatio(vals.wheelTravel, vals.shockStroke)
    const rearForceN = totalKg * G * rearFrac

    const rates = SAG_PRESETS.map(({ label, pct }) => {
      const nmm = springRateNmm(totalKg, rearFrac, lr, pct, vals.shockStroke)
      return { label, pct, nmm, kgmm: nmm ? nmmToKgmm(nmm) : null }
    })

    // Force curve: spring force at wheel (N) vs sag position (mm at wheel)
    const selectedRate = rates.find((r) => r.pct === selectedSag)
    const k = selectedRate?.nmm || 0

    const curveData = Array.from({ length: 21 }, (_, i) => {
      const sagFrac = i / 20
      const shockDisp = vals.shockStroke * sagFrac          // mm at shock
      const forceAtShock = k * shockDisp                    // N at shock
      const forceAtWheel = lr ? forceAtShock * lr : 0       // N at wheel
      const sagMm = Math.round(vals.wheelTravel * sagFrac)
      return {
        sagMm,
        forceWheel: Math.round(forceAtWheel),
        targetLine: Math.round(rearForceN),
      }
    })

    return { lr, totalKg, rearForceN, rates, curveData }
  }, [vals, selectedSag])

  const selectedRate = calc.rates.find((r) => r.pct === selectedSag)

  return (
    <section className="calc-section">
      <div className="section-header">
        <span className="section-tag">01</span>
        <h2 className="section-title">Spring Rate Calculator</h2>
      </div>

      <div className="calc-grid">
        <div className="calc-inputs card">
          <div className="card-title">Inputs</div>

          <div className="input-group-header">Weights</div>
          <InputField label="Rider Weight" value={vals.riderWeight} onChange={set('riderWeight')} unit="kg" min={30} max={200} step={0.5} />
          <InputField label="Bike Weight" value={vals.bikeWeight} onChange={set('bikeWeight')} unit="kg" min={5} max={30} step={0.1} />

          <div className="input-group-header">Suspension</div>
          <InputField label="Wheel Travel" value={vals.wheelTravel} onChange={set('wheelTravel')} unit="mm" min={50} max={300} step={5} />
          <InputField label="Shock Stroke" value={vals.shockStroke} onChange={set('shockStroke')} unit="mm" min={20} max={120} step={0.5} />

          <div className="input-group-header">Weight Distribution</div>
          <div className="input-group">
            <label className="input-label">Rear Wheel Load — {vals.rearPct}%</label>
            <div className="input-row">
              <input
                type="range"
                min={45} max={75} step={1}
                value={vals.rearPct}
                onChange={(e) => set('rearPct')(parseInt(e.target.value))}
                className="slider"
              />
            </div>
          </div>
        </div>

        <div className="calc-outputs card">
          <div className="card-title">Results</div>

          <div className="stat-row">
            <span className="stat-label">Total System Weight</span>
            <span className="stat-value">{Math.round((vals.riderWeight + vals.bikeWeight) * 10) / 10} kg</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Rear Load</span>
            <span className="stat-value">{Math.round(calc.rearForceN / G * 10) / 10} kg · {Math.round(calc.rearForceN)} N</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Leverage Ratio</span>
            <span className="stat-value accent">{calc.lr ? calc.lr.toFixed(2) : '—'} : 1</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Sag at {Math.round(selectedSag * 100)}%</span>
            <span className="stat-value">{Math.round(vals.shockStroke * selectedSag)} mm shock · {Math.round(vals.wheelTravel * selectedSag)} mm wheel</span>
          </div>

          <div className="rate-table">
            <div className="rate-table-header">
              <span>Style</span>
              <span>Sag</span>
              <span>N/mm</span>
              <span>kg/mm</span>
            </div>
            {calc.rates.map((r) => (
              <div
                key={r.label}
                className={`rate-row ${r.pct === selectedSag ? 'rate-row-selected' : ''}`}
                onClick={() => setSelectedSag(r.pct)}
              >
                <span>{r.label}</span>
                <span>{Math.round(r.pct * 100)}%</span>
                <span className="rate-value">{r.nmm ? r.nmm.toFixed(2) : '—'}</span>
                <span className="rate-value">{r.kgmm ? r.kgmm.toFixed(2) : '—'}</span>
              </div>
            ))}
          </div>

          {selectedRate && (
            <div className="selected-rate-callout">
              <span className="callout-label">{selectedRate.label} · {Math.round(selectedRate.pct * 100)}% sag</span>
              <span className="callout-value">
                {selectedRate.nmm?.toFixed(2)} N/mm
                <span className="callout-secondary"> · {selectedRate.kgmm?.toFixed(2)} kg/mm</span>
              </span>
            </div>
          )}
        </div>

        <div className="calc-chart card chart-wide">
          <div className="card-title">
            Spring Force at Wheel vs. Wheel Travel — {selectedRate?.label} ({Math.round((selectedSag || 0) * 100)}% sag target)
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={calc.curveData} margin={{ top: 8, right: 24, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3048" />
              <XAxis
                dataKey="sagMm"
                tickFormatter={(v) => `${v}mm`}
                tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                label={{ value: 'Wheel travel (mm)', position: 'insideBottom', offset: -8, fill: '#8896aa', fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => `${v}N`}
                width={68}
              />
              <Tooltip
                contentStyle={{ background: '#111e30', border: '1px solid #1e3048', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                formatter={(v, name) => [
                  `${v} N (${Math.round(v / G * 10) / 10} kg)`,
                  name === 'forceWheel' ? 'Spring force' : 'Rear load target',
                ]}
                labelFormatter={(l) => `Wheel travel: ${l} mm`}
              />
              <ReferenceLine
                x={Math.round(vals.wheelTravel * selectedSag)}
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
            <span><span className="dot" style={{ background: '#f0b429' }} /> Rear load target</span>
            <span><span className="dot" style={{ background: '#3b82f6' }} /> Target sag point</span>
          </div>
        </div>
      </div>
    </section>
  )
}
