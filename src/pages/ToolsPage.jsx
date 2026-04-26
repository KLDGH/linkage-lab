import SpringCalculator from '../components/SpringCalculator'
import LeverageCurve from '../components/LeverageCurve'

export default function ToolsPage() {
  return (
    <>
      <div className="tools-bar">
        <div className="tools-bar-left">
          <span className="tools-logo">LINKAGE<span className="logo-accent">LAB</span></span>
          <span className="header-badge">BETA</span>
        </div>
        <nav className="tab-nav">
          <a href="#spring" className="tab-link">01 · Spring Calculator</a>
          <a href="#leverage" className="tab-link">02 · Leverage Curves</a>
        </nav>
      </div>

      <div id="spring">
        <SpringCalculator />
      </div>
      <div id="leverage">
        <LeverageCurve />
      </div>
    </>
  )
}
