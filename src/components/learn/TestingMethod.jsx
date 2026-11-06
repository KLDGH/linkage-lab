import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// A test method and a setup log. The log lives in this browser only
// (localStorage); every read and write is guarded so the page still works
// when storage is blocked, and the copy button is the way to keep it.

const STEPS = [
  ['Set sag first.', 'Spring or pressure to your target sag at both ends. Every other setting sits on top of it.', { to: '/learn/springs/measuring-sag', label: 'Measuring sag' }],
  ['Start clickers in the middle.', 'Or at the maker\'s base setting. Count clicks from fully closed (turned in all the way) and write them down.'],
  ['Pick one test section.', 'A couple of minutes with the kind of terrain that shows the problem. Ride it the same way each time, with the same tire pressure.'],
  ['Change one thing at a time.', 'Two or three clicks, or a few psi. Smaller steps get lost in the run-to-run difference; two changes at once tell you nothing.'],
  ['Go past it, then come back.', 'Keep going in one direction until it gets worse. The best setting sits between the last two runs.'],
  ['Write it down.', 'Setting, section, what you felt. By the third run memory is no help.'],
  ['Re-check after a spring change.', 'New spring or pressure means new sag, and a firmer spring usually wants a little more rebound.', { to: '/learn/damping/packing', label: 'Packing and rebound' }],
  ['Full travel is a check, not a goal.', 'Using it on the biggest hit of the run is fine. Going softer just to use it costs support everywhere else.'],
]

const KEY = 'sd-setup-log-v1'
const FIELDS = [
  ['spring', 'Spring / psi'], ['sag', 'Sag %'], ['reb', 'Rebound'],
  ['lsc', 'Low-speed comp'], ['hsc', 'High-speed comp'], ['tokens', 'Spacers'],
]
const ENDS = [['fork', 'Fork'], ['shock', 'Shock']]
const RESULTS = ['Better', 'Same', 'Worse']
const EMPTY = { baseline: { fork: {}, shock: {} }, entries: [] }

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return v && v.baseline && Array.isArray(v.entries) ? v : EMPTY
  } catch { return EMPTY }
}

function asText(log) {
  const lines = ['Setup log', '']
  for (const [end, name] of ENDS) {
    const b = log.baseline[end] || {}
    const parts = FIELDS.filter(([k]) => b[k]).map(([k, label]) => `${label} ${b[k]}`)
    if (parts.length) lines.push(`${name}: ${parts.join(' · ')}`)
  }
  if (log.entries.length) {
    lines.push('')
    for (const e of [...log.entries].reverse()) {
      lines.push(`${e.date} · ${e.change} · ${e.result}${e.note ? ` · ${e.note}` : ''}`)
    }
  }
  return lines.join('\n')
}

export default function TestingMethod() {
  const [log, setLog] = useState(load)
  const [change, setChange] = useState('')
  const [result, setResult] = useState('Better')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(log)) } catch { /* storage blocked: log lasts this visit */ }
  }, [log])

  const setBase = (end, k, v) => setLog((l) => ({ ...l, baseline: { ...l.baseline, [end]: { ...l.baseline[end], [k]: v } } }))
  const add = (e) => {
    e.preventDefault()
    if (!change.trim()) return
    const date = new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD
    setLog((l) => ({ ...l, entries: [{ id: Date.now(), date, change: change.trim(), result, note: note.trim() }, ...l.entries] }))
    setChange(''); setNote('')
  }
  const remove = (id) => setLog((l) => ({ ...l, entries: l.entries.filter((x) => x.id !== id) }))
  const clear = () => { if (window.confirm('Clear the whole log?')) setLog(EMPTY) }
  const copy = async () => {
    try { await navigator.clipboard.writeText(asText(log)); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard blocked */ }
  }
  const empty = !log.entries.length && !ENDS.some(([end]) => Object.values(log.baseline[end] || {}).some(Boolean))

  return (
    <div className="learn-body">
      <div className="card learn-card">
        <ol className="testing-steps">
          {STEPS.map(([lead, rest, link]) => (
            <li key={lead}>
              <strong>{lead}</strong> {rest}
              {link && <> <Link to={link.to} className="symptom-link">{link.label} →</Link></>}
            </li>
          ))}
        </ol>
      </div>

      <div className="card learn-card" style={{ marginTop: 12 }}>
        <div className="results-title">
          <span className="learn-control-label">Setup log</span>
          <span className="log-actions">
            <button type="button" className={`share-btn ${copied ? 'share-btn-done' : ''}`} onClick={copy} disabled={empty}>{copied ? 'Copied' : 'Copy'}</button>
            <button type="button" className="share-btn" onClick={clear} disabled={empty}>Clear</button>
          </span>
        </div>

        <div className="log-baseline">
          <table>
            <thead>
              <tr><th>Baseline</th>{FIELDS.map(([k, label]) => <th key={k}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {ENDS.map(([end, name]) => (
                <tr key={end}>
                  <th scope="row">{name}</th>
                  {FIELDS.map(([k, label]) => (
                    <td key={k}>
                      <label>
                        <span className="log-cell-label">{label}</span>
                        <input className="calc-input log-input" value={log.baseline[end]?.[k] || ''} aria-label={`${name} ${label}`}
                          onChange={(e) => setBase(end, k, e.target.value)} />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="log-form" onSubmit={add}>
          <input className="calc-input" placeholder="What you changed, e.g. shock rebound +2 clicks" value={change}
            onChange={(e) => setChange(e.target.value)} aria-label="What you changed" />
          <div className="choice-tabs" role="group" aria-label="Result">
            {RESULTS.map((r) => (
              <button key={r} type="button" className={`choice-tab ${result === r ? 'choice-tab-active' : ''}`} onClick={() => setResult(r)}>{r}</button>
            ))}
          </div>
          <input className="calc-input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
          <button type="submit" className="share-btn" disabled={!change.trim()}>Add</button>
        </form>

        {log.entries.length > 0 && (
          <ul className="log-entries">
            {log.entries.map((e) => (
              <li key={e.id}>
                <span className="log-date">{e.date}</span>
                <span className="log-change">{e.change}</span>
                <span className={`log-result log-result-${e.result.toLowerCase()}`}>{e.result}</span>
                {e.note && <span className="log-note">{e.note}</span>}
                <button type="button" className="log-remove" onClick={() => remove(e.id)} aria-label={`Remove ${e.change}`}>×</button>
              </li>
            ))}
          </ul>
        )}

        <div className="learn-peaks">
          <span className="learn-peak learn-peak-hint">Saved in this browser only. Copy it to keep it or send it with a service request.</span>
        </div>
      </div>
    </div>
  )
}
