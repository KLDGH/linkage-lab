import SpringCalculator from '../components/SpringCalculator'
import LeverageCurve from '../components/LeverageCurve'
import LinkageAnalysis from '../components/LinkageAnalysis'

export default function ToolsPage() {
  return (
    <>
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
