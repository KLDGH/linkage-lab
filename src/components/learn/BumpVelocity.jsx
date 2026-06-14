import { useState, useMemo, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ── Model ──────────────────────────────────────────────────────────
// A wheel rolls over a bump of fixed HEIGHT. The wheel can't penetrate
// the ground, so its center follows the "envelope" of the bump. The
// suspension compression is how far that center rises above flat-ground
// height; suspension velocity is the rate of that rise × vehicle speed.
//
// The three shapes share a height but differ in width — a square edge is
// sharp and narrow, a rounded bump is wide and gradual. Same height, very
// different velocity: that's the whole lesson.

const H = 65 // bump height, mm — identical for all three shapes

const SHAPES = [
  { id: 'square',  label: 'Square edge', w: 110, tip: 'A sharp ledge — curb, root, or square rock.' },
  { id: 'ramped',  label: 'Ramped',      w: 190, tip: 'Straight slopes — a kicker or table.' },
  { id: 'rounded', label: 'Rounded',     w: 340, tip: 'A wide, smooth hump — water bar or roller.' },
]
const MAX_HALF = 170 // half of widest bump — keeps the scene framing stable

const WHEELS = [
  { id: 'sm', label: 'Small', R: 180 },
  { id: 'md', label: 'Medium', R: 240 },
  { id: 'lg', label: 'Large', R: 320 },
]

function groundHeight(x, shape, w) {
  const half = w / 2
  if (Math.abs(x) > half) return 0
  if (shape === 'square') return H
  if (shape === 'ramped') return H * (1 - Math.abs(x) / half)
  return H * 0.5 * (1 + Math.cos(Math.PI * x / half)) // rounded
}

// Highest point the wheel of radius R touches when its center is at xc
function wheelCenterHeight(xc, R, shape, w) {
  let maxY = R
  const step = 2
  for (let x = xc - R; x <= xc + R; x += step) {
    const dx = x - xc
    const under = R * R - dx * dx
    if (under <= 0) continue
    const y = groundHeight(x, shape, w) + Math.sqrt(under)
    if (y > maxY) maxY = y
  }
  return maxY
}

function buildTrace(shape, w, R, speedKmh) {
  const speedMs = speedKmh / 3.6
  const speedMmS = (speedKmh * 1e6) / 3600
  const xMin = -(MAX_HALF + R + 40)
  const xMax = -xMin
  const N = 180
  const xs = [], comp = []
  for (let i = 0; i <= N; i++) {
    const xc = xMin + ((xMax - xMin) * i) / N
    xs.push(xc)
    comp.push(wheelCenterHeight(xc, R, shape, w) - R)
  }
  const data = []
  for (let i = 0; i <= N; i++) {
    const im = Math.max(0, i - 1), ip = Math.min(N, i + 1)
    const slope = (comp[ip] - comp[im]) / (xs[ip] - xs[im]) // mm/mm
    const vel = slope * speedMs // m/s (compression +, rebound −)
    const t = ((xs[i] - xs[0]) / speedMmS) * 1000 // ms
    data.push({
      i, xc: xs[i],
      t: parseFloat(t.toFixed(1)),
      pos: parseFloat(comp[i].toFixed(1)),
      vel: parseFloat(vel.toFixed(2)),
    })
  }
  return data
}

const TICK = { fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }
const TT = { background: '#1c1814', border: '1px solid #3a3530', fontFamily: 'JetBrains Mono', fontSize: 11 }

const DURATION = 5800 // ms playback (slowed so you can watch)

export default function BumpVelocity() {
  const [shapeId, setShapeId] = useState('square')
  const [wheel, setWheel] = useState('md')
  const [speed, setSpeed] = useState(18) // km/h
  const [playing, setPlaying] = useState(true)
  const [k, setK] = useState(0)

  const shapeDef = SHAPES.find((s) => s.id === shapeId)
  const w = shapeDef.w
  const R = WHEELS.find((wh) => wh.id === wheel).R
  const data = useMemo(() => buildTrace(shapeId, w, R, speed), [shapeId, w, R, speed])
  const N = data.length - 1

  // Geometry for the SVG scene. We crop the top of the wheel (only the lower
  // portion matters) so the bump and the wheel's vertical movement read clearly.
  const xMin = -(MAX_HALF + R + 40)
  const xMax = -xMin
  const worldW = xMax - xMin
  const worldH = R + H + 60

  const rafRef = useRef()
  const startRef = useRef(null)
  useEffect(() => {
    if (!playing) return
    let mounted = true
    const tick = (ts) => {
      if (!mounted) return
      if (startRef.current == null) startRef.current = ts
      const frac = (((ts - startRef.current) % DURATION) / DURATION)
      setK(Math.round(frac * N))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { mounted = false; cancelAnimationFrame(rafRef.current); startRef.current = null }
  }, [playing, N])

  const cur = data[Math.min(k, N)] || data[0]

  // Peak velocities for the current setting (for the comparison chips)
  const peakComp = useMemo(() => Math.max(...data.map((d) => d.vel)), [data])
  const peakReb = useMemo(() => Math.min(...data.map((d) => d.vel)), [data])
  const velMax = Math.max(0.5, Math.abs(peakComp), Math.abs(peakReb))

  // Ground path for the SVG — exact vertices so square/ramped edges are crisp
  const groundPath = useMemo(() => {
    const half = w / 2
    let verts
    if (shapeId === 'square') {
      verts = [[xMin, 0], [-half, 0], [-half, H], [half, H], [half, 0], [xMax, 0]]
    } else if (shapeId === 'ramped') {
      verts = [[xMin, 0], [-half, 0], [0, H], [half, 0], [xMax, 0]]
    } else {
      verts = [[xMin, 0], [-half, 0]]
      const M = 48
      for (let i = 0; i <= M; i++) {
        const x = -half + (w * i) / M
        verts.push([x, groundHeight(x, 'rounded', w)])
      }
      verts.push([half, 0], [xMax, 0])
    }
    const pathPts = verts.map(([x, h]) => `${(x - xMin).toFixed(1)},${(worldH - h).toFixed(1)}`)
    return `M0,${worldH} L${pathPts.join(' L')} L${worldW},${worldH} Z`
  }, [shapeId, w, xMin, xMax, worldW, worldH])

  const cx = cur.xc - xMin
  const cy = worldH - (cur.pos + R)
  const compressing = cur.vel >= 0
  const moving = Math.abs(cur.vel) >= 0.05
  const velColor = !moving ? 'var(--text-dim)' : compressing ? '#00c97a' : '#f0b429'

  return (
    <div className="learn-body">

      {/* ── Controls ── */}
      <div className="learn-controls">
        <div className="learn-control-group">
          <span className="learn-control-label">Bump shape</span>
          <div className="choice-tabs">
            {SHAPES.map((s) => (
              <button key={s.id} title={s.tip}
                className={`choice-tab ${shapeId === s.id ? 'choice-tab-active' : ''}`}
                onClick={() => setShapeId(s.id)}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="learn-control-group">
          <span className="learn-control-label">Wheel size</span>
          <div className="choice-tabs">
            {WHEELS.map((wh) => (
              <button key={wh.id}
                className={`choice-tab ${wheel === wh.id ? 'choice-tab-active' : ''}`}
                onClick={() => setWheel(wh.id)}>{wh.label}</button>
            ))}
          </div>
        </div>
        <div className="learn-control-group" style={{ flex: 1, minWidth: 180 }}>
          <span className="learn-control-label">Speed · {speed} km/h</span>
          <input type="range" min={8} max={45} step={1} value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="learn-speed-slider" />
        </div>
        <button className="learn-play-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      </div>

      {/* ── Scene ── */}
      <div className="card learn-card">
        <div className="learn-scene">
          <svg viewBox={`0 0 ${worldW} ${worldH}`} preserveAspectRatio="xMidYMid meet" className="learn-svg">
            {/* flat-ground reference (where the wheel center sits with no bump) */}
            <line x1={0} y1={worldH - R} x2={worldW} y2={worldH - R}
              stroke="#8896aa" strokeDasharray="7 5" strokeWidth={1.5} strokeOpacity={0.85} />
            <text x={8} y={worldH - R - 7} fill="#8896aa" fontSize={12} fontFamily="JetBrains Mono">
              rest height (flat ground)
            </text>
            {/* ground + bump */}
            <path d={groundPath} fill="#d9d3ca" stroke="#a89f92" strokeWidth={1.5} />
            {/* compression indicator: how far the center has risen */}
            {cur.pos > 0.5 && (
              <line x1={cx} y1={worldH - R} x2={cx} y2={cy}
                stroke={velColor} strokeWidth={3} strokeOpacity={0.5} />
            )}
            {/* wheel (top cropped by the viewBox) */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--text-bright)" strokeWidth={6} />
            <circle cx={cx} cy={cy} r={R * 0.13} fill="var(--text-bright)" />
            <circle cx={cx} cy={cy} r={7} fill={velColor} />
          </svg>
          <div className="learn-readout">
            <div className="learn-readout-item">
              <span className="learn-readout-label">Compression</span>
              <span className="learn-readout-val">{Math.round(cur.pos)} mm</span>
            </div>
            <div className="learn-readout-item">
              <span className="learn-readout-label">Suspension velocity</span>
              <span className="learn-readout-val" style={{ color: velColor }}>
                {cur.vel >= 0 ? '+' : ''}{cur.vel.toFixed(2)} m/s
              </span>
              <span className="learn-readout-sub" style={{ color: velColor }}>
                {!moving ? 'still' : compressing ? 'compressing' : 'rebounding'}
              </span>
            </div>
          </div>
        </div>

        {/* peak comparison chips */}
        <div className="learn-peaks">
          <span className="learn-peak">
            Peak compression velocity:&nbsp;
            <strong style={{ color: '#00c97a' }}>{peakComp.toFixed(2)} m/s</strong>
          </span>
          <span className="learn-peak">
            Peak rebound velocity:&nbsp;
            <strong style={{ color: '#f0b429' }}>{peakReb.toFixed(2)} m/s</strong>
          </span>
          <span className="learn-peak learn-peak-hint">Change the shape, wheel size, or speed to compare.</span>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="card learn-card" style={{ marginTop: 12 }}>
        <div className="chart-pair">
          <div>
            <div className="chart-pair-title">Suspension Position</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 14, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
                <XAxis dataKey="t" tickFormatter={(v) => `${Math.round(v)}`} tick={TICK}
                  label={{ value: 'time (ms)', position: 'insideBottom', offset: -4, fill: '#8896aa', fontSize: 9 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v)}`} tick={TICK} width={34}
                  label={{ value: 'mm', position: 'insideTopLeft', offset: 2, fill: '#8896aa', fontSize: 9 }} />
                <RechartTooltip contentStyle={TT}
                  formatter={(v) => [`${v} mm`, 'Compression']} labelFormatter={(l) => `${l} ms`} />
                <ReferenceLine x={cur.t} stroke="var(--text-dim)" strokeWidth={1} />
                <Line type="monotone" dataKey="pos" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="chart-pair-title">Suspension Velocity · what the damper responds to</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 14, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
                <XAxis dataKey="t" tickFormatter={(v) => `${Math.round(v)}`} tick={TICK}
                  label={{ value: 'time (ms)', position: 'insideBottom', offset: -4, fill: '#8896aa', fontSize: 9 }} />
                <YAxis domain={[-velMax * 1.1, velMax * 1.1]} tickFormatter={(v) => v.toFixed(1)} tick={TICK} width={34}
                  label={{ value: 'm/s', position: 'insideTopLeft', offset: 2, fill: '#8896aa', fontSize: 9 }} />
                <RechartTooltip contentStyle={TT}
                  formatter={(v) => [`${v} m/s`, v >= 0 ? 'Compression' : 'Rebound']} labelFormatter={(l) => `${l} ms`} />
                <ReferenceLine y={0} stroke="#a89f92" strokeWidth={1} />
                <ReferenceLine x={cur.t} stroke="var(--text-dim)" strokeWidth={1} />
                <Line type="monotone" dataKey="vel" stroke="#00c97a" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Takeaway ── */}
      <div className="learn-takeaway">
        <div className="learn-takeaway-title">What this means for your setup</div>
        <ul>
          <li><strong>Diagnose by velocity, not by travel.</strong> Where a problem appears in the stroke matters less than how fast the suspension was moving when it happened. Velocity is what the damper responds to.</li>
          <li><strong>Square-edged hits produce high velocities.</strong> Roots, rocks, and curbs are governed by high-speed compression damping. If the bike feels harsh on sharp impacts but composed elsewhere, reduce high-speed compression rather than adding spring rate or low-speed damping.</li>
          <li><strong>Gradual loads produce low velocities.</strong> Braking dive, berms, weight transfer, and g-outs are governed by low-speed compression damping. High-speed adjusters have little effect on them.</li>
          <li><strong>Speed and wheel size shift the whole range.</strong> Riding faster, or running smaller wheels, raises the velocity of every bump. A setup that feels balanced at a moderate pace can become harsh as speed or terrain severity increases.</li>
          <li><strong>This is why dampers separate low- and high-speed adjustment.</strong> Identify the type of terrain where the bike misbehaves, then adjust the circuit that operates in that velocity range.</li>
        </ul>
      </div>
    </div>
  )
}
