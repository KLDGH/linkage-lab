import { useState } from 'react'
import { Slider, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// Sag is where the spring's force equals the rider's load at the shock.
// Friction (seals, bushings, bearings) resists motion in either direction,
// so the shock stops short of that point: rising to rest it stops where
// spring − load = friction (reads more sag), sinking to rest it stops where
// load − spring = friction (reads less). True sag is the midpoint and the gap
// is 2 × friction ÷ spring rate. Spring and load are the calculator's
// default bike and rider at 30% sag; the friction values are illustrative.

const STROKE = 55
const K = 505 / 5.71015      // N/mm, 505 lb/in
const LOAD = K * 0.30 * STROKE // N, so true sag is exactly 30%
const VIEW = 40              // mm of stroke drawn (sag lives in the first 40)
const SCALE = 13             // px per mm in the drawing
const X0 = 70                // where the seal sits in the drawing

const RISE = '#e8743b'
const SINK = '#3b82f6'

export default function MeasuringSag() {
  const [friction, setFriction] = useState(60)

  const trueSag = LOAD / K
  const rise = (LOAD + friction) / K
  const sink = Math.max(0, (LOAD - friction) / K)
  const pct = (mm) => (mm / STROKE) * 100
  const px = (mm) => X0 + mm * SCALE

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Slider label={`Friction at the shock · ${friction} N`} value={friction} min={0} max={150} step={5} onChange={setFriction}
          ends={['fresh, well-oiled', 'dry seals, worn bushings']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <svg viewBox="0 0 640 200" className="learn-svg" role="img"
            aria-label={`Shock shaft with o-ring readings at ${pct(sink).toFixed(1)}% and ${pct(rise).toFixed(1)}% sag`}>
            {/* shock body up to the seal, then the shaft the o-ring rides on */}
            <rect x={10} y={78} width={X0 - 10} height={44} rx={6} fill="#d9d3ca" stroke="#a89f92" />
            <rect x={X0 - 4} y={84} width={8} height={32} fill="#6b635c" />
            <rect x={X0} y={92} width={VIEW * SCALE + 10} height={16} fill="#e6e2db" stroke="#a89f92" />
            <text x={X0} y={70} textAnchor="middle" fill="var(--text-dim)" fontSize={11} fontFamily="JetBrains Mono">seal</text>
            {/* stroke scale */}
            {[0, 10, 20, 30, 40].map((mm) => (
              <g key={mm}>
                <line x1={px(mm)} y1={126} x2={px(mm)} y2={132} stroke="#a89f92" />
                <text x={px(mm)} y={146} textAnchor="middle" fill="#8896aa" fontSize={10} fontFamily="JetBrains Mono">{mm}</text>
              </g>
            ))}
            <text x={px(VIEW)} y={164} textAnchor="end" fill="#8896aa" fontSize={10} fontFamily="JetBrains Mono">mm of a {STROKE} mm stroke</text>
            {/* the stiction zone between the two readings */}
            <rect x={px(sink)} y={88} width={Math.max(1, px(rise) - px(sink))} height={24} fill="#f0b429" fillOpacity={0.25} />
            {/* o-ring readings */}
            <rect x={px(sink) - 3} y={86} width={6} height={28} rx={2} fill={SINK} />
            <rect x={px(rise) - 3} y={86} width={6} height={28} rx={2} fill={RISE} />
            <line x1={px(trueSag)} y1={80} x2={px(trueSag)} y2={120} stroke="var(--text-bright)" strokeDasharray="3 2" />
            <text x={px(trueSag)} y={44} textAnchor="middle" fill="var(--text-bright)" fontSize={11} fontFamily="JetBrains Mono">true sag</text>
            <line x1={px(trueSag)} y1={48} x2={px(trueSag)} y2={78} stroke="var(--text-bright)" strokeWidth={1} />
          </svg>
          <div className="learn-readout">
            <Readout label="Sink to rest" value={`${pct(sink).toFixed(1)}%`} sub={`${sink.toFixed(1)} mm`} color={SINK} />
            <Readout label="Rise to rest" value={`${pct(rise).toFixed(1)}%`} sub={`${rise.toFixed(1)} mm`} color={RISE} />
            <Readout label="Midpoint" value={`${pct(trueSag).toFixed(1)}%`} sub={`gap ${(rise - sink).toFixed(1)} mm`} />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">
            A single reading could be off by up to&nbsp;<strong>±{(pct(rise) - pct(trueSag)).toFixed(1)}% sag</strong>
          </span>
          <span className="learn-peak learn-peak-hint">
            505 lb/in coil set to 30% sag on the calculator&apos;s default bike. Friction values are illustrative.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['Measure at the shock.', 'Push the o-ring against the seal, get on in your riding position with your gear on and the compression lever open, then get off without bouncing. The distance the o-ring moved, divided by the stroke, is your sag.'],
        ['One reading is not enough.', 'Friction stops the shock short of where your weight and the spring balance. Sinking to rest, it stops early and reads too little sag; rising to rest, it stops early from the other side and reads too much.'],
        ['Take two and use the middle.', 'Push down and let the bike rise to rest, read the o-ring. Lift and let it sink to rest, read it again. True sag is halfway between.'],
        ['The gap is friction.', 'The band between the two readings is the stiction zone. Note it when the bike is fresh from a service; a gap that grows means seals or bushings are due.'],
        ['Use the rider-on reading.', 'Unlike a motorbike, a mountain bike\'s own weight barely moves the shock, so sag with you on board is the number that matters.'],
      ]} />
    </div>
  )
}
