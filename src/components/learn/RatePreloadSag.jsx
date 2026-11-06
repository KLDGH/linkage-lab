import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ReferenceDot, ResponsiveContainer,
} from 'recharts'
import { TICK, TT, GRID, AXIS_LABEL } from './chartStyle'
import { Slider, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// A linear coil at the shock: force = rate × (compression + preload).
// The rider's load at the shock is rear weight × the average leverage
// ratio of the calculator's default bike (150 mm on a 55 mm stroke, 65%
// rear bias), so these numbers line up with the calculator in Geometric
// mode. Sag is where the spring's force equals that load. Constant
// leverage here; the leverage module covers the curve.

const STROKE = 55
const LR = 150 / 55
const REAR = 0.65
const A_COLOR = 'var(--text-bright)'
const B_COLOR = '#3b82f6'
const LOAD_COLOR = '#f0b429'

const forceAt = (rate, preload, x) => (rate * (x + preload)) / 25.4 // lb
const sagAt = (rate, preload, load) => Math.min(STROKE, Math.max(0, (load * 25.4) / rate - preload))

export default function RatePreloadSag() {
  const [rider, setRider] = useState(185)
  const [rateA, setRateA] = useState(450)
  const [preA, setPreA] = useState(2)
  const [rateB, setRateB] = useState(500)

  const load = rider * REAR * LR
  const sagA = sagAt(rateA, preA, load)
  const sagB = sagAt(rateB, 0, load)
  // Two straight lines of different slope meet at exactly one point.
  const cross = rateB !== rateA ? (rateA * preA) / (rateB - rateA) : null
  const crossShown = cross !== null && cross > 0 && cross < STROKE
  const endA = forceAt(rateA, preA, STROKE)
  const endB = forceAt(rateB, 0, STROKE)

  const data = useMemo(() => Array.from({ length: STROKE * 2 + 1 }, (_, i) => {
    const x = i / 2
    return { x, a: +forceAt(rateA, preA, x).toFixed(1), b: +forceAt(rateB, 0, x).toFixed(1) }
  }), [rateA, preA, rateB])

  const pct = (mm) => Math.round((mm / STROKE) * 100)

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Slider label={`Rider + gear · ${rider} lb`} value={rider} min={120} max={260} step={5} onChange={setRider} ends={['120 lb', '260 lb']} />
        <Slider label={`Spring A rate · ${rateA} lb/in`} value={rateA} min={300} max={700} step={25} onChange={setRateA} ends={['softer', 'stiffer']} />
        <Slider label={`Spring A preload · ${preA} mm`} value={preA} min={0} max={10} step={0.5} onChange={setPreA} ends={['none', '10 mm']} />
        <Slider label={`Spring B rate · ${rateB} lb/in, no preload`} value={rateB} min={300} max={700} step={25} onChange={setRateB} ends={['softer', 'stiffer']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <div className="learn-chart">
            <div className="chart-pair-title">Spring force at the shock · lb</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="x" type="number" domain={[0, STROKE]} ticks={[0, 10, 20, 30, 40, 50]} tick={TICK}
                  label={{ value: 'shock compression (mm)', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                <YAxis tick={TICK} width={44} />
                <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l} mm`}
                  formatter={(v, n) => [`${Math.round(v)} lb`, n === 'a' ? 'Spring A' : 'Spring B']} />
                <ReferenceLine y={load} stroke={LOAD_COLOR} strokeDasharray="5 3"
                  label={{ value: 'rider load', position: 'insideTopLeft', fill: LOAD_COLOR, fontSize: 9 }} />
                {crossShown && (
                  <ReferenceLine x={+cross.toFixed(1)} stroke="#a89f92" strokeDasharray="3 3"
                    label={{ value: 'lines cross', position: 'insideTopRight', fill: '#8896aa', fontSize: 9 }} />
                )}
                <Line type="linear" dataKey="b" stroke={B_COLOR} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                <Line type="linear" dataKey="a" stroke={A_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceDot x={+sagA.toFixed(1)} y={load} r={4} fill={A_COLOR} stroke="none" />
                <ReferenceDot x={+sagB.toFixed(1)} y={load} r={4} fill={B_COLOR} stroke="none" />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <span><span className="dot" style={{ background: A_COLOR }} /> A: {rateA} lb/in + {preA} mm preload</span>
              <span><span className="dot" style={{ background: B_COLOR }} /> B: {rateB} lb/in, no preload</span>
              <span><span className="dot" style={{ background: LOAD_COLOR }} /> Rider load at the shock</span>
            </div>
          </div>
          <div className="learn-readout">
            <Readout label="A sags" value={`${pct(sagA)}%`} sub={`${sagA.toFixed(1)} mm`} />
            <Readout label="B sags" value={`${pct(sagB)}%`} sub={`${sagB.toFixed(1)} mm`} color={B_COLOR} />
            <Readout label="At bottom-out" value={`${endB >= endA ? 'B' : 'A'} +${Math.round(Math.abs(endB - endA) / Math.min(endA, endB) * 100)}%`}
              sub={`A ${Math.round(endA)} lb · B ${Math.round(endB)} lb`} />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">
            Spring A&apos;s stroke:&nbsp;<strong>{sagA.toFixed(1)} mm</strong> to extend into holes ·&nbsp;
            <strong>{(STROKE - sagA).toFixed(1)} mm</strong> to absorb bumps
          </span>
          <span className="learn-peak learn-peak-hint">
            {Math.round(load)} lb at the shock: {rider} lb × 65% rear × a {LR.toFixed(2)} leverage ratio (150 mm travel, 55 mm stroke).
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['Rate is the slope.', 'It is how much force each millimeter of compression adds, and it is the number stamped on the spring. A steeper line pushes back harder at every point in the stroke.'],
        ['Preload moves the line up, not its slope.', 'Winding the collar adds the same force everywhere, so the bike sits higher in its travel. Each millimeter of preload takes a millimeter off sag at the shock. The spring ramps exactly as before.'],
        ['A softer spring with preload only matches a stiffer one at a single point.', 'Set them to the same sag and they cross near it. Deeper in the stroke the softer spring pushes back less, so it gives up bottom-out support that preload cannot buy back.'],
        ['Sag splits the stroke.', 'The part above sag lets the wheel drop into holes, the part below absorbs bumps. More sag gives more room to extend and less to compress.'],
        ['If it takes more than a few millimeters of preload to reach sag, the spring is too soft.', 'Go up a size and back the preload off. Most coil shocks cap preload at around two to three turns.'],
      ]} />
    </div>
  )
}
