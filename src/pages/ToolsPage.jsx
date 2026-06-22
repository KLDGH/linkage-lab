import SpringCalculator from '../components/SpringCalculator'
import LeverageCurve from '../components/LeverageCurve'
import LinkageAnalysis from '../components/LinkageAnalysis'
import CollapsibleSection from '../components/CollapsibleSection'

export default function ToolsPage() {
  return (
    <>
      <CollapsibleSection id="spring" tag="01" title="Spring Rate Calculator">
        <SpringCalculator />
      </CollapsibleSection>
      <CollapsibleSection id="leverage" tag="02" title="Leverage Ratio Curves">
        <LeverageCurve />
      </CollapsibleSection>
      <CollapsibleSection
        id="analysis"
        tag="03"
        title="Linkage Analysis"
        badge={<span className="header-badge" style={{ background: 'var(--purple)', border: 'none' }}>ALPHA</span>}
      >
        <LinkageAnalysis />
      </CollapsibleSection>
    </>
  )
}
