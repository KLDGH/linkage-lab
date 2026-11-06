// Shared building blocks for Learn modules. They render the same markup and
// classes the original modules use, so every module looks and behaves alike.

export function Slider({ label, value, min, max, step = 1, onChange, ends, grow = true }) {
  return (
    <div className="learn-control-group" style={grow ? { flex: 1, minWidth: 180 } : undefined}>
      <span className="learn-control-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="learn-speed-slider" />
      {ends && <div className="learn-slider-ends"><span>{ends[0]}</span><span>{ends[1]}</span></div>}
    </div>
  )
}

export function Choice({ label, options, value, onChange }) {
  return (
    <div className="learn-control-group">
      <span className="learn-control-label">{label}</span>
      <div className="choice-tabs">
        {options.map((o) => (
          <button key={o.id} type="button" title={o.tip}
            className={`choice-tab ${value === o.id ? 'choice-tab-active' : ''}`}
            onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

export function Readout({ label, value, sub, color }) {
  return (
    <div className="learn-readout-item">
      <span className="learn-readout-label">{label}</span>
      <span className="learn-readout-val" style={color ? { color } : undefined}>{value}</span>
      {sub && <span className="learn-readout-sub" style={{ color: 'var(--text-dim)' }}>{sub}</span>}
    </div>
  )
}

// items: [[bold lead, rest of the sentence], ...]
export function Takeaway({ items }) {
  return (
    <div className="learn-takeaway">
      <div className="learn-takeaway-title">What this means for your setup</div>
      <ul>
        {items.map(([lead, rest]) => (
          <li key={lead}><strong>{lead}</strong> {rest}</li>
        ))}
      </ul>
    </div>
  )
}
