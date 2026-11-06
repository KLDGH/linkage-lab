import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ReferenceDot, ResponsiveContainer,
} from 'recharts'
import { TICK, TT, GRID, AXIS_LABEL } from './chartStyle'
import { Slider, Choice, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// An air shock as two sealed chambers on one piston. The positive chamber
// shrinks as the shock compresses, so its pressure climbs (P·V constant,
// slow compression). The negative chamber, equalized with it at top-out,
// grows and pulls the other way. Net force = area × (positive − negative).
// Volume spacers take volume out of the positive chamber. Chamber sizes
// are illustrative but realistic: about 220 psi puts a 185 lb rider at 30%
// sag on the calculator's default bike, with compression ratios of 2.5–5.

const PATM = 14.7          // psi
const AREA = 1500          // mm², effective piston area
const STROKE = 55          // mm
const V0 = 137000          // mm³, positive chamber at top-out, no spacers
const SPACER = 8500        // mm³ per volume spacer
const NEG = { small: 14000, large: 43000 } // mm³, negative chamber at top-out
const LOAD = 185 * 0.65 * (150 / 55) // lb at the shock, calculator default bike
const N_TO_LB = 0.224809
const MPA_PER_PSI = 0.00689476

function airForce(x, psi, spacers, neg) {   // lb at shock compression x (mm)
  const p0 = psi + PATM
  const v = V0 - spacers * SPACER
  const pos = p0 * v / (v - AREA * x)
  const negP = p0 * NEG[neg] / (NEG[neg] + AREA * x)
  return (pos - negP) * MPA_PER_PSI * AREA * N_TO_LB // psi→MPa × mm² = N
}

function sagFor(psi, spacers, neg) {
  let lo = 0, hi = STROKE
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2
    if (airForce(m, psi, spacers, neg) < LOAD) lo = m; else hi = m
  }
  return lo
}

const AIR = '#3b82f6'
const COIL = 'var(--text-bright)'

export default function AirSprings() {
  const [psi, setPsi] = useState(220)
  const [spacers, setSpacers] = useState(1)
  const [neg, setNeg] = useState('large')

  const sag = sagFor(psi, spacers, neg)
  const coilK = LOAD / Math.max(sag, 0.5) // lb per mm, a coil giving the same sag
  const data = useMemo(() => Array.from({ length: 111 }, (_, i) => {
    const x = Math.min(i / 2, STROKE - 0.2)
    return { x, air: +airForce(x, psi, spacers, neg).toFixed(1), coil: +(coilK * x).toFixed(1) }
  }), [psi, spacers, neg, coilK])

  const end = airForce(STROKE - 0.2, psi, spacers, neg) / (coilK * (STROKE - 0.2))
  const start = airForce(5, psi, spacers, neg) / (coilK * 5)
  const ratio = (V0 - spacers * SPACER) / (V0 - spacers * SPACER - AREA * STROKE)

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Slider label={`Air pressure · ${psi} psi`} value={psi} min={120} max={320} step={5} onChange={setPsi} ends={['120 psi', '320 psi']} />
        <Choice label="Volume spacers" value={spacers} onChange={setSpacers}
          options={[0, 1, 2, 3, 4].map((n) => ({ id: n, label: String(n) }))} />
        <Choice label="Negative chamber" value={neg} onChange={setNeg}
          options={[{ id: 'small', label: 'Small (older)' }, { id: 'large', label: 'Large (modern)' }]} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <div className="learn-chart">
            <div className="chart-pair-title">Force at the shock, lb · air vs a coil with the same sag</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="x" type="number" domain={[0, STROKE]} ticks={[0, 10, 20, 30, 40, 50]} tick={TICK}
                  label={{ value: 'shock compression (mm)', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                <YAxis tick={TICK} width={44} domain={[0, 'auto']} />
                <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l} mm`}
                  formatter={(v, n) => [`${Math.round(v)} lb`, n === 'air' ? 'Air spring' : 'Coil, same sag']} />
                <ReferenceLine y={LOAD} stroke="#f0b429" strokeDasharray="5 3"
                  label={{ value: 'rider load', position: 'insideTopLeft', fill: '#f0b429', fontSize: 9 }} />
                <Line type="linear" dataKey="coil" stroke={COIL} strokeWidth={1.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="air" stroke={AIR} strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceDot x={+sag.toFixed(1)} y={LOAD} r={4} fill={AIR} stroke="none" />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <span><span className="dot" style={{ background: AIR }} /> Air spring</span>
              <span><span className="dot" style={{ background: COIL }} /> Coil set to the same sag</span>
            </div>
          </div>
          <div className="learn-readout">
            <Readout label="Sag" value={`${Math.round((sag / STROKE) * 100)}%`} sub={`${sag.toFixed(1)} mm`} color={AIR} />
            <Readout label="First 5 mm" value={`${start.toFixed(2)}×`} sub="the coil's force" />
            <Readout label="At bottom-out" value={`${end.toFixed(2)}×`} sub="the coil's force" />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak">Compression ratio:&nbsp;<strong>{ratio.toFixed(1)}:1</strong></span>
          <span className="learn-peak learn-peak-hint">
            185 lb rider on the calculator&apos;s default bike. Chamber sizes are illustrative and slow compression is assumed; fast hits ramp a little harder.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['An air spring is a chamber getting smaller.', 'Pressure climbs faster and faster as the volume shrinks, so air ramps up toward bottom-out on its own, where a coil stays a straight line.'],
        ['Pressure sets sag. Spacers set the end.', 'Volume spacers take space out of the chamber. They barely touch the start of the stroke and make the last third ramp much harder. Add one if you bottom too easily at the right sag; remove one if you never reach full travel.'],
        ['The negative chamber cancels the breakaway.', 'It pushes the other way near top-out, so the shock moves on small bumps instead of needing a big shove to start. A larger one gives a more coil-like start but needs more pressure for the same sag.'],
        ['Modern air can feel close to a coil in the middle.', 'With a large negative chamber and no spacers, the curve is nearly linear until the end. The difference left is friction from the extra seals, and how the curve keeps rising at the end.'],
        ['Temperature changes pressure.', 'Air pressure rises with temperature, so a shock that heats up on a long descent sits higher and ramps harder, and one set in a warm garage runs softer on a cold morning.'],
      ]} />
    </div>
  )
}
