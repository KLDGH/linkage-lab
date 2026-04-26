export default function AboutPage() {
  return (
    <div className="page">
      <div className="page-hero">
        <p className="page-eyebrow">Who we are</p>
        <h1 className="page-title">About</h1>
      </div>

      <div className="about-body">
        <div className="about-main">
          <p className="about-graf about-graf-lead">
            Solitaire Dynamics is a boutique MTB suspension service based in
            Los Angeles. We started in Jackson Hole — where the trails are
            rough, the seasons are short, and your suspension setup actually
            matters — and brought that mindset south.
          </p>

          <p className="about-graf">
            Good suspension service goes deeper than fresh seals and oil.
            Spring rate, sag, shim stack tuning, valve configuration, fluid
            viscosity — every variable compounds. A damper rebuilt to factory
            spec still won&apos;t perform if the shim stack is stacked for a
            different rider weight or riding style. We look at the whole
            system, not just the part in the stand.
          </p>

          <p className="about-graf">
            Most suspension work in the industry stops at mechanical:
            pull it apart, replace seals, put it back together. That&apos;s
            necessary. But if your spring rate is wrong for your weight
            and geometry, or your valving is tuned for someone 40 lbs
            lighter, fresh oil won&apos;t fix how it feels on trail.
          </p>

          <p className="about-graf">
            We built <strong>LinkageLab</strong> because we got tired of seeing
            riders on the wrong spring — or worse, being told &quot;just run 30%
            sag&quot; as if that number means the same thing on a DW-Link bike and
            a CBF. It doesn&apos;t. The tool is free and public. Use it.
          </p>

          <p className="about-graf">
            When you send us your suspension, we run the numbers first. Every
            rebuild comes with a setup sheet. If you&apos;re on the wrong spring
            or your valving needs attention, we&apos;ll tell you before we
            start the wrench work.
          </p>

          <div className="about-divider" />

          <div className="about-stats">
            <div className="about-stat">
              <span className="about-stat-val">Fox · RockShox · Öhlins · Cane Creek</span>
              <span className="about-stat-label">Brands serviced</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-val">LA + Mail-in</span>
              <span className="about-stat-label">Service options</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-val">Open source</span>
              <span className="about-stat-label">LinkageLab — free tool</span>
            </div>
          </div>
        </div>

        <div className="about-sidebar">
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">Based in</span>
            <span className="about-sidebar-val">Los Angeles, CA</span>
          </div>
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">Background</span>
            <span className="about-sidebar-val">Jackson Hole, WY</span>
          </div>
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">Tools we build</span>
            <span className="about-sidebar-val">LinkageLab</span>
          </div>
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">Instagram</span>
            <a
              href="https://instagram.com/solitairedynamics"
              target="_blank"
              rel="noreferrer"
              className="about-sidebar-link"
            >
              @solitairedynamics
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
