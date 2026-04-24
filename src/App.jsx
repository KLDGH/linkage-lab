import SpringCalculator from './components/SpringCalculator'
import LeverageCurve from './components/LeverageCurve'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">LINKAGE<span className="logo-accent">LAB</span></span>
          <span className="subtitle">MTB suspension · spring rate calculator · leverage kinematics</span>
        </div>
        <div className="header-right">
          <span className="header-badge">BETA</span>
        </div>
      </header>

      <nav className="tab-nav">
        <a href="#spring" className="tab-link">01 · Spring Calculator</a>
        <a href="#leverage" className="tab-link">02 · Leverage Curves</a>
      </nav>

      <div id="spring">
        <SpringCalculator />
      </div>
      <div id="leverage">
        <LeverageCurve />
      </div>

      <footer className="footer">
        <span>LINKAGELAB · spring rates are theoretical — always validate with your specific bike geometry</span>
        <a href="https://github.com/KLDGH/linkage-lab" target="_blank" rel="noreferrer" className="footer-link">GitHub</a>
      </footer>
    </div>
  )
}
