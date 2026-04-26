export default function ServicesPage() {
  return (
    <div className="page">
      <div className="page-hero">
        <p className="page-eyebrow">What we do</p>
        <h1 className="page-title">Services</h1>
        <p className="page-lead">
          Boutique suspension service out of Los Angeles. Every job starts with
          a spring rate and setup review — the numbers matter as much as fresh
          seals and oil.
        </p>
      </div>

      <div className="service-grid">

        <div className="service-card">
          <div className="service-card-top">
            <span className="service-tag">Fork</span>
            <h2 className="service-name">Lowers Service</h2>
          </div>
          <p className="service-desc">
            Bath oil change, wiper seals, foam rings, lower leg clean and
            inspect. The baseline maintenance every fork needs every 50–80 hours.
          </p>
          <ul className="service-includes">
            <li>Lower leg removal and clean</li>
            <li>Wiper seals and foam rings replaced</li>
            <li>Fresh bath oil, correct volume set</li>
            <li>Air spring service (if applicable)</li>
          </ul>
          <div className="service-footer">
            <span className="service-turnaround">Turnaround: 3–5 days</span>
          </div>
        </div>

        <div className="service-card">
          <div className="service-card-top">
            <span className="service-tag">Fork</span>
            <h2 className="service-name">Full Rebuild</h2>
          </div>
          <p className="service-desc">
            Complete overhaul — damper disassembly, bushing inspection, full
            seal kit, fresh fluids throughout. Recommended every 150–200 hours
            or if you notice fade or leaks.
          </p>
          <ul className="service-includes">
            <li>Everything in Lowers Service</li>
            <li>Damper removal and rebuild</li>
            <li>All seals and O-rings replaced</li>
            <li>Bushing inspection + replacement if worn</li>
            <li>Rebound and compression baseline set</li>
          </ul>
          <div className="service-footer">
            <span className="service-turnaround">Turnaround: 5–7 days</span>
          </div>
        </div>

        <div className="service-card">
          <div className="service-card-top">
            <span className="service-tag">Shock</span>
            <h2 className="service-name">Full Rebuild</h2>
          </div>
          <p className="service-desc">
            Full damper rebuild, seal replacement, IFP reset, nitrogen charge.
            Includes a spring rate check using your bike geometry and riding
            weight — we'll tell you if you're on the wrong spring.
          </p>
          <ul className="service-includes">
            <li>Damper disassembly and rebuild</li>
            <li>Full seal kit replacement</li>
            <li>IFP reset and nitrogen recharge</li>
            <li>Spring rate verification (coil) or pressure chart (air)</li>
            <li>Rebound and compression baseline</li>
          </ul>
          <div className="service-footer">
            <span className="service-turnaround">Turnaround: 5–7 days</span>
          </div>
        </div>

        <div className="service-card">
          <div className="service-card-top">
            <span className="service-tag">Setup</span>
            <h2 className="service-name">Custom Tune</h2>
          </div>
          <p className="service-desc">
            Built around your numbers. We use your weight, riding style,
            bike geometry, and linkage kinematics to dial in spring rate,
            sag, and damper settings from first principles — not guesswork.
          </p>
          <ul className="service-includes">
            <li>Full spring rate calculation (fork + shock)</li>
            <li>Linkage correction for your specific kinematics</li>
            <li>Sag and travel targets set for your discipline</li>
            <li>Damper tuning: rebound, compression, HSC/LSC</li>
            <li>Written setup sheet you keep</li>
          </ul>
          <div className="service-footer">
            <span className="service-turnaround">Can be combined with rebuild</span>
          </div>
        </div>

      </div>

      <div className="service-mailin">
        <div className="mailin-header">
          <span className="service-tag">Logistics</span>
          <h2 className="mailin-title">Mail-In Service</h2>
        </div>
        <div className="mailin-body">
          <p>
            Not local to LA? We handle mail-in for all service types. Ship us
            just the damper, or the full fork/shock. We'll inspect on arrival,
            confirm scope and cost before touching anything, then ship back
            once complete.
          </p>
          <p>
            Use a rigid box with plenty of padding — forks especially. Include
            a note with your name, email, and what you're noticing. We'll
            contact you within 24 hours of receipt.
          </p>
          <div className="mailin-steps">
            <div className="mailin-step">
              <span className="mailin-step-num">01</span>
              <div>
                <strong>Email us first</strong>
                <span> — confirm scope and get the ship-to address</span>
              </div>
            </div>
            <div className="mailin-step">
              <span className="mailin-step-num">02</span>
              <div>
                <strong>Ship it</strong>
                <span> — well packed, with a note inside</span>
              </div>
            </div>
            <div className="mailin-step">
              <span className="mailin-step-num">03</span>
              <div>
                <strong>We confirm and quote</strong>
                <span> — within 24h of arrival</span>
              </div>
            </div>
            <div className="mailin-step">
              <span className="mailin-step-num">04</span>
              <div>
                <strong>Shipped back</strong>
                <span> — with a full service report</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="service-cta">
        <p>Ready to book or have questions?</p>
        <a href="/contact" className="cta-btn">Get in touch →</a>
      </div>

    </div>
  )
}
