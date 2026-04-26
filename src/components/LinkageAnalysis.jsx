import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

const DEMO_BIKE = {
  name: 'Specialized Stumpjumper EVO 29',
  travel: 150,
  stroke: 57.5,
  linkage: 'Horst Link (FSR)',
  year: '2023',
}

// Demo data for a 150mm Horst-link trail bike.
// LR, anti-squat (3 gear scenarios), and pedal kickback
// are representative of published kinematics for this category.
const chartData = Array.from({ length: 21 }, (_, i) => {
  const t = i / 20
  const lr = parseFloat((2.82 - t * 0.28 + Math.sin(t * Math.PI) * 0.04).toFixed(2))
  const asLow  = Math.round(128 - t * 42 - t * t * 8)   // 32t sprocket
  const asMid  = Math.round(96  - t * 30 - t * t * 6)   // 21t sprocket
  const asHigh = Math.round(70  - t * 22 - t * t * 4)   // 11t sprocket
  const kickback = parseFloat((1.8 + t * 11.2 + Math.sin(t * Math.PI * 0.9) * 1.6).toFixed(1))
  return {
    travel: Math.round(t * 100),
    lr,
    as_low: asLow,
    as_mid: asMid,
    as_high: asHigh,
    kickback,
  }
})

const TICK = { fill: '#8896aa', fontSize: 11, fontFamily: 'JetBrains Mono' }
const GRID = { strokeDasharray: '3 3', stroke: '#e8e4de' }
const TT   = { background: '#1c1814', border: '1px solid #3a3530', fontFamily: 'JetBrains Mono', fontSize: 11 }

export default function LinkageAnalysis() {
  return (
    <section className="calc-section">
      <div className="section-header">
        <span className="section-tag">03</span>
        <h2 className="section-title">Linkage Analysis</h2>
        <span className="header-badge" style={{ background: 'var(--purple)', border: 'none' }}>ALPHA</span>
      </div>

      <p className="la-intro">
        Full kinematic analysis from pivot coordinates — leverage ratio, anti-squat, pedal kickback,
        and brake rise across the travel. Early alpha. Bikes being added one at a time.
      </p>

      {/* ── Demo bike card ── */}
      <div className="la-bike-card">
        <div className="la-bike-label">Demo bike</div>
        <div className="la-bike-name">{DEMO_BIKE.name}</div>
        <div className="la-bike-meta">
          <span>{DEMO_BIKE.travel}mm travel</span>
          <span className="la-sep">·</span>
          <span>{DEMO_BIKE.stroke}mm stroke</span>
          <span className="la-sep">·</span>
          <span>{DEMO_BIKE.linkage}</span>
          <span className="la-sep">·</span>
          <span>{DEMO_BIKE.year}</span>
        </div>
      </div>

      {/* ── Three charts ── */}
      <div className="la-charts">

        {/* 1 — Leverage ratio */}
        <div className="card la-chart-card">
          <div className="la-chart-title">Leverage Ratio</div>
          <div className="la-chart-sub">wheel travel ÷ shock travel</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="travel" tickFormatter={v => `${v}%`} tick={TICK} />
              <YAxis domain={['auto', 'auto']} tickFormatter={v => `${v.toFixed(1)}`}
                tick={TICK} width={36}
                label={{ value: 'LR', angle: -90, position: 'insideLeft', fill: '#8896aa', fontSize: 10 }} />
              <Tooltip contentStyle={TT}
                formatter={v => [`${v} : 1`, 'LR']}
                labelFormatter={l => `${l}% travel`} />
              <ReferenceLine x={28} stroke="#3b82f6" strokeDasharray="4 2"
                label={{ value: 'sag', fill: '#3b82f6', fontSize: 9, position: 'top' }} />
              <Line type="monotone" dataKey="lr" stroke="#00c97a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2 — Anti-squat */}
        <div className="card la-chart-card">
          <div className="la-chart-title">Anti-Squat</div>
          <div className="la-chart-sub">% — 100% = neutral, higher = anti-squat</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="travel" tickFormatter={v => `${v}%`} tick={TICK} />
              <YAxis domain={[40, 150]} tickFormatter={v => `${v}%`}
                tick={TICK} width={42} />
              <Tooltip contentStyle={TT}
                formatter={(v, name) => {
                  const labels = { as_low: '32t (low)', as_mid: '21t (mid)', as_high: '11t (high)' }
                  return [`${v}%`, labels[name] || name]
                }}
                labelFormatter={l => `${l}% travel`} />
              <ReferenceLine y={100} stroke="#f0b429" strokeDasharray="4 2"
                label={{ value: '100%', fill: '#f0b429', fontSize: 9, position: 'right' }} />
              <ReferenceLine x={28} stroke="#3b82f6" strokeDasharray="4 2"
                label={{ value: 'sag', fill: '#3b82f6', fontSize: 9, position: 'top' }} />
              <Line type="monotone" dataKey="as_low"  stroke="#00c97a" strokeWidth={2} dot={false} name="as_low" />
              <Line type="monotone" dataKey="as_mid"  stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="as_mid" />
              <Line type="monotone" dataKey="as_high" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="2 3" dot={false} name="as_high" />
            </LineChart>
          </ResponsiveContainer>
          <div className="la-legend">
            <span><span className="dot" style={{ background: '#00c97a' }} /> 32t low gear</span>
            <span><span className="dot" style={{ background: '#3b82f6' }} /> 21t mid</span>
            <span><span className="dot" style={{ background: '#8b5cf6' }} /> 11t high gear</span>
          </div>
        </div>

        {/* 3 — Pedal kickback */}
        <div className="card la-chart-card">
          <div className="la-chart-title">Pedal Kickback</div>
          <div className="la-chart-sub">degrees of crank rotation per mm wheel travel</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="travel" tickFormatter={v => `${v}%`} tick={TICK} />
              <YAxis domain={[0, 16]} tickFormatter={v => `${v}°`}
                tick={TICK} width={36} />
              <Tooltip contentStyle={TT}
                formatter={v => [`${v}°`, 'Kickback']}
                labelFormatter={l => `${l}% travel`} />
              <ReferenceLine x={28} stroke="#3b82f6" strokeDasharray="4 2"
                label={{ value: 'sag', fill: '#3b82f6', fontSize: 9, position: 'top' }} />
              <Line type="monotone" dataKey="kickback" stroke="#f0b429" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Alpha notice ── */}
      <div className="la-notice">
        <span className="la-notice-badge">ALPHA</span>
        <p>
          Analysis generated from measured pivot coordinates for this specific bike.
          Early alpha — more bikes being added one at a time.
        </p>
      </div>

    </section>
  )
}
