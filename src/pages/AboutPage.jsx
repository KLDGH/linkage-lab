import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function AboutPage() {
  useDocumentTitle('About')
  return (
    <div className="page">
      <h1 className="visually-hidden">About</h1>

      <div className="about-body">
        <div className="about-main">

          <p className="about-graf">
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
            The leverage comparison uses curves from published measurements,
            one bike at a time. A kinematics tool that solves anti-squat and
            pedal kickback from pivot coordinates is in development.
          </p>
        </div>

        <div className="about-sidebar">
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">Based in</span>
            <span className="about-sidebar-val">Marin County, CA</span>
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
