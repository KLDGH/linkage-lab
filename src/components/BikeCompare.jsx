import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { BIKE_PRESETS } from '../lib/bikePresets'
import { getLrAtTravel, averageLr, progression } from '../lib/linkagePresets'
import { leverageRatio, resolveSag, lrAtTravelFrac } from '../lib/springMath'

const TICK = { fill: '#8896aa', fontSize: 10, fontFamily: 'JetBrains Mono' }
const TT = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 11 }
const REF_SAG = 0.30 // shock sag the table's numbers are quoted at

// Each bike's numbers at a common reference: 30% shock sag on the bike's own
// travel and stroke, computed exactly the way the spring calculator does.
function statsFor(b) {
  const preset = { id: b.id, points: b.points }
  const geo = leverageRatio(b.travel, b.stroke)
  const sag = resolveSag(REF_SAG, 'shock', preset, null, geo, b.travel, b.stroke)
  return {
    avg: averageLr(preset),
    prog: progression(b.points),
    wheelSagPct: sag.wheelSagPct,
    correction: lrAtTravelFrac(sag.wheelSagPct, preset, null, geo) / geo,
  }
}

export default function BikeCompare({ onUseBike }) {
  const [shown, setShown] = useState(() => BIKE_PRESETS.map((b) => b.id))
  const [view, setView] = useState('rel') // 'rel' = relative to its own average, 'abs' = raw LR

  const stats = useMemo(() => Object.fromEntries(BIKE_PRESETS.map((b) => [b.id, statsFor(b)])), [])
  const visible = BIKE_PRESETS.filter((b) => shown.includes(b.id))

  const toggle = (id) => setShown((prev) =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id])

  const data = useMemo(() => Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    const row = { travel: Math.round(t * 100) }
    BIKE_PRESETS.forEach((b) => {
      const lr = getLrAtTravel(b, t)
      row[b.id] = view === 'abs' ? +lr.toFixed(3) : +(lr / stats[b.id].avg).toFixed(4)
    })
    return row
  }), [view, stats])

  // Where 30% shock sag lands at the wheel for the bikes on the chart
  const sagBand = visible.length
    ? [Math.min(...visible.map((b) => stats[b.id].wheelSagPct)) * 100, Math.max(...visible.map((b) => stats[b.id].wheelSagPct)) * 100]
    : null

  const rows = [...BIKE_PRESETS].sort((a, b) => stats[b.id].correction - stats[a.id].correction)

  return (
    <div className="compare">
      <p className="compare-lead">
        Measured leverage curves for real bikes, side by side. Switch to <em>relative</em> to see what drives the
        spring correction: how far above its own average each bike's leverage ratio sits at sag.
      </p>

      <div className="compare-controls">
        <div className="compare-chips" role="group" aria-label="Bikes shown">
          {BIKE_PRESETS.map((b) => {
            const on = shown.includes(b.id)
            return (
              <button key={b.id} type="button" aria-pressed={on}
                className={`compare-chip${on ? ' compare-chip-on' : ''}`}
                style={on ? { borderColor: b.color } : undefined}
                onClick={() => toggle(b.id)}>
                <span className="compare-chip-dot" style={{ background: on ? b.color : 'var(--border)' }} />
                {b.name}
              </button>
            )
          })}
        </div>
        <div className="unit-pill" role="group" aria-label="Chart scale">
          <button className={`unit-pill-btn ${view === 'rel' ? 'unit-pill-active' : ''}`} onClick={() => setView('rel')}>relative</button>
          <button className={`unit-pill-btn ${view === 'abs' ? 'unit-pill-active' : ''}`} onClick={() => setView('abs')}>absolute LR</button>
        </div>
      </div>

      <div className="card compare-chart">
        <div className="chart-pair-title">
          {view === 'rel' ? 'Leverage ratio ÷ its own average' : 'Leverage ratio'}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 18, right: 14, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" />
            <XAxis dataKey="travel" type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]}
              tickFormatter={(v) => `${v}%`} tick={TICK}
              label={{ value: 'wheel travel', position: 'insideBottom', offset: -10, fill: '#8896aa', fontSize: 10 }} />
            <YAxis domain={['auto', 'auto']} tick={TICK} width={40}
              tickFormatter={(v) => (view === 'rel' ? `${v.toFixed(2)}×` : v.toFixed(1))} />
            {sagBand && (
              <ReferenceArea x1={sagBand[0]} x2={Math.max(sagBand[1], sagBand[0] + 1)} fill="#3b82f6" fillOpacity={0.08}
                label={{ value: '30% shock sag', position: 'insideTop', fill: '#3b82f6', fontSize: 9 }} />
            )}
            {view === 'rel' && (
              <ReferenceLine y={1} stroke="#a89f92" strokeDasharray="4 3"
                label={{ value: 'average · what Geometric assumes', position: 'insideBottomRight', fill: '#8896aa', fontSize: 9 }} />
            )}
            <Tooltip contentStyle={TT}
              labelFormatter={(l) => `${l}% travel`}
              formatter={(v, id) => {
                const b = BIKE_PRESETS.find((x) => x.id === id)
                return [view === 'rel' ? `${v.toFixed(3)}×` : `${v.toFixed(2)} : 1`, b?.name || id]
              }} />
            {visible.map((b) => (
              <Line key={b.id} type="monotone" dataKey={b.id} stroke={b.color} strokeWidth={2}
                dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Bike</th>
              <th scope="col">Travel / stroke</th>
              <th scope="col">LR start → end</th>
              <th scope="col">Progression</th>
              <th scope="col">
                Spring correction
                <span className="compare-th-sub">at 30% shock sag</span>
              </th>
              <th scope="col"><span className="visually-hidden">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const st = stats[b.id]
              return (
                <tr key={b.id}>
                  <th scope="row">
                    <span className="compare-chip-dot" style={{ background: b.color }} />
                    {b.name} <span className="compare-year">{b.year}</span>
                  </th>
                  <td>{b.travel} / {b.stroke} mm</td>
                  <td>{b.points[0].lr.toFixed(2)} → {b.points.at(-1).lr.toFixed(2)}</td>
                  <td>{Math.round(st.prog * 100)}%</td>
                  <td className="compare-corr">+{((st.correction - 1) * 100).toFixed(1)}%</td>
                  <td>
                    <button type="button" className="compare-use" onClick={() => onUseBike?.(b.id)}>
                      Use in calculator
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="compare-notes">
        <p>
          <strong>Spring correction</strong> is the leverage ratio at sag divided by its average: how much stiffer a
          spring the bike needs than travel ÷ stroke suggests. On every bike measured so far it is positive, and it
          shrinks as you run more sag.
        </p>
        <p>
          Curves come from published Avalanche, Linkage Design and Blister measurements. Anti-squat and pedal
          kickback need pivot coordinates; a kinematics tool that solves them is in development. For how kickback
          works, see <Link to="/learn/axle-path">Learn 04: axle path and chain growth</Link>.
        </p>
        <p>
          Missing your bike?{' '}
          <a href="mailto:hello@solitairedynamics.com?subject=Bike%20request%20for%20the%20leverage%20comparison">
            Request it
          </a>{' '}
          with the model and year.
        </p>
      </div>
    </div>
  )
}
