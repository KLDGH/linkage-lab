import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { TICK, TT, GRID, AXIS_LABEL } from './chartStyle'
import { Slider, Choice, Readout, Takeaway } from './kit'

// ── Model ──────────────────────────────────────────────────────────
// A quarter of a bike over a smooth 30 cm bump. The sprung mass (rider and
// frame share, 60 kg) sits on the suspension; the unsprung mass (wheel and
// tire, 4 kg) sits on the tire, which can push on the ground but not pull.
// Suspension: 150 mm of travel at 30% sag, a wheel rate giving ~2.2 Hz, and
// for the damped case 30% of critical damping. "Rigid" bolts the wheel to
// the chassis, rider included; on a real bike your legs do some of that work.

const G = 9.81, MS = 60, MU = 4, KS = 11800, KT = 120000, CT = 150
const TRAVEL = 0.150, SAG = 0.045, KSTOP = 600000
const BUMP_L = 0.30, X0 = 0.4, T_END = 1.4, DT = 1e-4, EVERY = 100

function simulate(mode, speedKmh, heightMm) {
  const v = speedKmh / 3.6, h = heightMm / 1000
  const c = mode === 'damped' ? 2 * 0.3 * Math.sqrt(KS * MS) : 0
  const road = (t) => { const x = v * t - X0; return x > 0 && x < BUMP_L ? h * 0.5 * (1 - Math.cos((2 * Math.PI * x) / BUMP_L)) : 0 }
  const F0 = (MS + MU) * G
  const tBumpEnd = (X0 + BUMP_L) / v
  let zs = 0, vs = 0, zu = 0, vu = 0, zrPrev = 0
  let peak = 0, resid = 0, sq = 0, n = 0
  const pts = []
  for (let i = 0; i * DT < T_END; i++) {
    const t = i * DT
    const zr = road(t), vr = (zr - zrPrev) / DT
    zrPrev = zr
    const tire = Math.max(0, F0 + KT * (zr - zu) + CT * (vr - vu))
    if (mode === 'rigid') {
      vs += ((tire - F0) / (MS + MU)) * DT; zs += vs * DT; vu = vs; zu = zs
    } else {
      const ext = zs - zu // positive = extended beyond the sag position
      let fs = -KS * ext - c * (vs - vu)
      if (ext > SAG) fs -= KSTOP * (ext - SAG)
      if (-ext > TRAVEL - SAG) fs += KSTOP * (-ext - (TRAVEL - SAG))
      vs += (fs / MS) * DT; zs += vs * DT
      vu += ((-fs + tire - F0) / MU) * DT; zu += vu * DT
    }
    peak = Math.max(peak, zs)
    if (t > tBumpEnd + 0.5) resid = Math.max(resid, Math.abs(zs))
    if (t > X0 / v) { sq += (tire / F0 - 1) ** 2; n++ }
    if (i % EVERY === 0) pts.push({ t: +t.toFixed(2), chassis: +(zs * 1000).toFixed(1), load: Math.round((tire / F0) * 100), road: +(zr * 1000).toFixed(1) })
  }
  return { pts, peak: peak * 1000, resid: resid * 1000, swing: Math.sqrt(sq / n) * 100 }
}

const MODES = [
  { id: 'rigid', label: 'Rigid', color: '#dc4a3d' },
  { id: 'spring', label: 'Spring only', color: '#f0b429' },
  { id: 'damped', label: 'Spring + damper', color: '#3b82f6' },
]

export default function WhatSuspensionDoes() {
  const [mode, setMode] = useState('damped')
  const [speed, setSpeed] = useState(20)
  const [height, setHeight] = useState(40)

  const runs = useMemo(() => Object.fromEntries(MODES.map((m) => [m.id, simulate(m.id, speed, height)])), [speed, height])
  const data = runs.damped.pts.map((p, i) => ({
    t: p.t, road: p.road,
    ...Object.fromEntries(MODES.flatMap((m) => [[`c_${m.id}`, runs[m.id].pts[i].chassis], [`l_${m.id}`, runs[m.id].pts[i].load]])),
  }))
  // Fit the chassis chart to the selected mode and the spring-only case; the
  // rigid bike gets launched far higher and would flatten everything else.
  const span = Math.max(height * 1.3, ...['spring', mode].map((id) => Math.max(...runs[id].pts.map((p) => Math.abs(p.chassis)))))
  const lim = Math.ceil(span / 10) * 10
  const cur = runs[mode]
  const active = MODES.find((m) => m.id === mode)

  const lineFor = (key, m) => (
    <Line key={key} type="monotone" dataKey={key} stroke={m.color} dot={false} isAnimationActive={false}
      strokeWidth={m.id === mode ? 2.2 : 1} strokeOpacity={m.id === mode ? 1 : 0.35} />
  )

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Choice label="Suspension" value={mode} onChange={setMode} options={MODES} />
        <Slider label={`Speed · ${speed} km/h`} value={speed} min={10} max={30} onChange={setSpeed} ends={['10 km/h', '30 km/h']} />
        <Slider label={`Bump height · ${height} mm`} value={height} min={20} max={80} step={5} onChange={setHeight} ends={['20 mm', '80 mm']} />
      </div>

      <div className="card learn-card">
        <div className="learn-scene">
          <div className="learn-chart">
            <div className="chart-pair">
              <div>
                <div className="chart-pair-title">Chassis height · mm</div>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="t" type="number" domain={[0, T_END]} ticks={[0, 0.4, 0.8, 1.2]} tick={TICK} tickFormatter={(v) => `${v}s`}
                      label={{ value: 'time', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                    <YAxis domain={[-lim, lim]} allowDataOverflow tick={TICK} width={34} />
                    <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l} s`}
                      formatter={(v, k) => k === `c_${mode}` ? [`${v} mm`, active.label] : k === 'road' ? [`${v} mm`, 'Ground'] : [null, null]} />
                    <ReferenceLine y={0} stroke="#a89f92" />
                    <Line type="monotone" dataKey="road" stroke="#a89f92" strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                    {MODES.map((m) => lineFor(`c_${m.id}`, m))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="chart-pair-title">Tire load · % of standing</div>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="t" type="number" domain={[0, T_END]} ticks={[0, 0.4, 0.8, 1.2]} tick={TICK} tickFormatter={(v) => `${v}s`}
                      label={{ value: 'time', position: 'insideBottom', offset: -6, ...AXIS_LABEL }} />
                    <YAxis domain={[0, 400]} allowDataOverflow ticks={[0, 100, 200, 300, 400]} tick={TICK} width={34} />
                    <RechartTooltip contentStyle={TT} labelFormatter={(l) => `${l} s`}
                      formatter={(v, k) => k === `l_${mode}` ? [`${v}%`, active.label] : [null, null]} />
                    <ReferenceLine y={100} stroke="#a89f92" strokeDasharray="4 3" />
                    <ReferenceLine y={0} stroke="#dc4a3d" label={{ value: 'tire off the ground', position: 'insideBottomRight', fill: '#dc4a3d', fontSize: 9 }} />
                    {MODES.map((m) => lineFor(`l_${m.id}`, m))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-legend">
              {MODES.map((m) => <span key={m.id}><span className="dot" style={{ background: m.color }} /> {m.label}</span>)}
              <span><span className="dot" style={{ background: '#a89f92' }} /> Ground</span>
            </div>
          </div>
          <div className="learn-readout">
            <Readout label="Still bouncing" value={`±${Math.round(cur.resid)} mm`} sub="half a second after the bump" color={active.color} />
            <Readout label="Grip swing" value={`±${Math.round(cur.swing)}%`} sub="tire load variation" />
            <Readout label="Peak rise" value={`${Math.round(cur.peak)} mm`} sub={`over a ${height} mm bump`} />
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak learn-peak-hint">
            60 kg on the rear suspension, a 4 kg wheel, 150 mm of travel at 30% sag. Rigid treats the rider as rigid too; on a real bike your legs do some of this work.
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['The job is to keep the tire loaded.', 'Grip comes from how hard the tire presses on the ground. A tire swinging between light and heavy grips less than one with a steady load, and the rider moving smoothly is what lets that happen.'],
        ['Rigid sends the bump straight into the bike.', 'At speed it launches bike and rider, and the tire spends time in the air.'],
        ['A spring alone absorbs the hit, then gives it back.', 'It stores the bump\'s energy and returns it as bouncing that carries on long after the bump has passed, with the tire load swinging along with it.'],
        ['The damper turns that stored energy into heat.', 'The bounce dies within about a cycle, the tire load settles, and the bike is ready for the next hit.'],
        ['Three forces do all of it.', 'The spring depends on where the suspension sits, the damper on how fast it moves, and friction on whether it moves at all. The chapters take them in that order, then geometry and setup.'],
      ]} />
    </div>
  )
}
