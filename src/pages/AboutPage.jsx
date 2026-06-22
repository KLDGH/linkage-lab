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
            Solitaire Dynamics is a one-person suspension shop. The work is
            spring rate, valving, shim stacks, and fluid selection, set for a
            specific rider and bike.
          </p>

          <p className="about-graf">
            The spring rate calculator here is free. It exposes its assumptions,
            takes rear weight bias as a direct input, and corrects leverage ratio
            at the sag point. Every number it returns is one you can check.
          </p>

          <p className="about-graf">
            The linkage analysis tool is in development, calibrated against
            measured bikes as they are added. It computes leverage ratio,
            anti-squat, and pedal kickback from pivot coordinates.
          </p>
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
