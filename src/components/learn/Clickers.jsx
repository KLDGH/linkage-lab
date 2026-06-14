import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ReferenceArea, ReferenceDot, ResponsiveContainer,
} from 'recharts'

// ── Model ──────────────────────────────────────────────────────────
// A damper's force–velocity curve. Each side (compression right, rebound
// left) is bilinear: a low-speed slope up to a "blow-off" knee, then a
// high-speed slope beyond it. The four clickers each set one of those
// four slopes — that's the whole point. Force in N, velocity in m/s.

const VK = 0.3   // blow-off knee velocity (m/s) — splits low/high speed
const VMAX = 1.5 // chart range

// slider 0..1 → damping coefficient (N per m/s) for each circuit
const RANGE = {
  lsc: [250, 1500],
  hsc: [150, 950],
  lsr: [300, 1700],
  hsr: [180, 1100],
}
const coeff = (key, s) => RANGE[key][0] + s * (RANGE[key][1] - RANGE[key][0])

const CLICKERS = {
  lsc: {
    abbr: 'LSC', name: 'Low-speed compression', color: '#3b82f6', side: 'compression',
    zone: [0, VK],
    governs: 'Slow, deliberate loads — brake dive, berms, g-outs, pumping, and weight transfer.',
    tooMuch: 'Harsh over small bumps; the wheel deflects instead of absorbing, costing grip.',
    tooLittle: 'Vague and wallowy; the bike dives under braking and sinks in berms.',
  },
  hsc: {
    abbr: 'HSC', name: 'High-speed compression', color: '#2dd4bf', side: 'compression',
    zone: [VK, VMAX],
    governs: 'Sharp, sudden hits — square edges, roots, rocks, and hard landings.',
    tooMuch: 'Harsh on sharp impacts; the wheel skips across the tops of hits.',
    tooLittle: 'Blows through travel and bottoms hard on big hits.',
  },
  lsr: {
    abbr: 'LSR', name: 'Low-speed rebound', color: '#f0b429', side: 'rebound',
    zone: [-VK, 0],
    governs: 'How the bike settles and holds its ride height between hits and through turns.',
    tooMuch: 'Sits low and feels sluggish; slow to recover and packs over small bumps.',
    tooLittle: 'Springs back quickly — lively but loose, and hard to keep composed.',
  },
  hsr: {
    abbr: 'HSR', name: 'High-speed rebound', color: '#e8743b', side: 'rebound',
    zone: [-VMAX, -VK],
    governs: 'Recovery after big compressions — this is the packing circuit from module 02.',
    tooMuch: 'Packs down through repeated big hits; rides deep and harsh.',
    tooLittle: 'Kicks and bucks after big hits, throwing the bike off line.',
  },
}

// common riding moments placed at the velocity they roughly produce.
// compression (right) = bumps you hit; rebound (left) = the return stroke.
const MOMENTS = [
  { label: 'brake dive', v: 0.08 },
  { label: 'berm', v: 0.2 },
  { label: 'root', v: 0.55 },
  { label: 'square rock', v: 1.05 },
  { label: 'settling', v: -0.18 },
  { label: 'recovery after a big hit', v: -0.95 },
]

function forceAt(v, c) {
  if (v >= 0) return c.lsc * Math.min(v, VK) + c.hsc * Math.max(0, v - VK)
  const a = -v
  return -(c.lsr * Math.min(a, VK) + c.hsr * Math.max(0, a - VK))
}

const TICK = { fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }
const TT = { background: '#1c1814', border: '1px solid #3a3530', fontFamily: 'JetBrains Mono', fontSize: 11 }

function ClickerSlider({ id, value, onChange, onFocus, active }) {
  const def = CLICKERS[id]
  return (
    <div className={`clicker-slider ${active ? 'clicker-slider-active' : ''}`}
      style={active ? { borderColor: def.color } : {}}
      onMouseDown={onFocus}>
      <div className="clicker-slider-head">
        <span className="clicker-abbr" style={{ color: def.color }}>{def.abbr}</span>
        <span className="clicker-name">{def.name}</span>
        <span className="clicker-val">{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onFocus={onFocus}
        className="learn-speed-slider"
        style={{ accentColor: def.color }} />
    </div>
  )
}

export default function Clickers() {
  const [lsc, setLsc] = useState(0.45)
  const [hsc, setHsc] = useState(0.45)
  const [lsr, setLsr] = useState(0.5)
  const [hsr, setHsr] = useState(0.5)
  const [active, setActive] = useState('hsc')

  const c = useMemo(() => ({
    lsc: coeff('lsc', lsc), hsc: coeff('hsc', hsc),
    lsr: coeff('lsr', lsr), hsr: coeff('hsr', hsr),
  }), [lsc, hsc, lsr, hsr])

  const data = useMemo(() => {
    const pts = []
    for (let v = -VMAX; v <= VMAX + 1e-9; v += 0.025) {
      pts.push({ v: parseFloat(v.toFixed(3)), f: Math.round(forceAt(v, c)) })
    }
    return pts
  }, [c])

  const def = CLICKERS[active]
  const setters = { lsc: setLsc, hsc: setHsc, lsr: setLsr, hsr: setHsr }
  const values = { lsc, hsc, lsr, hsr }

  return (
    <div className="learn-body">

      {/* ── Controls ── */}
      <div className="clicker-controls">
        <div className="clicker-group">
          <div className="clicker-group-title">Compression</div>
          {['lsc', 'hsc'].map((id) => (
            <ClickerSlider key={id} id={id} value={values[id]} active={active === id}
              onChange={setters[id]} onFocus={() => setActive(id)} />
          ))}
        </div>
        <div className="clicker-group">
          <div className="clicker-group-title">Rebound</div>
          {['lsr', 'hsr'].map((id) => (
            <ClickerSlider key={id} id={id} value={values[id]} active={active === id}
              onChange={setters[id]} onFocus={() => setActive(id)} />
          ))}
        </div>
      </div>

      {/* ── Curve ── */}
      <div className="card learn-card">
        <div className="chart-pair-title">
          The Damper&apos;s Force–Velocity Curve · each clicker bends one zone
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 16, right: 18, left: 10, bottom: 22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
            {/* highlight the active clicker's zone */}
            <ReferenceArea x1={def.zone[0]} x2={def.zone[1]} fill={def.color} fillOpacity={0.1} />
            <XAxis dataKey="v" type="number" domain={[-VMAX, VMAX]}
              ticks={[-1.5, -1, -0.5, 0, 0.5, 1, 1.5]} tickFormatter={(v) => `${v}`} tick={TICK}
              label={{ value: '←  rebound      shaft velocity (m/s)      compression  →', position: 'insideBottom', offset: -10, fill: '#8896aa', fontSize: 10 }} />
            <YAxis domain={[-2000, 2000]} ticks={[-1800, -900, 0, 900, 1800]}
              tickFormatter={(v) => { const a = Math.abs(v); return a < 50 ? 'soft' : a > 1400 ? 'firm' : '' }}
              tick={TICK} width={46} />
            <RechartTooltip contentStyle={TT}
              formatter={(val) => { const a = Math.abs(val); const feel = a > 1300 ? 'firm' : a > 500 ? 'moderate' : 'soft'; return [`${feel} (${val >= 0 ? 'compression' : 'rebound'})`, 'Push-back'] }}
              labelFormatter={(l) => `${l} m/s`} />
            {/* blow-off knees (low/high split) */}
            <ReferenceLine x={VK} stroke="#a89f92" strokeDasharray="4 4" />
            <ReferenceLine x={-VK} stroke="#a89f92" strokeDasharray="4 4" />
            <ReferenceLine x={0} stroke="#6b6259" strokeWidth={1} />
            <ReferenceLine y={0} stroke="#6b6259" strokeWidth={1} />
            {/* riding-moment markers: compression on the right, rebound on the left */}
            {MOMENTS.map((t) => (
              <ReferenceDot key={t.label} x={t.v} y={forceAt(t.v, c)} r={3.5}
                fill="var(--text-bright)" stroke="none"
                label={{ value: t.label, position: t.v >= 0 ? 'top' : 'bottom', fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
            ))}
            <Line type="monotone" dataKey="f" stroke="var(--text-bright)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="clicker-legend">
          <strong style={{ color: 'var(--text-bright)' }}>Reading it as feel:</strong> the height of the curve is how hard the
          suspension pushes back at that bump speed — higher is firmer and more supportive but harsher; lower is softer and
          more plush but quicker to dive or bottom. Each clicker sets the steepness of its own zone. The dashed lines are the
          blow-off knee, where the shim stack opens and the high-speed circuit takes over.
        </div>
      </div>

      {/* ── Active clicker readout ── */}
      <div className="card learn-card clicker-readout" style={{ marginTop: 12, borderColor: def.color }}>
        <div className="clicker-readout-head">
          <span className="clicker-readout-abbr" style={{ background: def.color }}>{def.abbr}</span>
          <span className="clicker-readout-name">{def.name}</span>
          <span className="clicker-readout-zone">{def.side} · {(active === 'lsc' || active === 'lsr') ? 'low' : 'high'}-speed</span>
        </div>
        <div className="clicker-readout-grid">
          <div>
            <span className="clicker-readout-label">Governs</span>
            <p>{def.governs}</p>
          </div>
          <div>
            <span className="clicker-readout-label" style={{ color: '#dc4a3d' }}>Too much</span>
            <p>{def.tooMuch}</p>
          </div>
          <div>
            <span className="clicker-readout-label" style={{ color: '#e8a33b' }}>Too little</span>
            <p>{def.tooLittle}</p>
          </div>
        </div>
      </div>

      {/* ── Takeaway ── */}
      <div className="learn-takeaway">
        <div className="learn-takeaway-title">What this means for your setup</div>
        <ul>
          <li><strong>Four clickers, one curve.</strong> Low-speed adjusters set the slope near the centre; high-speed adjusters set the slope past the blow-off knee. Compression is the right half, rebound the left. Every adjustment you make is reshaping a piece of this one curve.</li>
          <li><strong>Match the clicker to the terrain.</strong> A problem on sharp, square hits lives at high velocity — reach for high-speed compression. A problem under braking or in berms lives at low velocity — that&apos;s low-speed. The markers show where common riding moments fall on the curve.</li>
          <li><strong>Low and high speed are nearly independent.</strong> Because the knee separates them, you can firm up big hits without making small bumps harsh, or calm a busy small-bump feel without giving up bottoming support. This is why quality dampers expose both.</li>
          <li><strong>Most riders run too much rebound.</strong> The setting with the most grip is usually faster than the one that feels most composed — a calm, planted feel often comes at the cost of traction. If in doubt, try a click or two faster than feels natural.</li>
          <li><strong>It ties back.</strong> Which velocities your terrain produces came from module 01; what happens when rebound can&apos;t recover between hits came from module 02. This curve is the map that connects the knob in your hand to both.</li>
        </ul>
      </div>
    </div>
  )
}
