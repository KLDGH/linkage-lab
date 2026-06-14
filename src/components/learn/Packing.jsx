import { useState, useMemo, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ── Model ──────────────────────────────────────────────────────────
// A sprung mass on a spring + damper, driven by a train of bumps:
//   m·r″ + c·r′ + k·r = −m·u″
// r is the chassis position relative to the wheel (deviation from static
// sag); u(t) is the bump train under the wheel. Damping is asymmetric —
// compression damping is fixed, rebound damping is the slider. Travel used
// = sag − r. If rebound is too slow, the suspension can't return to sag
// before the next hit, so it rides progressively deeper — packing.

const M = 80                       // sprung mass (kg)
const K = 21800                    // spring rate (N/m) → sag below
const SQRT_KM = Math.sqrt(K * M)
const C_COMP = 2 * 0.30 * SQRT_KM  // fixed moderate compression damping
const SAG = (M * 9.81 / K) * 1000  // mm
const TOTAL = 120                  // mm of travel
const NAT_MS = 2 * Math.PI * Math.sqrt(M / K) * 1000

const BUMP_H = 0.045   // m
const BUMP_W = 0.15    // m (physical width)
const BUMP_SP = 0.55   // m (spacing between bump centers)
const N_BUMPS = 9
const T0 = 0.3         // s before first bump (let it settle at sag)
const T_END = 2.6

function zetaToC(z) { return 2 * z * SQRT_KM }

// ground acceleration u″(t) from the raised-cosine bump train
function makeBumps(v) {
  const d = BUMP_W / v
  const T = BUMP_SP / v
  const centers = Array.from({ length: N_BUMPS }, (_, i) => T0 + i * T)
  const uddot = (t) => {
    let a = 0
    for (const ti of centers) {
      const dt = t - ti
      if (dt >= 0 && dt <= d) a += BUMP_H * 0.5 * Math.pow((2 * Math.PI) / d, 2) * Math.cos((2 * Math.PI * dt) / d)
    }
    return a
  }
  const uval = (t) => {
    let h = 0
    for (const ti of centers) {
      const dt = t - ti
      if (dt >= 0 && dt <= d) h += BUMP_H * 0.5 * (1 - Math.cos((2 * Math.PI * dt) / d))
    }
    return h * 1000 // mm
  }
  return { d, T, centers, uddot, uval }
}

function simulate(zReb, v) {
  const cReb = zetaToC(zReb)
  const bumps = makeBumps(v)
  const dt = 0.0002
  let r = 0, rd = 0
  const raw = []
  for (let t = 0; t <= T_END + 1e-9; t += dt) {
    const c = rd > 0 ? cReb : C_COMP // rd>0 ⇒ extending (rebound)
    const rdd = (-M * bumps.uddot(t) - c * rd - K * r) / M
    rd += rdd * dt
    r += rd * dt
    raw.push({ t, travel: SAG - r * 1000, u: bumps.uval(t) })
  }

  // travel just before each bump (skip the first — it starts from sag)
  const before = bumps.centers.slice(1).map((tb) => {
    const p = raw.find((q) => q.t >= tb - 0.004)
    return p ? p.travel : SAG
  })
  const avgBefore = before.reduce((a, b) => a + b, 0) / before.length
  const peak = Math.max(...raw.map((p) => p.travel))
  const bottomed = peak >= TOTAL

  let verdict
  if (bottomed) verdict = 'bottoming'
  else if (avgBefore > SAG * 1.25) verdict = 'packing'
  else if (avgBefore < SAG * 0.8) verdict = 'skipping'
  else verdict = 'balanced'

  // downsample for charts
  const STEP = 13
  const data = raw.filter((_, i) => i % STEP === 0).map((p) => ({
    t: parseFloat(p.t.toFixed(3)), // seconds
    travel: parseFloat(Math.max(0, p.travel).toFixed(1)),
    u: parseFloat(p.u.toFixed(1)),
  }))
  return { raw, data, avgBefore, peak, bottomed, verdict, bumps }
}

const VERDICTS = {
  skipping:  { label: 'Wheel skipping', color: '#f0b429', note: 'Rebound too fast — the suspension springs back past sag and the wheel gets light between hits, losing traction.' },
  balanced:  { label: 'Returning to sag', color: '#00c97a', note: 'Rebound is matched to the terrain — the suspension recovers to sag just in time for the next hit, ready with full travel.' },
  packing:   { label: 'Packing down', color: '#e8743b', note: 'Rebound too slow — the suspension can\'t recover between hits, so it rides progressively deeper and runs out of usable travel.' },
  bottoming: { label: 'Packed to bottom-out', color: '#dc4a3d', note: 'Rebound far too slow — the suspension packs all the way down and bottoms, with no travel left to absorb the next hit.' },
}

const TICK = { fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }
const TT = { background: '#1c1814', border: '1px solid #3a3530', fontFamily: 'JetBrains Mono', fontSize: 11 }
const DURATION = 8200 // ms playback (slowed so the bumps don't blast past)

// scene scaling
const PXMM = 0.62
const BASE_Y = 250
const WHEEL_R = 26
const FREE_PX = 150 * PXMM
const CHASSIS_X = 150
const SCENE_W = 680
const SCENE_H = 290
const SCENE_PX_PER_M = 250 // scene px per metre of trail (speed-independent shape)

// Physical bump profile in trail space (mm height at trail position p metres).
// Bump i hit at time T0+i·T sits at trail position v·(T0+i·T) = v·T0 + i·BUMP_SP,
// so the shape is identical at any speed — only the scroll rate changes.
function groundHeightPhys(p, v) {
  for (let i = 0; i < N_BUMPS; i++) {
    const pStart = v * T0 + i * BUMP_SP
    const dp = p - pStart
    if (dp >= 0 && dp <= BUMP_W) return BUMP_H * 1000 * 0.5 * (1 - Math.cos((2 * Math.PI * dp) / BUMP_W))
  }
  return 0
}

export default function Packing() {
  const [zReb, setZReb] = useState(0.30)
  const [speed, setSpeed] = useState(4.0) // m/s
  const [playing, setPlaying] = useState(true)
  const [tNow, setTNow] = useState(0)

  const sim = useMemo(() => simulate(zReb, speed), [zReb, speed])

  const rafRef = useRef()
  const startRef = useRef(null)
  useEffect(() => {
    if (!playing) return
    let mounted = true
    const tick = (ts) => {
      if (!mounted) return
      if (startRef.current == null) startRef.current = ts
      const frac = (((ts - startRef.current) % DURATION) / DURATION)
      setTNow(frac * T_END)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { mounted = false; cancelAnimationFrame(rafRef.current); startRef.current = null }
  }, [playing])

  // interpolate current travel + bump height at tNow
  const idx = Math.min(sim.raw.length - 1, Math.max(0, Math.round(tNow / 0.0002)))
  const curTravel = sim.raw[idx]?.travel ?? SAG
  const curU = sim.raw[idx]?.u ?? 0
  const tSec = parseFloat(tNow.toFixed(3))

  const v = VERDICTS[sim.verdict]
  const reserve = Math.max(0, TOTAL - curTravel)

  // scene geometry
  const wheelAxleY = BASE_Y - WHEEL_R - curU * PXMM
  const chassisY = wheelAxleY - (FREE_PX - curTravel * PXMM)
  const chassisSagY = BASE_Y - WHEEL_R - (FREE_PX - SAG * PXMM)

  // scrolling ground in trail space: scene x → trail position → bump height.
  // Bump shape stays constant at any speed; faster just scrolls the trail faster.
  const groundPath = useMemo(() => {
    const wheelPos = speed * tNow // metres of trail travelled
    const pts = []
    for (let x = 0; x <= SCENE_W; x += 3) {
      const p = wheelPos + (x - CHASSIS_X) / SCENE_PX_PER_M
      const h = groundHeightPhys(p, speed)
      pts.push(`${x},${(BASE_Y - h * PXMM).toFixed(1)}`)
    }
    return `M0,${SCENE_H} L${pts.join(' L')} L${SCENE_W},${SCENE_H} Z`
  }, [tNow, speed])

  // spring zigzag between chassis underside and wheel axle
  const springPath = useMemo(() => {
    const top = chassisY + 10
    const bot = wheelAxleY
    const coils = 6
    const seg = (bot - top) / coils
    let p = `M${CHASSIS_X},${top.toFixed(1)}`
    for (let i = 0; i < coils; i++) {
      const y1 = top + seg * (i + 0.5)
      const y2 = top + seg * (i + 1)
      const dir = i % 2 === 0 ? 14 : -14
      p += ` L${CHASSIS_X + dir},${y1.toFixed(1)} L${CHASSIS_X},${y2.toFixed(1)}`
    }
    return p
  }, [chassisY, wheelAxleY])

  return (
    <div className="learn-body">

      {/* ── Controls ── */}
      <div className="learn-controls">
        <div className="learn-control-group" style={{ flex: 1, minWidth: 220 }}>
          <span className="learn-control-label">Rebound damping · {zReb < 0.22 ? 'fast' : zReb > 0.55 ? 'slow' : 'medium'}</span>
          <input type="range" min={0.1} max={0.95} step={0.01} value={zReb}
            onChange={(e) => setZReb(parseFloat(e.target.value))} className="learn-speed-slider" />
          <div className="learn-slider-ends"><span>faster return</span><span>slower return</span></div>
        </div>
        <div className="learn-control-group" style={{ flex: 1, minWidth: 180 }}>
          <span className="learn-control-label">Speed · {(speed * 3.6).toFixed(0)} km/h</span>
          <input type="range" min={2.5} max={6.5} step={0.1} value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))} className="learn-speed-slider" />
          <div className="learn-slider-ends"><span>fewer hits/sec</span><span>more hits/sec</span></div>
        </div>
        <div className="learn-control-group">
          <span className="learn-control-label">Presets</span>
          <div className="choice-tabs">
            <button className="choice-tab" onClick={() => setZReb(0.13)}>Too fast</button>
            <button className="choice-tab" onClick={() => setZReb(0.30)}>Balanced</button>
            <button className="choice-tab" onClick={() => setZReb(0.85)}>Too slow</button>
          </div>
        </div>
        <button className="learn-play-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      </div>

      {/* ── Scene ── */}
      <div className="card learn-card">
        <div className="learn-scene">
          <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="xMidYMid meet" className="learn-svg">
            {/* sag reference line for the chassis */}
            <line x1={0} y1={chassisSagY} x2={SCENE_W} y2={chassisSagY}
              stroke="#3b82f6" strokeDasharray="6 5" strokeWidth={1} strokeOpacity={0.8} />
            <text x={SCENE_W - 6} y={chassisSagY - 6} textAnchor="end"
              fill="#3b82f6" fontSize={11} fontFamily="JetBrains Mono">chassis at sag</text>
            {/* ground + bumps */}
            <path d={groundPath} fill="#d9d3ca" stroke="#a89f92" strokeWidth={1.5} />
            {/* spring */}
            <path d={springPath} fill="none" stroke="var(--text-dim)" strokeWidth={3} />
            {/* chassis bar */}
            <rect x={CHASSIS_X - 95} y={chassisY - 20} width={190} height={22} rx={4}
              fill="var(--text-bright)" />
            <rect x={CHASSIS_X - 8} y={chassisY} width={16} height={12} fill="var(--text-bright)" />
            {/* wheel */}
            <circle cx={CHASSIS_X} cy={wheelAxleY} r={WHEEL_R} fill="none" stroke="var(--text-bright)" strokeWidth={5} />
            <circle cx={CHASSIS_X} cy={wheelAxleY} r={4} fill="var(--text-bright)" />
          </svg>
          <div className="learn-readout">
            <div className="learn-readout-item">
              <span className="learn-readout-label">State</span>
              <span className="learn-readout-val" style={{ fontSize: 17, color: v.color }}>{v.label}</span>
            </div>
            <div className="learn-readout-item">
              <span className="learn-readout-label">Travel reserve</span>
              <span className="learn-readout-val">{Math.round(reserve)} mm</span>
              <span className="learn-readout-sub" style={{ color: 'var(--text-dim)' }}>of {TOTAL} mm</span>
            </div>
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak" style={{ flexBasis: '100%', fontFamily: 'var(--font, sans-serif)', color: v.color }}>{v.note}</span>
          <span className="learn-peak learn-peak-hint">Spring &amp; mass natural recovery ≈ {Math.round(NAT_MS)} ms · bump interval ≈ {Math.round(sim.bumps.T * 1000)} ms</span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="card learn-card" style={{ marginTop: 12 }}>
        <div className="chart-pair-title">Travel Used Over a Series of Bumps · does it return to sag?</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={sim.data} margin={{ top: 14, right: 16, left: 4, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
            <XAxis dataKey="t" type="number" domain={[0, T_END]} ticks={[0, 0.5, 1, 1.5, 2, 2.5]}
              tickFormatter={(v2) => `${v2}s`} tick={TICK}
              label={{ value: 'time', position: 'insideBottom', offset: -8, fill: '#8896aa', fontSize: 10 }} />
            <YAxis reversed domain={[0, TOTAL + 8]} ticks={[0, 30, 60, 90, 120]}
              tickFormatter={(v2) => `${Math.round(v2)}`} tick={TICK} width={36}
              label={{ value: 'mm used', angle: -90, position: 'insideLeft', offset: 12, fill: '#8896aa', fontSize: 10 }} />
            <RechartTooltip contentStyle={TT}
              formatter={(v2) => [`${v2} mm used`, 'Travel']} labelFormatter={(l) => `${l}s`} />
            <ReferenceLine y={SAG} stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1.5} />
            <ReferenceLine y={TOTAL} stroke="#dc4a3d" strokeDasharray="5 4" strokeWidth={1.5} />
            <ReferenceLine x={tSec} stroke="var(--text-dim)" strokeWidth={1} />
            <Line type="monotone" dataKey="travel" stroke={v.color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <span><span className="dot" style={{ background: v.color }} /> Travel used</span>
          <span><span className="dot" style={{ background: '#3b82f6' }} /> Sag ({Math.round(SAG)} mm)</span>
          <span><span className="dot" style={{ background: '#dc4a3d' }} /> Bottom-out ({TOTAL} mm)</span>
        </div>
      </div>

      {/* ── Takeaway ── */}
      <div className="learn-takeaway">
        <div className="learn-takeaway-title">What this means for your setup</div>
        <ul>
          <li><strong>Rebound&apos;s job is to return the suspension to sag in time for the next hit.</strong> On a single bump almost any rebound setting works. The setting only reveals itself across repeated impacts, where the suspension has to recover before the next one arrives.</li>
          <li><strong>Too slow, and the suspension packs down.</strong> Each hit compresses it further than the last because it hasn&apos;t recovered. The bike rides deeper in its travel, feels harsher, and loses traction as the usable travel disappears. This is why a bike can feel fine on the first hit and terrible through a rock garden.</li>
          <li><strong>Too fast, and the wheel skips.</strong> The suspension springs back past sag, unloading the tire between hits. That feels lively but costs grip — the wheel is light exactly when you need it planted.</li>
          <li><strong>Faster terrain demands faster rebound.</strong> The closer together the hits, the less time the suspension has to recover — so rough, high-speed sections need quicker rebound than smooth trail. A rebound setting that&apos;s right for one rarely suits the other.</li>
          <li><strong>If a bike packs in repeated hits, speed up rebound before anything else.</strong> Riders often misread packing as too little compression or too soft a spring and stiffen the bike, which only makes it harsher. Match rebound to how fast the hits are coming.</li>
        </ul>
      </div>
    </div>
  )
}
