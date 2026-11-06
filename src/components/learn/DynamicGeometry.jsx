import { useState } from 'react'
import { Slider, Choice, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// Exact trigonometry on a typical 29er enduro bike, both wheels on the
// ground. The fork compresses along its own axis, so the front of the frame
// drops by (fork travel used × sin(head angle)); the rear drops by the rear
// wheel travel used. The difference over the wheelbase pitches the frame:
// nose down steepens the head angle, tail down slackens it. BB drop is
// interpolated along the wheelbase. Trail = (R·cos(HA) − offset) / sin(HA),
// with the head angle measured from horizontal.

const FORK = 160, REAR = 150, HA0 = 64, WB = 1250, BBH = 340, CS = 435, OFFSET = 44, R = 368
const DEG = Math.PI / 180
const trailAt = (ha) => (R * Math.cos(ha * DEG) - OFFSET) / Math.sin(ha * DEG)

const SCENARIOS = [
  { id: 'static', label: 'No rider', f: 0, r: 0 },
  { id: 'sag', label: 'Riding sag', f: 20, r: 30 },
  { id: 'brake', label: 'Hard braking', f: 60, r: 15 },
  { id: 'climb', label: 'Seated climb', f: 10, r: 40 },
]

function solve(fPct, rPct) {
  const df = (fPct / 100) * FORK
  const dropF = df * Math.sin(HA0 * DEG)
  const dropR = (rPct / 100) * REAR
  const pitch = Math.atan((dropF - dropR) / WB) / DEG // + = nose down
  const ha = HA0 + pitch
  const dropAt = (x) => dropR + (dropF - dropR) * (x / WB)
  return { df, dropF, dropR, pitch, ha, bb: BBH - dropAt(CS), trail: trailAt(ha), wb: WB - df * Math.cos(HA0 * DEG), dropAt }
}

// frame outline for the drawing (mm, y up)
function outline(s) {
  const dir = (ha) => [-Math.cos(ha * DEG), Math.sin(ha * DEG)]
  const fa = [s ? s.wb : WB, R]
  const d0 = dir(HA0)
  const hbStatic = [WB + 580 * d0[0], R + 580 * d0[1]]
  const drop = (p) => (s ? [p[0], p[1] - s.dropAt(p[0])] : p)
  const hb = drop(hbStatic)
  const d = dir(s ? s.ha : HA0)
  const ht = [hb[0] + 120 * d[0], hb[1] + 120 * d[1]]
  const bb = drop([CS, BBH])
  const seat = drop([CS - 160, BBH + 520])
  return { ra: [0, R], fa, hb, ht, bb, seat }
}

export default function DynamicGeometry() {
  const [front, setFront] = useState(20)
  const [rear, setRear] = useState(30)
  const scenario = SCENARIOS.find((x) => x.f === front && x.r === rear)?.id ?? null

  const s = solve(front, rear)
  const base = outline(null)
  const now = outline(s)
  const trail0 = trailAt(HA0)
  const P = ([x, y]) => `${x.toFixed(1)},${(-y).toFixed(1)}`
  const frame = (o) => [o.ra, o.bb, o.hb, o.ht, o.seat, o.bb].map(P).join(' ')
  const sign = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Choice label="Situation" value={scenario} onChange={(id) => { const x = SCENARIOS.find((y) => y.id === id); setFront(x.f); setRear(x.r) }} options={SCENARIOS} />
        <Slider label={`Fork travel used · ${front}%`} value={front} min={0} max={80} onChange={setFront} ends={['topped out', 'deep']} />
        <Slider label={`Rear travel used · ${rear}%`} value={rear} min={0} max={80} onChange={setRear} ends={['topped out', 'deep']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <svg viewBox="-450 -1160 2150 1200" className="learn-svg" role="img"
            aria-label={`Bike at ${front}% fork and ${rear}% rear travel: head angle ${s.ha.toFixed(1)} degrees`}>
            <line x1={-450} y1={0} x2={1700} y2={0} stroke="#a89f92" strokeWidth={6} />
            {/* geometry chart numbers, no rider */}
            <g opacity={0.35}>
              <circle cx={0} cy={-R} r={R} fill="none" stroke="#a89f92" strokeWidth={6} />
              <circle cx={WB} cy={-R} r={R} fill="none" stroke="#a89f92" strokeWidth={6} />
              <polyline points={frame(base)} fill="none" stroke="#8896aa" strokeWidth={12} strokeLinejoin="round" />
              <line x1={WB} y1={-R} x2={base.hb[0]} y2={-base.hb[1]} stroke="#8896aa" strokeWidth={10} />
            </g>
            {/* now */}
            <circle cx={0} cy={-R} r={R} fill="none" stroke="var(--text-bright)" strokeWidth={8} />
            <circle cx={now.fa[0]} cy={-R} r={R} fill="none" stroke="var(--text-bright)" strokeWidth={8} />
            <polyline points={frame(now)} fill="none" stroke="#3b82f6" strokeWidth={14} strokeLinejoin="round" />
            <line x1={now.fa[0]} y1={-R} x2={now.hb[0]} y2={-now.hb[1]} stroke="var(--text-bright)" strokeWidth={12} />
            <circle cx={now.bb[0]} cy={-now.bb[1]} r={22} fill="#3b82f6" />
          </svg>
          <div className="learn-readout">
            <Readout label="Head angle" value={`${s.ha.toFixed(1)}°`} sub={`${sign(s.ha - HA0)}° · ${s.ha < HA0 - 0.05 ? 'slacker' : s.ha > HA0 + 0.05 ? 'steeper' : 'as charted'}`} color="#3b82f6" />
            <Readout label="BB height" value={`${Math.round(s.bb)} mm`} sub={`${sign(s.bb - BBH, 0)} mm`} />
            <Readout label="Trail" value={`${Math.round(s.trail)} mm`} sub={`${sign(s.trail - trail0, 0)} mm`} />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">Faded: the bike as its geometry chart lists it. Blue: where it actually sits.</span>
          <span className="learn-peak learn-peak-hint">
            29er, {FORK} mm fork, {REAR} mm rear, {HA0}° head angle, {WB} mm wheelbase, {BBH} mm BB, {OFFSET} mm fork offset.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['Geometry charts list the bike with no rider on it.', 'On the trail it sits in its sag, so every number on the chart moves.'],
        ['Sag the rear more than the front and the head angle slackens.', 'At typical riding sag that is under a degree, and trail grows a little: steadier, slower to turn.'],
        ['Braking pitches the bike forward.', 'With the fork deep and the rear extended, the head angle steepens by a few degrees and trail drops sharply. That is the nervous, tucking feel of a bike that dives too much under braking.'],
        ['Climbing does the opposite.', 'Seated on a steep climb, the rear sinks and the front lifts: the head angle slackens and the front wanders. More rear support, or a firmer low-speed setting, keeps it level.'],
        ['BB height drops by roughly the sag.', 'Pedal strikes come from the sagged height, not the chart number.'],
        ['Balanced front and rear sag keeps the handling close to the design.', 'How much each end sags also depends on where your weight sits: the rear bias in the calculator.'],
      ]} />
    </div>
  )
}
