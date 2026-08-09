import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ── Model ──────────────────────────────────────────────────────────
// A pure single pivot, solved exactly. BB at the origin, main pivot a
// chosen height above it, swingarm from pivot to rear axle. The axle
// path is a circular arc around the pivot, chain growth is the change
// in BB→axle distance, and pedal kickback is that growth fed through
// the chainring. Routing the chain over an idler at the pivot makes
// pivot→axle the swingarm itself — constant length, zero growth. This
// is exact for single-pivot and high-pivot bikes; multi-link bikes sit
// between these curves because their instant center migrates.

const CS = 435        // chainstay length at rest, mm (BB to axle)
const TRAVEL = 160    // wheel travel, mm
const RING_R = 64.7   // 32t chainring radius, mm
const DEG = 180 / Math.PI

const PIVOT_PRESETS = [
  { id: 'low',  label: 'Low pivot',  h: 45 },
  { id: 'mid',  label: 'Mid pivot',  h: 90 },
  { id: 'high', label: 'High pivot', h: 150 },
]

// Rearward displacement of the axle at wheel height y for pivot height h.
// Positive = axle behind its starting point.
function rearAt(y, h) {
  const R2 = CS * CS + h * h
  return Math.sqrt(R2 - (y - h) * (y - h)) - CS
}

// Chain growth (BB→axle lengthening) at wheel height y. Closed form:
// d(y) = √(CS² + 2·h·y), so growth rises with pivot height.
function growthAt(y, h) {
  return Math.sqrt(CS * CS + 2 * h * y) - CS
}

function buildData(h) {
  const N = 32
  const pts = []
  for (let i = 0; i <= N; i++) {
    const y = (TRAVEL * i) / N
    const g = growthAt(y, h)
    pts.push({
      y: Math.round(y),
      rear: parseFloat(rearAt(y, h).toFixed(1)),
      rearLow: parseFloat(rearAt(y, PIVOT_PRESETS[0].h).toFixed(1)),
      rearHigh: parseFloat(rearAt(y, PIVOT_PRESETS[2].h).toFixed(1)),
      kickDirect: parseFloat((g / RING_R * DEG).toFixed(1)),
      kickIdler: 0,
    })
  }
  return pts
}

const TICK = { fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }
const TT = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 11 }

// scene geometry (SVG px). Scale 0.5 px/mm, bike faces right.
const S = 0.5
const SCENE_W = 640
const SCENE_H = 420
const GROUND_Y = 380
const WHEEL_R = 368 * S       // 29" wheel radius
const BB = { x: 400, y: GROUND_Y - WHEEL_R } // axle level with BB in the model

export default function AxlePath() {
  const [pivotH, setPivotH] = useState(90)
  const [idler, setIdler] = useState(false)
  const [scrub, setScrub] = useState(30) // % of travel

  const data = useMemo(() => buildData(pivotH), [pivotH])

  const yCur = (scrub / 100) * TRAVEL
  const rearCur = rearAt(yCur, pivotH)
  const growthCur = growthAt(yCur, pivotH)
  const kickCur = idler ? 0 : growthCur / RING_R * DEG

  // peaks
  const rearMax = Math.max(...data.map((d) => d.rear))
  const rearMaxY = data.find((d) => d.rear === rearMax)?.y ?? 0
  const growthEnd = growthAt(TRAVEL, pivotH)
  const kickEnd = growthEnd / RING_R * DEG

  // scene positions
  const pivot = { x: BB.x, y: BB.y - pivotH * S }
  const axle = { x: BB.x - (CS + rearCur) * S, y: BB.y - yCur * S }
  const pathTrace = data.map((d) => `${(BB.x - (CS + d.rear) * S).toFixed(1)},${(BB.y - d.y * S).toFixed(1)}`).join(' ')
  const ringR = RING_R * S
  const cogR = 26 // visual only
  const chainStart = { x: BB.x, y: BB.y - ringR }
  const chainEnd = { x: axle.x, y: axle.y - cogR }

  return (
    <div className="learn-body">

      {/* ── Controls ── */}
      <div className="learn-controls">
        <div className="learn-control-group" style={{ flex: 1, minWidth: 200 }}>
          <span className="learn-control-label">Main pivot height · {pivotH} mm above BB</span>
          <input type="range" min={20} max={180} step={5} value={pivotH}
            onChange={(e) => setPivotH(parseInt(e.target.value))} className="learn-speed-slider" />
          <div className="learn-slider-ends"><span>low, near the BB</span><span>high pivot</span></div>
        </div>
        <div className="learn-control-group">
          <span className="learn-control-label">Presets</span>
          <div className="choice-tabs">
            {PIVOT_PRESETS.map((p) => (
              <button key={p.id}
                className={`choice-tab ${pivotH === p.h ? 'choice-tab-active' : ''}`}
                onClick={() => setPivotH(p.h)}>{p.label} · {p.h}</button>
            ))}
          </div>
        </div>
        <div className="learn-control-group">
          <span className="learn-control-label">Chain routing</span>
          <div className="choice-tabs">
            <button className={`choice-tab ${!idler ? 'choice-tab-active' : ''}`}
              onClick={() => setIdler(false)}>Direct</button>
            <button className={`choice-tab ${idler ? 'choice-tab-active' : ''}`}
              onClick={() => setIdler(true)}>Over idler</button>
          </div>
        </div>
        <div className="learn-control-group" style={{ flex: 1, minWidth: 180 }}>
          <span className="learn-control-label">Compression · {Math.round(yCur)} mm ({scrub}%)</span>
          <input type="range" min={0} max={100} step={1} value={scrub}
            onChange={(e) => setScrub(parseInt(e.target.value))} className="learn-speed-slider" />
          <div className="learn-slider-ends"><span>topped out</span><span>bottom-out</span></div>
        </div>
      </div>

      {/* ── Scene ── */}
      <div className="card learn-card">
        <div className="learn-scene">
          <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="xMidYMid meet" className="learn-svg">
            {/* Ground + square edge. The frame is drawn fixed and the axle moves,
                so the ground has to follow the axle or the wheel floats above it
                at compression. Translating by the axle delta also makes the step
                visibly move down-and-back with a rearward path, which is the point. */}
            <g transform={`translate(${-rearCur * S}, ${-yCur * S})`}>
              <line x1={0} y1={GROUND_Y} x2={SCENE_W} y2={GROUND_Y} stroke="#a89f92" strokeWidth={2} />
              <rect x={295} y={GROUND_Y - 30} width={44} height={30} fill="#d9d3ca" stroke="#a89f92" strokeWidth={1.5} />
              {/* impact direction off the step corner */}
              <line x1={295} y1={GROUND_Y - 30} x2={262} y2={GROUND_Y - 63}
                stroke="#dc4a3d" strokeWidth={2} markerEnd="url(#ap-arrow)" />
              <text x={252} y={GROUND_Y - 70} textAnchor="end" fill="#dc4a3d" fontSize={11} fontFamily="JetBrains Mono">impact</text>
            </g>
            <defs>
              <marker id="ap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#dc4a3d" />
              </marker>
            </defs>
            {/* front-triangle hint */}
            <line x1={BB.x} y1={BB.y} x2={BB.x + 170} y2={BB.y - 85} stroke="var(--border)" strokeWidth={5} />
            <line x1={pivot.x} y1={pivot.y} x2={BB.x + 170} y2={BB.y - 85} stroke="var(--border)" strokeWidth={5} />
            {/* axle path trace */}
            <polyline points={pathTrace} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" strokeOpacity={0.8} />
            {/* swingarm */}
            <line x1={pivot.x} y1={pivot.y} x2={axle.x} y2={axle.y} stroke="var(--text-bright)" strokeWidth={6} strokeLinecap="round" />
            {/* seat-tube hint: BB up to pivot */}
            <line x1={BB.x} y1={BB.y} x2={pivot.x} y2={pivot.y} stroke="var(--text-dim)" strokeWidth={3} />
            {/* chain */}
            {idler ? (
              <>
                <line x1={chainStart.x} y1={chainStart.y} x2={pivot.x} y2={pivot.y - 10} stroke="#00c97a" strokeWidth={2.5} />
                <line x1={pivot.x} y1={pivot.y - 10} x2={chainEnd.x} y2={chainEnd.y} stroke="#00c97a" strokeWidth={2.5} />
                <circle cx={pivot.x} cy={pivot.y} r={10} fill="none" stroke="#00c97a" strokeWidth={2.5} />
              </>
            ) : (
              <line x1={chainStart.x} y1={chainStart.y} x2={chainEnd.x} y2={chainEnd.y} stroke="#e8743b" strokeWidth={2.5} />
            )}
            {/* chainring + BB */}
            <circle cx={BB.x} cy={BB.y} r={ringR} fill="none" stroke="var(--text-dim)" strokeWidth={2.5} />
            <circle cx={BB.x} cy={BB.y} r={5} fill="var(--text-bright)" />
            <text x={BB.x + ringR + 6} y={BB.y + 4} fill="var(--text-dim)" fontSize={11} fontFamily="JetBrains Mono">BB</text>
            {/* pivot */}
            <circle cx={pivot.x} cy={pivot.y} r={7} fill="var(--text-bright)" />
            <text x={pivot.x + 14} y={pivot.y + 4} fill="var(--text-dim)" fontSize={11} fontFamily="JetBrains Mono">pivot</text>
            {/* rear wheel + cassette + axle */}
            <circle cx={axle.x} cy={axle.y} r={WHEEL_R} fill="none" stroke="var(--text-bright)" strokeWidth={4} strokeOpacity={0.9} />
            <circle cx={axle.x} cy={axle.y} r={cogR} fill="none" stroke="var(--text-dim)" strokeWidth={2} />
            <circle cx={axle.x} cy={axle.y} r={5} fill="#3b82f6" />
          </svg>
          <div className="learn-readout">
            <div className="learn-readout-item">
              <span className="learn-readout-label">Axle offset</span>
              <span className="learn-readout-val" style={{ color: '#3b82f6' }}>
                {rearCur >= 0 ? '+' : '−'}{Math.abs(rearCur).toFixed(0)} mm
              </span>
              <span className="learn-readout-sub" style={{ color: 'var(--text-dim)' }}>
                {rearCur >= 0 ? 'rearward' : 'forward'} of start
              </span>
            </div>
            <div className="learn-readout-item">
              <span className="learn-readout-label">Pedal kickback</span>
              <span className="learn-readout-val" style={{ color: idler ? '#00c97a' : '#e8743b' }}>
                {kickCur.toFixed(0)}°
              </span>
              <span className="learn-readout-sub" style={{ color: 'var(--text-dim)' }}>
                {idler ? 'chain over idler' : 'chain direct · 32t'}
              </span>
            </div>
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">
            Max rearward:&nbsp;<strong style={{ color: '#3b82f6' }}>{rearMax.toFixed(0)} mm</strong>&nbsp;at {rearMaxY} mm travel
          </span>
          <span className="learn-peak">
            Chain growth at bottom-out:&nbsp;<strong>{growthEnd.toFixed(0)} mm</strong>
          </span>
          <span className="learn-peak">
            Kickback:&nbsp;<strong style={{ color: '#e8743b' }}>{kickEnd.toFixed(0)}°</strong> direct ·&nbsp;<strong style={{ color: '#00c97a' }}>0°</strong> over idler
          </span>
          <span className="learn-peak learn-peak-hint">
            Frame-fixed view, the way linkage software draws it: the wheel arcs up into the frame as the suspension compresses.
          </span>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="card learn-card" style={{ marginTop: 12 }}>
        <div className="chart-pair">
          <div>
            <div className="chart-pair-title">Axle Path · rearward travel vs compression</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 14, right: 14, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
                <XAxis dataKey="y" type="number" domain={[0, TRAVEL]} ticks={[0, 40, 80, 120, 160]}
                  tickFormatter={(v) => `${v}`} tick={TICK}
                  label={{ value: 'wheel travel (mm)', position: 'insideBottom', offset: -4, fill: '#8896aa', fontSize: 9 }} />
                <YAxis tickFormatter={(v) => `${v}`} tick={TICK} width={34}
                  label={{ value: 'mm rear', angle: -90, position: 'insideLeft', offset: 10, fill: '#8896aa', fontSize: 9 }} />
                <RechartTooltip contentStyle={TT}
                  formatter={(v, name) => name === 'rear' ? [`${v} mm ${v >= 0 ? 'rearward' : 'forward'}`, 'Axle'] : [null, null]}
                  labelFormatter={(l) => `${l} mm travel`} />
                <ReferenceLine y={0} stroke="#a89f92" strokeWidth={1} />
                <ReferenceLine x={Math.round(yCur)} stroke="var(--text-dim)" strokeWidth={1} />
                <Line type="monotone" dataKey="rearLow" stroke="#bbb" strokeWidth={1} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="rearHigh" stroke="#bbb" strokeWidth={1} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="rear" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <span><span className="dot" style={{ background: '#3b82f6' }} /> Your pivot</span>
              <span><span className="dot" style={{ background: '#bbb' }} /> Low / high presets</span>
            </div>
          </div>
          <div>
            <div className="chart-pair-title">Pedal Kickback · crank rotation vs compression</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 14, right: 14, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
                <XAxis dataKey="y" type="number" domain={[0, TRAVEL]} ticks={[0, 40, 80, 120, 160]}
                  tickFormatter={(v) => `${v}`} tick={TICK}
                  label={{ value: 'wheel travel (mm)', position: 'insideBottom', offset: -4, fill: '#8896aa', fontSize: 9 }} />
                <YAxis tickFormatter={(v) => `${v}°`} tick={TICK} width={38} />
                <RechartTooltip contentStyle={TT}
                  formatter={(v, name) => [`${v}°`, name === 'kickDirect' ? 'Chain direct' : 'Over idler']}
                  labelFormatter={(l) => `${l} mm travel`} />
                <ReferenceLine x={Math.round(yCur)} stroke="var(--text-dim)" strokeWidth={1} />
                <Line type="monotone" dataKey="kickDirect" stroke="#e8743b" strokeWidth={2}
                  strokeOpacity={idler ? 0.35 : 1} strokeDasharray={idler ? '5 4' : undefined} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="kickIdler" stroke="#00c97a" strokeWidth={2}
                  strokeOpacity={idler ? 1 : 0.35} strokeDasharray={idler ? undefined : '5 4'} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <span><span className="dot" style={{ background: '#e8743b' }} /> Chain direct</span>
              <span><span className="dot" style={{ background: '#00c97a' }} /> Over idler</span>
            </div>
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak learn-peak-hint">
            Kickback here is the low-gear worst case with the drivetrain engaged: crank rotation = chain growth ÷ chainring radius. Coasting with the freehub disengaged, you feel a fraction of it.
          </span>
        </div>
      </div>

      {/* ── Takeaway ── */}
      <div className="learn-takeaway">
        <div className="learn-takeaway-title">What this means for your setup</div>
        <ul>
          <li><strong>The pivot sets the path.</strong> The rear axle travels a circle around the main pivot. A pivot near the BB sends the wheel up and slightly forward; a high pivot sends it up and back. The axle moves rearward until it reaches pivot height, then curves forward again.</li>
          <li><strong>Rearward paths absorb square edges better.</strong> A square hit pushes the wheel up and back at the same time. When the axle path points the same way, the wheel gives with the hit. Module 01 showed square edges create the highest suspension velocities.</li>
          <li><strong>The bill is chain growth.</strong> A higher pivot stretches the BB-to-axle distance more through travel, and that growth turns the cranks backward through the chain. Deep in the travel on a high pivot, that reaches tens of degrees in a low gear. You feel it as pedals tugging back through rough sections.</li>
          <li><strong>Idlers are the geometric fix.</strong> Route the chain over a pulley at the pivot and the chain path length stays constant through the whole stroke, so kickback goes to zero. The price is drivetrain drag and an extra pulley to service. That is why high-pivot bikes carry idlers.</li>
          <li><strong>Read marketing claims by magnitude.</strong> Many conventional bikes advertise a rearward axle path that amounts to 3–8 mm early in the travel. A true high pivot moves 15–30 mm rearward. Same words on the spec sheet, different order of effect on the trail.</li>
          <li><strong>Scope.</strong> This model is a pure single pivot, exact for single-pivot and high-pivot bikes. Multi-link bikes have a migrating instant center, so their paths and kickback sit between these curves. Anti-squat, the chain force that resists bobbing under power, comes from the same chain-line geometry and gets its own module.</li>
        </ul>
      </div>
    </div>
  )
}
