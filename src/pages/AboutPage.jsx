export default function AboutPage() {
  return (
    <div className="page">
      <div className="page-hero">
        <p className="page-eyebrow">Who's behind this</p>
        <h1 className="page-title">About</h1>
        <p className="page-lead">
          Suspension service and tool building out of Los Angeles.
        </p>
      </div>

      <div className="about-body">
        <div className="about-main">

          <p className="about-graf about-graf-lead">
            Solitaire Dynamics is one person. I do suspension work and I build
            tools when the ones that exist aren't good enough — or when
            someone built something great and then disappeared.
          </p>

          <p className="about-graf">
            I got into this properly in the PNW. Short seasons mean a bad
            setup costs you riding days you can't get back — and good suspension
            work turned out to mean
            more than fresh seals. Spring rate, sag, shim stack, valve
            configuration, fluid viscosity — every variable compounds. A damper
            rebuilt to factory spec still won't perform if the valving is
            tuned for someone 40 lbs lighter or the spring rate was never
            right to begin with.
          </p>


          <p className="about-graf">
            I built <strong>LinkageLab</strong> because I saw too many riders
            on the wrong spring or being told &quot;just run 30% sag&quot;. The tool
            is free and improving all the time.
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
              <span className="about-stat-label">LinkageLab</span>
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
            <span className="about-sidebar-val">LinkageLab · Linkage Analysis</span>
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
