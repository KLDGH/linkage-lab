import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { TICK, TT, GRID, AXIS_LABEL } from './chartStyle'
import { Slider, Choice, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// The same single pivot as the axle-path module (BB at the origin, axle
// level with it at rest, pivot straight above the BB), solved with the
// standard construction: find where the chain's pull line (the upper run,
// tangent to ring and cog) meets the line from the rear axle through the
// pivot; draw from the rear contact patch through that point to the front
// axle's vertical. Its height there, as a share of the center of gravity's
// height, is the anti-squat. 100% means pedaling neither squats nor lifts
// the rear. Exact for a single pivot, or a high pivot with no idler; multi-link
// bikes use their instant center instead of the pivot.

const CS = 435, R = 368, WB = 1250, H_COG = 1100, RING_R = 64.7, TRAVEL = 160
const FRONT_X = WB - CS
const COGS = [10, 21, 32, 42, 52]
const COG_COLORS = { 10: '#dc4a3d', 21: '#e8743b', 32: '#ca8a04', 42: '#0d9488', 52: '#3b82f6' }
const PIVOT_PRESETS = [{ id: 45, label: 'Low · 45' }, { id: 90, label: 'Mid · 90' }, { id: 150, label: 'High · 150' }]

const cogR = (t) => 12.7 / (2 * Math.sin(Math.PI / t))
const rearAt = (y, h) => Math.sqrt(CS * CS + h * h - (y - h) ** 2) - CS

function intersect(p, q, r, s) {
  const d = (p[0] - q[0]) * (r[1] - s[1]) - (p[1] - q[1]) * (r[0] - s[0])
  if (Math.abs(d) < 1e-9) return null
  const t = ((p[0] - r[0]) * (r[1] - s[1]) - (p[1] - r[1]) * (r[0] - s[0])) / d
  return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]
}

function solve(y, h, teeth) {
  const axle = [-(CS + rearAt(y, h)), y]
  const r2 = cogR(teeth)
  const L = Math.hypot(axle[0], axle[1]), phi = Math.atan2(axle[1], axle[0])
  const a = Math.acos((r2 - RING_R) / L)
  let th = phi + a
  if (Math.sin(th) < 0) th = phi - a // the upper run: normal pointing up
  const n = [Math.cos(th), Math.sin(th)]
  const p1 = [RING_R * n[0], RING_R * n[1]]
  const p2 = [axle[0] + r2 * n[0], axle[1] + r2 * n[1]]
  const pivot = [0, h]
  const x = intersect(p1, p2, axle, pivot)
  const contact = [axle[0], axle[1] - R]
  const front = x ? contact[1] + (x[1] - contact[1]) * (FRONT_X - contact[0]) / (x[0] - contact[0]) : contact[1]
  return { axle, p1, p2, pivot, x, contact, frontY: front, as: ((front - contact[1]) / H_COG) * 100, r2 }
}

export default function AntiSquat() {
  const [pivotH, setPivotH] = useState(90)
  const [teeth, setTeeth] = useState(42)
  const [pos, setPos] = useState(30)

  const y = (pos / 100) * TRAVEL
  const g = solve(y, pivotH, teeth)
  const data = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const t = i / 20
    return { t: Math.round(t * 100), ...Object.fromEntries(COGS.map((c) => [c, Math.round(solve(t * TRAVEL, pivotH, c).as)])) }
  }), [pivotH])

  // Scene at bike scale (mm, frame coordinates; SVG y runs down, so flip).
  // Both lines start at the rear contact patch: the 100% reference aims at
  // the center of gravity's height above the front axle, the anti-squat line
  // runs through the chain/swingarm intersection. Steeper = more anti-squat.
  const ground = g.contact[1]
  const vb = { x: -560, y: -(ground + 720), w: 1460, h: 760 }
  const along = (to, x) => g.contact[1] + (to[1] - g.contact[1]) * (x - g.contact[0]) / (to[0] - g.contact[0])
  const ref = [FRONT_X, ground + H_COG]
  const asEnd = [FRONT_X, g.frontY]
  const labelX = 380
  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Choice label="Main pivot above the BB, mm" value={PIVOT_PRESETS.some((p) => p.id === pivotH) ? pivotH : null} onChange={setPivotH} options={PIVOT_PRESETS} />
        <Slider label={`Pivot height · ${pivotH} mm`} value={pivotH} min={20} max={180} step={5} onChange={setPivotH} ends={['near the BB', 'high pivot']} />
        <Choice label="Cog" value={teeth} onChange={setTeeth} options={COGS.map((c) => ({ id: c, label: `${c}t` }))} />
        <Slider label={`Compression · ${pos}% of travel`} value={pos} min={0} max={100} onChange={setPos} ends={['topped out', 'bottom-out']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="learn-svg" role="img"
            aria-label={`Anti-squat construction: ${Math.round(g.as)}% in the ${teeth}t cog`}>
            <defs><clipPath id="as-clip"><rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} /></clipPath></defs>
            <g clipPath="url(#as-clip)">
              <line x1={vb.x} y1={-ground} x2={vb.x + vb.w} y2={-ground} stroke="#a89f92" strokeWidth={5} />
              <circle cx={g.axle[0]} cy={-g.axle[1]} r={R} fill="none" stroke="#d9d3ca" strokeWidth={7} />
              <circle cx={FRONT_X} cy={-g.axle[1]} r={R} fill="none" stroke="#d9d3ca" strokeWidth={7} />
              {/* 100% reference: contact patch toward the CoG height over the front axle */}
              <line x1={g.contact[0]} y1={-g.contact[1]} x2={ref[0]} y2={-ref[1]} stroke="#8896aa" strokeWidth={4} strokeDasharray="16 12" />
              {/* swingarm and chain lines, extended until they meet */}
              {g.x && <line x1={g.axle[0]} y1={-g.axle[1]} x2={g.x[0]} y2={-g.x[1]} stroke="var(--text-bright)" strokeDasharray="12 10" strokeWidth={3} />}
              {g.x && <line x1={g.p2[0]} y1={-g.p2[1]} x2={g.x[0]} y2={-g.x[1]} stroke="#e8743b" strokeDasharray="12 10" strokeWidth={3} />}
              <line x1={g.axle[0]} y1={-g.axle[1]} x2={0} y2={-pivotH} stroke="var(--text-bright)" strokeWidth={12} strokeLinecap="round" />
              <line x1={g.p1[0]} y1={-g.p1[1]} x2={g.p2[0]} y2={-g.p2[1]} stroke="#e8743b" strokeWidth={6} />
              <circle cx={0} cy={0} r={RING_R} fill="none" stroke="var(--text-dim)" strokeWidth={6} />
              <circle cx={g.axle[0]} cy={-g.axle[1]} r={g.r2} fill="none" stroke="var(--text-dim)" strokeWidth={6} />
              <circle cx={0} cy={-pivotH} r={16} fill="var(--text-bright)" />
              {/* the anti-squat line, through the intersection */}
              <line x1={g.contact[0]} y1={-g.contact[1]} x2={asEnd[0]} y2={-asEnd[1]} stroke="#3b82f6" strokeWidth={7} />
              {g.x && <circle cx={g.x[0]} cy={-g.x[1]} r={18} fill="#e8743b" />}
              <circle cx={g.contact[0]} cy={-g.contact[1]} r={14} fill="var(--text-bright)" />
            </g>
            <text x={labelX + 30} y={-along(ref, labelX) + 40} fill="#8896aa" fontSize={34} fontFamily="JetBrains Mono">100% line</text>
            <text x={labelX - 30} y={-Math.min(along(asEnd, labelX), ground + 600) - 16} textAnchor="end" fill="#3b82f6" fontSize={34} fontFamily="JetBrains Mono" fontWeight={600}>anti-squat line</text>
          </svg>
          <div className="learn-readout">
            <Readout label={`Anti-squat · ${teeth}t`} value={`${Math.round(g.as)}%`}
              sub={g.as > 115 ? 'pushes back under power' : g.as < 85 ? 'squats under power' : 'close to neutral'} color="#3b82f6" />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">
            Orange: the chain&apos;s pull line. Black dashed: the swingarm line. Blue runs from the rear contact patch through where they meet; steeper than the grey 100% line means more than 100%.
          </span>
          <span className="learn-peak learn-peak-hint">
            32t ring, 435 mm chainstay, 1250 mm wheelbase, center of gravity 1100 mm above the ground. A higher or lower rider changes the percentages. No idler: on a real high pivot it lifts the chain line toward the pivot and brings these numbers well down.
          </span>
        </div>
      </div>

      <div className="card learn-card" style={{ marginTop: 12 }}>
        <div className="chart-pair-title">Anti-squat through the travel · by cog</div>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="t" type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={TICK} tickFormatter={(v) => `${v}%`}
              label={{ value: 'wheel travel', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
            <YAxis domain={[0, 300]} allowDataOverflow ticks={[0, 50, 100, 150, 200, 250, 300]} tick={TICK} width={38} tickFormatter={(v) => `${v}%`} />
            <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l}% travel`} formatter={(v, c) => [`${v}%`, `${c}t cog`]} />
            <ReferenceLine y={100} stroke="#a89f92" strokeDasharray="4 3" label={{ value: '100%', position: 'insideTopLeft', fill: '#8896aa', fontSize: 9 }} />
            <ReferenceLine x={pos} stroke="var(--text-dim)" />
            {COGS.map((c) => (
              <Line key={c} type="monotone" dataKey={String(c)} stroke={COG_COLORS[c]} dot={false} isAnimationActive={false}
                strokeWidth={c === teeth ? 2.4 : 1.2} strokeOpacity={c === teeth ? 1 : 0.5} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          {COGS.map((c) => <span key={c}><span className="dot" style={{ background: COG_COLORS[c] }} /> {c}t</span>)}
        </div>
      </div>

      <Takeaway items={[
        ['Pedaling pulls the swingarm through the chain.', 'Where the chain\'s pull line and the swingarm line meet decides whether that pull squats the rear, holds it up, or lifts it.'],
        ['100% is the balance point.', 'When you push on the pedals, weight shifts to the rear and wants to squat it. At 100% the chain pull cancels that exactly. Below it the bike squats and bobs; above it the suspension pushes back and firms up under power, at the cost of more pedal kickback.'],
        ['It changes with gear.', 'Each cog moves the chain line, so anti-squat is quoted for a specific gear. Which way it moves depends on where the pivot sits relative to the chain. Check which gear a published number is for.'],
        ['It changes with sag.', 'As the bike sinks, the swingarm and chain line rotate. Many bikes sit above 100% near sag in the gears you climb in, then fall off deeper in the travel so big hits are not fighting the chain. In one gear, the Druid V2, a high pivot with an idler, falls from 137% at the top to about 123% at 30% of travel and 73% at the bottom.'],
        ['Pivot height sets the range.', 'A pivot near the chainring gives modest anti-squat; a high pivot gives a lot, which is one more reason high pivots route the chain over an idler.'],
      ]} />
    </div>
  )
}
