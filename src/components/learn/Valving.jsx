import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { TICK, TT, GRID, AXIS_LABEL } from './chartStyle'
import { Slider, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// Three ways to make damping force from shaft speed, all set to give the
// same force at 0.5 m/s so the shapes compare fairly:
//  • a plain hole (orifice): turbulent flow, force rises with speed squared
//  • linear: force in proportion to speed
//  • shim stack: a bleed sets the slope up to the cracking speed, then the
//    shims bend open and the slope drops (a "digressive" curve)
// Coefficients are illustrative; real dampers blend all three.

const V_REF = 0.5, F_REF = 600 // N at 0.5 m/s for every style
const LOW = 0.1, HIGH = 1.5    // m/s: braking/pumping vs a square edge

function curves(knee, stiff) {
  // shim stack: slope c1 to the knee, then stiff × c1 beyond it, scaled to F_REF at V_REF
  const shape = (v) => (v <= knee ? v : knee + stiff * (v - knee))
  const c1 = F_REF / shape(V_REF)
  return {
    orifice: (v) => F_REF * (v / V_REF) ** 2,
    linear: (v) => F_REF * (v / V_REF),
    shim: (v) => c1 * shape(v),
  }
}

const STYLES = [
  { id: 'orifice', label: 'Plain hole', color: '#dc4a3d' },
  { id: 'linear', label: 'Linear', color: '#8896aa' },
  { id: 'shim', label: 'Shim stack', color: '#3b82f6' },
]

export default function Valving() {
  const [knee, setKnee] = useState(0.25)
  const [stiff, setStiff] = useState(0.35)

  const f = useMemo(() => curves(knee, stiff), [knee, stiff])
  const data = useMemo(() => Array.from({ length: 61 }, (_, i) => {
    const v = i * 0.03
    return { v: +v.toFixed(2), orifice: Math.round(f.orifice(v)), linear: Math.round(f.linear(v)), shim: Math.round(f.shim(v)) }
  }), [f])
  const pct = (v, id) => Math.round((f[id](v) / F_REF) * 100)

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Slider label={`Shim stack opens at · ${knee.toFixed(2)} m/s`} value={knee} min={0.1} max={0.5} step={0.05} onChange={setKnee} ends={['early', 'late']} />
        <Slider label={`Stack stiffness once open · ${Math.round(stiff * 100)}% of the bleed slope`} value={stiff} min={0.1} max={1} step={0.05} onChange={setStiff} ends={['soft stack', 'stiff stack']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <div className="learn-chart">
            <div className="chart-pair-title">Damping force vs shaft speed · N</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="v" type="number" domain={[0, 1.8]} ticks={[0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8]} tick={TICK}
                  label={{ value: 'shaft speed (m/s)', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                <YAxis domain={[0, 4000]} allowDataOverflow tick={TICK} width={44} />
                <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l} m/s`}
                  formatter={(v, id) => [`${v} N`, STYLES.find((s) => s.id === id)?.label]} />
                <ReferenceLine x={LOW} stroke="#a89f92" strokeDasharray="3 3" label={{ value: 'braking', position: 'insideTopLeft', fill: '#8896aa', fontSize: 9 }} />
                <ReferenceLine x={HIGH} stroke="#a89f92" strokeDasharray="3 3" label={{ value: 'square edge', position: 'insideTopRight', fill: '#8896aa', fontSize: 9 }} />
                {STYLES.map((s) => (
                  <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color} strokeWidth={s.id === 'linear' ? 1.2 : 2}
                    strokeDasharray={s.id === 'linear' ? '5 4' : undefined} dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {STYLES.map((s) => <span key={s.id}><span className="dot" style={{ background: s.color }} /> {s.label}</span>)}
            </div>
          </div>
          <div className="learn-readout">
            <Readout label="Braking, 0.1 m/s" value={`${pct(LOW, 'shim')}% vs ${pct(LOW, 'orifice')}%`} sub="shim stack vs plain hole" />
            <Readout label="Square edge, 1.5 m/s" value={`${pct(HIGH, 'shim')}% vs ${pct(HIGH, 'orifice')}%`} sub="shim stack vs plain hole" />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak learn-peak-hint">
            Percentages are of the force all three give at 0.5 m/s. Coefficients are illustrative; real dampers blend all three behaviors.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['A plain hole looks progressive and rides badly.', 'Force through a fixed hole rises with speed squared: almost nothing at low speed, then a wall. The bike wallows under braking and in berms, then spikes harshly on square edges.'],
        ['A shim stack flattens out.', 'Below its cracking speed the oil goes through a small bleed and the force climbs steeply. Above it the shims bend open and the force grows much more slowly. That digressive shape gives support at low speed and give at high speed: firm and plush at once.'],
        ['The two slopes are the two clickers.', 'Low-speed adjusters work on the bleed, the steep first slope. High-speed adjusters set how hard the stack is to open, the second slope.'],
        ['A stack that is too stiff loses the benefit.', 'Push the second slope toward the first and the curve straightens, so big hits get harsh. If the high-speed clicker is already fully open, softer shims are the fix.'],
      ]} />
    </div>
  )
}
