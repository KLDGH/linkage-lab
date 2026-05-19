export default function AboutPage() {
  return (
    <div className="page">
      <div className="page-hero">
        <p className="page-eyebrow">Who's behind this</p>
        <h1 className="page-title">About</h1>
        <p className="page-lead">
          Suspension tuning and tool building.
        </p>
      </div>

      <div className="about-body">
        <div className="about-main">

          <p className="about-graf about-graf-lead">
            Solitaire Dynamics is one person. I tune suspension and build tools —
            the tools when the ones that exist aren&apos;t good enough, or when
            someone built something great and then disappeared.
          </p>

          <p className="about-graf">
            Tuning means spring rate, shim stack, valve configuration, fluid
            weight. The mechanical work — pulling shocks apart, replacing seals —
            is how you execute the tune. I got into this properly in the PNW,
            where short seasons mean a bad setup costs you riding days you
            can&apos;t get back. A damper rebuilt to factory spec won&apos;t perform
            if the valving was tuned for someone 40 lbs lighter, or the spring
            rate was never right to begin with. Those variables compound.
          </p>

          <p className="about-graf">
            The spring calculator on this site is free and improving all the
            time. I built it because I saw too many riders on the wrong spring
            or being told &quot;just run 30% sag&quot; with no reasoning behind it.
          </p>

          <p className="about-graf">
            The linkage analysis tool is newer — still early, still being
            calibrated against real bike data. The goal is something close
            to what Linkage Design did before it went dark: full kinematic
            analysis from actual pivot geometry, not heuristics.
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
              <span className="about-stat-val">Free, open to everyone</span>
              <span className="about-stat-label">Spring calculator</span>
            </div>
          </div>
        </div>

        <div className="about-sidebar">
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">Based in</span>
            <span className="about-sidebar-val">Los Angeles, CA</span>
          </div>
  
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">Tools</span>
            <span className="about-sidebar-val">Spring Calculator · Linkage Analysis</span>
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
