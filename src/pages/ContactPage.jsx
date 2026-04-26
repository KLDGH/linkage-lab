export default function ContactPage() {
  return (
    <div className="page">
      <div className="page-hero">
        <p className="page-eyebrow">Get in touch</p>
        <h1 className="page-title">Contact</h1>
        <p className="page-lead">
          Questions about a service, want to send us your suspension, or just
          want to talk setup? Reach out. We typically respond within one
          business day.
        </p>
      </div>

      <div className="contact-layout">

        <div className="contact-main">
          <div className="contact-card">
            <div className="contact-method">
              <span className="contact-method-label">Email</span>
              <a href="mailto:hello@solitairedynamics.com" className="contact-method-val contact-link">
                hello@solitairedynamics.com
              </a>
              <span className="contact-method-note">Best for service inquiries and mail-in requests</span>
            </div>
            <div className="contact-method">
              <span className="contact-method-label">Instagram</span>
              <a
                href="https://instagram.com/solitairedynamics"
                target="_blank"
                rel="noreferrer"
                className="contact-method-val contact-link"
              >
                @solitairedynamics
              </a>
              <span className="contact-method-note">DMs open — good for quick questions</span>
            </div>
            <div className="contact-method">
              <span className="contact-method-label">Location</span>
              <span className="contact-method-val">Los Angeles, CA</span>
              <span className="contact-method-note">Local drop-off available — email first to coordinate</span>
            </div>
          </div>
        </div>

        <div className="contact-sidebar">
          <div className="contact-info-block">
            <h3 className="contact-info-title">Before you email</h3>
            <p className="contact-info-body">
              If you&apos;re asking about spring rate or setup, try the{' '}
              <a href="/" className="contact-link">LinkageLab</a>{' '}
              first — it covers most common questions about spring rate and
              linkage correction.
            </p>
          </div>

          <div className="contact-info-block">
            <h3 className="contact-info-title">Mail-in inquiries</h3>
            <p className="contact-info-body">
              Email us first to confirm scope and get the current ship-to
              address. Don&apos;t ship without confirming — we want to make sure
              we can take the job before you pay for shipping.
            </p>
          </div>

          <div className="contact-info-block">
            <h3 className="contact-info-title">Turnaround</h3>
            <p className="contact-info-body">
              Most jobs are 5–7 business days from receipt. If you have a
              deadline (race, trip) let us know upfront and we&apos;ll tell you
              if we can accommodate it.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
