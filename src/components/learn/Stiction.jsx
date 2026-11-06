import { useState } from 'react'
import { Slider, Choice, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// Friction as a fixed force against movement (Coulomb friction). Over one
// small chatter cycle around sag, the force at the wheel traces a loop:
// spring + friction while compressing, spring − friction while extending,
// and a vertical jump of 2 × friction at each reversal where the force
// changes but the wheel cannot move until friction is overcome. The shock's
// friction reaches the wheel divided by the leverage ratio; a fork's acts
// on the wheel directly. Spring rates are typical; friction is illustrative.

const ENDS = {
  rear: { label: 'Rear shock', lr: 2.7, wheelRate: 10.8 },   // 450 lb/in coil at 2.7:1, N/mm at the wheel
  fork: { label: 'Fork', lr: 1, wheelRate: 8 },              // ~45 lb/in fork spring, N/mm at the wheel
}
const W = 640, H = 300, PAD = 40
const AMP_MAX = 10 // mm, x-axis half-width

export default function Stiction() {
  const [end, setEnd] = useState('fork')
  const [friction, setFriction] = useState(60)
  const [amp, setAmp] = useState(3)

  const { lr, wheelRate } = ENDS[end]
  const fWheel = friction / lr          // N of friction at the wheel
  const springSwing = wheelRate * amp   // N of spring force change over ± amp
  const share = (fWheel / springSwing) * 100

  // plot scales: x in mm (±AMP_MAX), y in N (± a fixed range so changes show)
  const yMax = 160
  const sx = (mm) => W / 2 + (mm / AMP_MAX) * (W / 2 - PAD)
  const sy = (n) => H / 2 - (Math.max(-yMax, Math.min(yMax, n)) / yMax) * (H / 2 - PAD / 2)
  const loop = [
    [-amp, -springSwing - fWheel], [-amp, -springSwing + fWheel],
    [amp, springSwing + fWheel], [amp, springSwing - fWheel],
  ].map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Choice label="End of the bike" value={end} onChange={setEnd}
          options={Object.entries(ENDS).map(([id, e]) => ({ id, label: `${e.label} · ${e.lr}:1` }))} />
        <Slider label={`Friction at the seals · ${friction} N`} value={friction} min={0} max={150} step={5} onChange={setFriction}
          ends={['fresh, well-oiled', 'dry seals, worn bushings']} />
        <Slider label={`Chatter · ±${amp} mm at the wheel`} value={amp} min={1} max={10} onChange={setAmp} ends={['small', 'big']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <svg viewBox={`0 0 ${W} ${H}`} className="learn-svg" role="img"
            aria-label={`Force against wheel movement over a ±${amp} mm cycle`}>
            {/* axes through sag */}
            <line x1={PAD} y1={H / 2} x2={W - PAD / 2} y2={H / 2} stroke="#d9d3ca" />
            <line x1={W / 2} y1={PAD / 4} x2={W / 2} y2={H - PAD / 4} stroke="#d9d3ca" />
            <text x={W - PAD / 2} y={H / 2 - 6} textAnchor="end" fill="#8896aa" fontSize={10} fontFamily="JetBrains Mono">wheel movement → deeper</text>
            <text x={W / 2 + 6} y={PAD / 2} fill="#8896aa" fontSize={10} fontFamily="JetBrains Mono">force at the wheel ↑</text>
            {/* spring alone */}
            <line x1={sx(-AMP_MAX)} y1={sy(-wheelRate * AMP_MAX)} x2={sx(AMP_MAX)} y2={sy(wheelRate * AMP_MAX)}
              stroke="var(--text-bright)" strokeDasharray="5 4" strokeWidth={1.2} />
            {/* friction loop */}
            <polygon points={loop} fill="#f0b429" fillOpacity={0.22} stroke="#e8743b" strokeWidth={2} strokeLinejoin="round" />
            <text x={sx(amp) + 8} y={sy(springSwing) + 4} fill="#e8743b" fontSize={10} fontFamily="JetBrains Mono">stuck</text>
            <text x={sx(-amp) - 8} y={sy(-springSwing) + 4} textAnchor="end" fill="#e8743b" fontSize={10} fontFamily="JetBrains Mono">stuck</text>
          </svg>
          <div className="learn-readout">
            <Readout label="Breakaway at the wheel" value={`${Math.round(fWheel)} N`} sub={`${friction} N ÷ ${lr} leverage`} color="#e8743b" />
            <Readout label="On this chatter" value={`${Math.round(share)}%`} sub="friction vs the spring's own change" />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">
            Dashed: the spring alone. Loop: what the wheel feels with friction, compressing along the top and extending along the bottom.
          </span>
          <span className="learn-peak learn-peak-hint">
            Wheel rates are typical (a 450 lb/in coil at 2.7:1, a ~45 lb/in fork spring). Friction values are illustrative.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['Friction is a fixed force against any movement.', 'It does not grow with speed the way damping does, and it takes a little more to get moving than to keep moving. That first bit is the "stick" you feel at the top of the stroke.'],
        ['It matters most on small bumps.', 'On a big hit, friction is small next to the spring and damper. On fine chatter it can be as large as the spring\'s own response, so the suspension partly locks and the bump goes into the bike. That is the dead, harsh feel of dry seals.'],
        ['Leverage hides shock friction; forks get none.', 'Shock friction reaches the wheel divided by the leverage ratio. A fork\'s seals and bushings act on the wheel one to one, which is why forks are so sensitive to friction and to side loads that press the bushings together.'],
        ['A lower-leg service is the cheapest small-bump upgrade.', 'Fresh oil on the seals and bushings shrinks the loop. Coatings and polished stanchions help for the same reason.'],
        ['You can measure it.', 'The gap between your two sag readings is friction. Note it when the bike is fresh and watch it grow.'],
      ]} />
    </div>
  )
}
