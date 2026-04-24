import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { LINKAGE_PRESETS, getLrAtTravel, averageLr } from '../lib/linkagePresets'

export default function LeverageCurve() {
  const [selected, setSelected] = useState(['horst', 'vpp', 'dwlink'])

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const chartData = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const t = i / 20
      const row = { travel: Math.round(t * 100) }
      LINKAGE_PRESETS.forEach((p) => {
        row[p.id] = Math.round(getLrAtTravel(p, t) * 100) / 100
      })
      return row
    })
  }, [])

  const visiblePresets = LINKAGE_PRESETS.filter((p) => selected.includes(p.id))

  return (
    <section className="calc-section">
      <div className="section-header">
        <span className="section-tag">02</span>
        <h2 className="section-title">Leverage Ratio Curves</h2>
      </div>

      <div className="leverage-layout">
        <div className="preset-list card">
          <div className="card-title">Linkage Types</div>
          {LINKAGE_PRESETS.map((p) => (
            <div
              key={p.id}
              className={`preset-item ${selected.includes(p.id) ? 'preset-on' : 'preset-off'}`}
              onClick={() => toggle(p.id)}
            >
              <div className="preset-dot" style={{ background: p.color }} />
              <div className="preset-info">
                <div className="preset-name" style={{ color: selected.includes(p.id) ? p.color : '#8896aa' }}>
                  {p.name}
                </div>
                <div className="preset-examples">{p.examples}</div>
                <div className="preset-desc">{p.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="leverage-chart card">
          <div className="card-title">Leverage Ratio vs. Wheel Travel</div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3048" />
              <XAxis
                dataKey="travel"
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                label={{ value: 'Wheel Travel (%)', position: 'insideBottom', offset: -12, fill: '#8896aa', fontSize: 11 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                label={{ value: 'LR', angle: -90, position: 'insideLeft', fill: '#8896aa', fontSize: 11 }}
                width={36}
              />
              <Tooltip
                contentStyle={{ background: '#111e30', border: '1px solid #1e3048', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                formatter={(v, name) => {
                  const p = LINKAGE_PRESETS.find((x) => x.id === name)
                  return [`${v} : 1`, p?.name || name]
                }}
                labelFormatter={(l) => `Travel: ${l}%`}
              />
              {visiblePresets.map((p) => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.id}
                  stroke={p.color}
                  strokeWidth={2}
                  dot={false}
                  name={p.id}
                />
              ))}
              <ReferenceLine x={28} stroke="#3b82f6" strokeDasharray="4 2"
                label={{ value: '28% sag', fill: '#3b82f6', fontSize: 9, position: 'top' }} />
            </LineChart>
          </ResponsiveContainer>

          <div className="lr-stats">
            {visiblePresets.map((p) => (
              <div key={p.id} className="lr-stat-item">
                <span className="lr-stat-swatch" style={{ background: p.color }} />
                <span className="lr-stat-name">{p.name}</span>
                <span className="lr-stat-avg">avg {averageLr(p).toFixed(2)} : 1</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="explainer card">
        <div className="card-title">What does this mean?</div>
        <div className="explainer-grid">
          <div className="explainer-item">
            <span className="explainer-term accent">Higher LR</span>
            <span className="explainer-def">Shock moves less per unit of wheel travel → requires stiffer spring. More sensitive to small bumps.</span>
          </div>
          <div className="explainer-item">
            <span className="explainer-term" style={{ color: '#00c97a' }}>Falling curve</span>
            <span className="explainer-def">LR decreases through stroke → spring feels progressively stiffer (bottoming resistance). DW-Link exemplar.</span>
          </div>
          <div className="explainer-item">
            <span className="explainer-term" style={{ color: '#f0b429' }}>Rising curve</span>
            <span className="explainer-def">LR increases → spring feels softer deep in travel. VPP's U-shape gives mid-stroke support + end-stroke compliance.</span>
          </div>
          <div className="explainer-item">
            <span className="explainer-term" style={{ color: '#e53e3e' }}>Flat curve</span>
            <span className="explainer-def">Single pivot — constant ratio, linear feel. Spring must do all the work of progression (often paired with coils).</span>
          </div>
        </div>
      </div>
    </section>
  )
}
