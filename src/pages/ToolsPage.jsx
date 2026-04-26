import SpringCalculator from '../components/SpringCalculator'
import LeverageCurve from '../components/LeverageCurve'
import LinkageAnalysis from '../components/LinkageAnalysis'

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
          <a href="#analysis" className="tab-link tab-link-alpha">
            03 · Linkage Analysis <span className="tab-alpha-badge">α</span>
          </a>
        </nav>
      </div>

      <div id="spring">
        <SpringCalculator />
      </div>
      <div id="leverage">
        <LeverageCurve />
      </div>
      <div id="analysis">
        <LinkageAnalysis />
      </div>
    </>
  )
}
