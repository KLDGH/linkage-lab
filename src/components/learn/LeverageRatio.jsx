import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { BIKE_PRESETS } from '../../lib/bikePresets'
import { getLrAtTravel } from '../../lib/linkagePresets'
import { TICK, TT, GRID, AXIS_LABEL } from './chartStyle'
import { Slider, Choice, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// The leverage ratio (LR) is wheel travel per unit of shock travel. The
// shock moves 1/LR as far as the wheel, and its force reaches the wheel
// divided by LR, so the stiffness the wheel feels is the spring rate
// divided by LR squared. Exact for any curve; the curves here are the
// measured bikes from the calculator plus a flat reference.

const FLAT = { id: 'flat', name: 'Flat reference', short: 'Flat', color: '#8896aa', points: [{ t: 0, lr: 2.6 }, { t: 1, lr: 2.6 }] }
const SHORT = { 'druid-v2': 'Druid', 'sentinel-v3': 'Sentinel', 'bronson-v5': 'Bronson', 'ripmo-v3': 'Ripmo', claymore: 'Claymore', 'murmur-enduro-v3': 'Starling', sb160: 'SB160', 'dreadnought-v2': 'Dreadnought' }
const CURVES = [FLAT, ...BIKE_PRESETS.map((b) => ({ ...b, short: SHORT[b.id] || b.name }))]

export default function LeverageRatio() {
  const [curveId, setCurveId] = useState('ripmo-v3')
  const [rate, setRate] = useState(450)
  const [pos, setPos] = useState(30)

  const curve = CURVES.find((c) => c.id === curveId)
  const data = useMemo(() => Array.from({ length: 51 }, (_, i) => {
    const t = i / 50
    const lr = getLrAtTravel(curve, t)
    return { t: Math.round(t * 100), lr: +lr.toFixed(3), wheel: +(rate / (lr * lr)).toFixed(1), flatWheel: +(rate / 2.6 ** 2).toFixed(1) }
  }), [curve, rate])

  const lrNow = getLrAtTravel(curve, pos / 100)
  const wheelNow = rate / lrNow ** 2
  const lr0 = curve.points[0].lr, lr1 = curve.points.at(-1).lr
  const ramp = (lr0 / lr1) ** 2 - 1

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Choice label="Leverage curve" value={curveId} onChange={setCurveId}
          options={CURVES.map((c) => ({ id: c.id, label: c.short, tip: c.name }))} />
        <Slider label={`Coil spring · ${rate} lb/in`} value={rate} min={300} max={700} step={25} onChange={setRate} ends={['softer', 'stiffer']} />
        <Slider label={`Wheel position · ${pos}% of travel`} value={pos} min={0} max={100} onChange={setPos} ends={['topped out', 'bottom-out']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <div className="learn-chart">
            <div className="chart-pair">
              <div>
                <div className="chart-pair-title">Leverage ratio</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="t" type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={TICK} tickFormatter={(v) => `${v}%`}
                      label={{ value: 'wheel travel', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                    <YAxis domain={['auto', 'auto']} tick={TICK} width={36} tickFormatter={(v) => v.toFixed(1)} />
                    <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l}% travel`} formatter={(v) => [`${v.toFixed(2)} : 1`, 'Leverage ratio']} />
                    <ReferenceLine x={pos} stroke="var(--text-dim)" />
                    <Line type="linear" dataKey="lr" stroke={curve.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="chart-pair-title">Spring rate the wheel feels · lb/in</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="t" type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={TICK} tickFormatter={(v) => `${v}%`}
                      label={{ value: 'wheel travel', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                    <YAxis domain={[0, 'auto']} tick={TICK} width={36} />
                    <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l}% travel`}
                      formatter={(v, n) => [`${Math.round(v)} lb/in`, n === 'wheel' ? 'At the wheel' : 'Flat 2.6 reference']} />
                    <ReferenceLine x={pos} stroke="var(--text-dim)" />
                    {curveId !== 'flat' && <Line type="linear" dataKey="flatWheel" stroke="#bbb" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />}
                    <Line type="linear" dataKey="wheel" stroke={curve.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="learn-readout">
            <Readout label="Leverage ratio" value={`${lrNow.toFixed(2)}:1`} sub={`1 mm of shock = ${lrNow.toFixed(1)} mm of wheel`} color={curve.color} />
            <Readout label="Wheel feels" value={`${Math.round(wheelNow)} lb/in`} sub={`${rate} ÷ ${lrNow.toFixed(2)}²`} />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">
            {curve.name}: {lr0.toFixed(2)} → {lr1.toFixed(2)}, so the wheel rate{' '}
            <strong>{ramp >= 0 ? 'rises' : 'falls'} {Math.abs(Math.round(ramp * 100))}%</strong> from top to bottom with a linear coil.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['The ratio is how far the wheel moves per millimeter of shock.', 'At 2.6:1, 26 mm of wheel travel moves the shock 10 mm. It is why a 55 mm shock can deliver 150 mm of travel.'],
        ['The wheel feels the spring divided by the ratio squared.', 'The shock moves less than the wheel, and its force reaches the wheel divided down, so a 450 lb/in coil feels like about 67 lb/in at the wheel at 2.6:1.'],
        ['A falling ratio makes a linear coil progressive.', 'As the ratio drops through the travel, the same coil feels stiffer and stiffer at the wheel. On the Ripmo the wheel rate roughly doubles from top to bottom; on the near-flat Starling it barely changes.'],
        ['Flat or rising curves need help at the end.', 'With little progression from the frame, bottom-out resistance has to come from the spring (air, or a coil with a stiffer rate) or the damper\'s bottom-out control.'],
        ['The ratio at your sag point sets the spring rate.', 'That is the correction the calculator applies, and why two bikes with the same travel and stroke can need different springs.'],
      ]} />
    </div>
  )
}
