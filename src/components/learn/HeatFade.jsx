import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer,
} from 'recharts'
import { TICK, TT, GRID, AXIS_LABEL } from './chartStyle'
import { Slider, Choice, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// The damper turns motion into heat at a steady rate that depends on the
// terrain; the shock sheds heat to the air in proportion to how much hotter
// it is. Temperature rises toward the level where the two balance:
//   T(t) = T_air + (P / h) · (1 − e^(−t·h / C))
// with C the shock's heat capacity and h its cooling. Oil viscosity follows
// a standard fit through two points of a light suspension oil (15.3 cSt at
// 40 °C, 5.8 at 100 °C). Power, heat capacity and cooling are rough
// figures; the shape is what holds: a climb, then a plateau.

const T_AIR = 20
const SHOCKS = {
  air: { label: 'Air shock', C: 250, h: 1.5 },
  coil: { label: 'Coil with reservoir', C: 450, h: 2.5 },
}
const TERRAIN = {
  flow: { label: 'Flowy trail', P: 30 },
  rough: { label: 'Rough trail', P: 80 },
  dh: { label: 'Downhill track', P: 120 },
}

const lg = Math.log10
const K = (c) => c + 273.15
const walther = (nu) => lg(lg(nu + 0.7))
const B = (walther(15.3) - walther(5.8)) / (lg(K(100)) - lg(K(40)))
const A = walther(15.3) + B * lg(K(40))
const viscosity = (c) => 10 ** (10 ** (A - B * lg(K(c)))) - 0.7 // cSt
const COLD = viscosity(T_AIR)

const TEMP = '#e8743b'
const OIL = '#3b82f6'

export default function HeatFade() {
  const [shock, setShock] = useState('air')
  const [terrain, setTerrain] = useState('rough')
  const [minutes, setMinutes] = useState(6)

  const { C, h } = SHOCKS[shock]
  const { P } = TERRAIN[terrain]
  const tempAt = (min) => T_AIR + (P / h) * (1 - Math.exp(-(min * 60 * h) / C))
  const data = useMemo(() => Array.from({ length: 41 }, (_, i) => {
    const min = (minutes * i) / 40
    const T = tempAt(min)
    return { min: +min.toFixed(2), temp: Math.round(T), oil: Math.round((viscosity(T) / COLD) * 100) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [shock, terrain, minutes])

  const end = data.at(-1)
  const ceiling = Math.round(T_AIR + P / h)

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Choice label="Shock" value={shock} onChange={setShock} options={Object.entries(SHOCKS).map(([id, s]) => ({ id, label: s.label }))} />
        <Choice label="Terrain" value={terrain} onChange={setTerrain} options={Object.entries(TERRAIN).map(([id, t]) => ({ id, label: t.label }))} />
        <Slider label={`Descent · ${minutes} min`} value={minutes} min={1} max={10} onChange={setMinutes} ends={['1 min', '10 min']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <div className="learn-chart">
            <div className="chart-pair">
              <div>
                <div className="chart-pair-title">Shock temperature · °C</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="min" type="number" domain={[0, minutes]} tick={TICK} tickFormatter={(v) => `${Math.round(v)}`}
                      label={{ value: 'minutes', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                    <YAxis domain={[0, 120]} ticks={[0, 30, 60, 90, 120]} tick={TICK} width={34} />
                    <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l} min`} formatter={(v) => [`${v} °C`, 'Temperature']} />
                    <Line type="monotone" dataKey="temp" stroke={TEMP} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="chart-pair-title">Oil thickness · % of cold</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="min" type="number" domain={[0, minutes]} tick={TICK} tickFormatter={(v) => `${Math.round(v)}`}
                      label={{ value: 'minutes', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={TICK} width={34} />
                    <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l} min`} formatter={(v) => [`${v}%`, 'Viscosity vs cold']} />
                    <Line type="monotone" dataKey="oil" stroke={OIL} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="learn-readout">
            <Readout label="At the bottom" value={`${end.temp} °C`} sub={`levels off near ${ceiling} °C`} color={TEMP} />
            <Readout label="Oil thickness" value={`${end.oil}%`} sub="of its cold viscosity" color={OIL} />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak learn-peak-hint">
            {P} W of damping heat, starting at {T_AIR} °C. Heat and cooling figures are rough; the climb-then-plateau shape is what holds.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['A hot shock is a working shock.', 'The damper\'s whole job is turning the bike\'s motion into heat. The rougher and faster the descent, the more heat it makes.'],
        ['Heat thins the oil, and the bleed feels it most.', 'Oil can lose half its thickness or more on a hard run. The low-speed bleed circuit depends heavily on that thickness; shim stacks much less. So the bike gets looser late in a long descent, mostly in its low-speed control. That is fade.'],
        ['More oil and metal heats more slowly.', 'A bigger shock with a reservoir takes longer to heat and sheds heat faster, so it fades less on long runs.'],
        ['Reservoir pressure stops cavitation.', 'Fast shaft movement can pull the pressure behind the piston low enough for the oil to form vapor bubbles, and damping drops suddenly. A pressurized reservoir or floating piston keeps the oil under pressure, which matters more as it heats.'],
        ['Check settings late in a long run, not just at the top.', 'If the bike feels right at the top and loose at the bottom, the oil is thinning: a bigger shock or a firmer low-speed setting for the descent helps.'],
      ]} />
    </div>
  )
}
