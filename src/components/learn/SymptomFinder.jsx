import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Choice, Takeaway } from './kit'

// Symptom → likely causes, easiest fix first: check sag, then clickers, then
// springs and spacers, then a service, then valving. Each cause links to the
// module that explains it.

const M = {
  sag: { to: '/learn/springs/measuring-sag', label: 'Measuring sag' },
  rate: { to: '/learn/springs/rate-preload-sag', label: 'Rate, preload and sag' },
  leverage: { to: '/learn/springs/leverage-ratio', label: 'Leverage ratio' },
  air: { to: '/learn/springs/air-springs', label: 'Air springs' },
  packing: { to: '/learn/damping/packing', label: 'Packing and rebound' },
  clickers: { to: '/learn/damping/clickers', label: 'What your clickers do' },
  valving: { to: '/learn/damping/valving', label: 'Firm and plush at once' },
  heat: { to: '/learn/damping/heat-fade', label: 'Heat and fade' },
  stiction: { to: '/learn/friction/stiction', label: 'Stiction' },
  axle: { to: '/learn/geometry/axle-path', label: 'Axle path and chain growth' },
  antisquat: { to: '/learn/geometry/anti-squat', label: 'Anti-squat' },
  geometry: { to: '/learn/geometry/dynamic-geometry', label: 'Sag moves your geometry' },
}

const SYMPTOMS = {
  rear: [
    { id: 'harsh-small', label: 'Harsh on small bumps', causes: [
      ['Spring too stiff or pressure too high', 'Check sag first; drop pressure or go down a spring size if it is under your target.', M.sag],
      ['Too much low-speed compression', 'Open low-speed compression, or the climb lever, a few clicks.', M.clickers],
      ['Rebound too slow, so it packs down', 'Speed rebound up two or three clicks and ride the same section again.', M.packing],
      ['Friction', 'If the gap between your two sag readings has grown, the shock or linkage bearings are due a service.', M.stiction],
    ] },
    { id: 'harsh-big', label: 'Harsh on big or square hits', causes: [
      ['Too much high-speed compression', 'Open high-speed compression if your shock has it.', M.clickers],
      ['Too many volume spacers (air)', 'Remove one, then check you still do not bottom harshly on the biggest hits.', M.air],
      ['Rebound too slow through fast hits', 'The shock is packed down before the big hit arrives. Speed rebound up.', M.packing],
      ['Valving that spikes at speed', 'If the high-speed clicker is already fully open, the shim stack is too stiff for you: a revalve.', M.valving],
    ] },
    { id: 'bottoms', label: 'Bottoms out too easily', causes: [
      ['Spring too soft or pressure too low', 'Check sag against your target.', M.sag],
      ['Too little high-speed compression', 'Add a couple of clicks of high-speed compression.', M.clickers],
      ['Not enough ramp at the end', 'Air: add a volume spacer. Coil on a flat or rising leverage curve: a stiffer spring or more bottom-out control.', M.air],
      ['A frame with little progression', 'Check how much the leverage ratio falls through the travel; a near-flat curve leaves the spring to do all the work.', M.leverage],
    ] },
    { id: 'kicks', label: 'Kicks or bucks off drops', causes: [
      ['Rebound too fast', 'Slow rebound, starting with high-speed rebound if you have it.', M.clickers],
      ['Spring too stiff for the rebound damping', 'A firm spring stores more energy than the rebound can control. Check sag.', M.rate],
      ['Pedal kickback', 'On high pivots in low gears, the pedals tug back through rough sections. That is the design, not the setup.', M.axle],
    ] },
    { id: 'packs', label: 'Packs down through repeated hits', causes: [
      ['Rebound too slow', 'Speed rebound up until it returns to sag between hits.', M.packing],
      ['Spring too soft', 'Riding deeper leaves less travel for each hit. Check sag.', M.sag],
    ] },
    { id: 'wallows', label: 'Wallows or sinks in berms', causes: [
      ['Too little low-speed compression', 'Add low-speed compression a few clicks.', M.clickers],
      ['Spring too soft or pressure too low', 'Check sag; air shocks can take a few more psi for support.', M.sag],
    ] },
    { id: 'bobs', label: 'Bobs or squats when pedaling', causes: [
      ['Climb lever open', 'Use the climb switch, or add low-speed compression for long climbs.', M.clickers],
      ['Too much sag', 'Check sag.', M.sag],
      ['Low anti-squat in that gear', 'Some bikes bob more in some gears. That is the design, not the setup.', M.antisquat],
    ] },
    { id: 'skips', label: 'Rear skips or loses traction', causes: [
      ['Rebound too fast', 'The wheel springs back past the ground and goes light. Slow rebound.', M.packing],
      ['Too much compression damping', 'The wheel deflects off bumps instead of following them. Open low- or high-speed compression.', M.clickers],
      ['Rebound too slow', 'Packed down, the wheel cannot drop into holes. The packing module shows how to tell which.', M.packing],
    ] },
    { id: 'fades', label: 'Gets loose late in a long descent', causes: [
      ['Oil thinning with heat', 'Low-speed damping fades as the oil heats. A larger shock or one with a reservoir, or a firmer low-speed setting for the descent.', M.heat],
    ] },
  ],
  fork: [
    { id: 'dives', label: 'Dives under braking', causes: [
      ['Too little low-speed compression', 'Add low-speed compression a few clicks.', M.clickers],
      ['Pressure too low or spring too soft', 'Check fork sag; most riders run about 15–25%.', M.sag],
      ['It changes your geometry', 'A diving fork steepens the head angle and cuts trail. See how much.', M.geometry],
    ] },
    { id: 'harsh-small', label: 'Harsh on small bumps', causes: [
      ['Friction', 'A lower-leg service first: fresh oil on the seals and bushings. Fork friction reaches the wheel one to one.', M.stiction],
      ['Pressure too high', 'Check sag.', M.sag],
      ['Too much low-speed compression', 'Open low-speed compression a few clicks.', M.clickers],
      ['Rebound too slow', 'Speed rebound up a couple of clicks.', M.packing],
    ] },
    { id: 'bottoms', label: 'Bottoms out', causes: [
      ['Pressure too low', 'Check sag.', M.sag],
      ['Not enough ramp at the end', 'Add a volume spacer.', M.air],
      ['Too little high-speed compression', 'Add a couple of clicks of high-speed compression.', M.clickers],
    ] },
    { id: 'no-travel', label: 'Never uses full travel', causes: [
      ['Too many volume spacers', 'Remove one.', M.air],
      ['Too much high-speed compression', 'Open high-speed compression.', M.clickers],
      ['Pressure too high', 'Check sag.', M.sag],
    ] },
    { id: 'washes', label: 'Front washes out in turns', causes: [
      ['Rear sagging more than the front', 'A soft or deep rear slackens the head angle and takes weight off the front tire. Check both sags.', M.geometry],
      ['Fork too firm to track', 'Too much compression keeps the tire skipping. Open low-speed compression.', M.clickers],
      ['Rebound too fast', 'The tire unloads after each bump. Slow rebound a little.', M.packing],
    ] },
    { id: 'kicks', label: 'Kicks or feels uncontrolled', causes: [
      ['Rebound too fast', 'Slow rebound a couple of clicks.', M.packing],
      ['Pressure too high', 'More stored energy for the rebound to control. Check sag.', M.sag],
    ] },
  ],
}

export default function SymptomFinder() {
  const [end, setEnd] = useState('rear')
  const [symptom, setSymptom] = useState('harsh-small')
  const list = SYMPTOMS[end]
  const active = list.find((s) => s.id === symptom) || list[0]

  return (
    <div className="learn-body">
      <div className="learn-controls">
        <Choice label="Where" value={end} onChange={(e) => { setEnd(e); setSymptom(SYMPTOMS[e][0].id) }}
          options={[{ id: 'rear', label: 'Rear shock' }, { id: 'fork', label: 'Fork' }]} />
      </div>

      <div className="card learn-card">
        <div className="symptom-layout">
          <div className="symptom-list">
            <span className="learn-control-label">What it&apos;s doing</span>
            {list.map((s) => (
              <button key={s.id} type="button" aria-pressed={s.id === active.id}
                className={`symptom-item ${s.id === active.id ? 'symptom-item-active' : ''}`}
                onClick={() => setSymptom(s.id)}>{s.label}</button>
            ))}
            {/* phones: the same choice as a dropdown, so the causes stay on screen */}
            <select className="bike-select bike-select-full symptom-select" value={active.id}
              onChange={(e) => setSymptom(e.target.value)} aria-label="What it's doing">
              {list.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <span className="learn-control-label">Likely causes · easiest to check first</span>
            <ol className="symptom-causes">
              {active.causes.map(([cause, fix, link]) => (
                <li key={cause}>
                  <div className="symptom-cause">{cause}</div>
                  <div className="symptom-fix">{fix}</div>
                  <Link to={link.to} className="symptom-link">{link.label} →</Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="learn-peaks">
          <span className="learn-peak learn-peak-hint">
            Change one thing at a time and ride the same section after each change. <Link to="/learn/setup/testing" className="symptom-link">How to test →</Link>
          </span>
        </div>
      </div>

      <Takeaway items={[
        ['Start with sag.', 'Most symptoms come from a spring or pressure that is wrong for the rider. No clicker fixes the wrong spring.'],
        ['Then clickers.', 'They cost nothing and undo in seconds. Move one at a time, two or three clicks, and ride the same section.'],
        ['Then springs and spacers.', 'When sag is right but the bike still bottoms or never uses its travel, the spring curve needs to change.'],
        ['Then a service.', 'Old oil and dry seals make good settings feel bad. If the bike used to feel right, service it before changing anything else.'],
        ['Revalve last.', 'When a clicker sits at the end of its range and the problem is still there, the fix is outside the clicker\'s reach. That is a shim stack job.'],
      ]} />
    </div>
  )
}
