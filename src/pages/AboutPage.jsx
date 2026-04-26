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
            Most suspension work in the industry is mechanical: pull it apart,
            replace seals, put it back together. That&apos;s necessary, but it&apos;s
            not the full picture. If your spring rate is wrong for your weight
            and bike geometry, fresh oil won&apos;t fix it. If your sag is set for
            a different discipline, no amount of clicker adjustment will make
            it feel right.
          </p>

          <p className="about-graf">
            We built <strong>LinkageLab</strong> because we got tired of seeing
            riders on the wrong spring — or worse, being told &quot;just run 30%
            sag&quot; as if that number means the same thing on a DW-Link bike and
            a CBF. It doesn&apos;t. The leverage ratio at sag is what matters, and
            that varies a lot by linkage design. The tool is free, public,
            and open source. Use it. If the math sends you down a rabbit hole,
            that&apos;s the point.
          </p>

          <p className="about-graf">
            When you send us your suspension, we run the numbers first. Every
            rebuild comes with a setup sheet. If you&apos;re on the wrong spring
            we&apos;ll tell you before we start the wrench work.
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
          <div className="about-sidebar-block">
            <span className="about-sidebar-label">GitHub</span>
            <a
              href="https://github.com/KLDGH/linkage-lab"
              target="_blank"
              rel="noreferrer"
              className="about-sidebar-link"
            >
              KLDGH / linkage-lab
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
