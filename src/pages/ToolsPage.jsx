import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SpringCalculator from '../components/SpringCalculator'
import BikeCompare from '../components/BikeCompare'
import CollapsibleSection from '../components/CollapsibleSection'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function ToolsPage() {
  useDocumentTitle('Spring Rate Calculator')
  const { hash } = useLocation()

  // The comparison can hand a bike to the calculator. The counter makes
  // picking the same bike twice still count as a new request.
  const [requestedBike, setRequestedBike] = useState(null)
  const sendBikeToCalculator = (id) => {
    setRequestedBike((r) => ({ id, n: (r?.n ?? 0) + 1 }))
    requestAnimationFrame(() =>
      document.getElementById('spring')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  // Links like /#compare land on that section.
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [hash])

  return (
    <>
      <CollapsibleSection id="spring" tag="01" title="Spring Rate Calculator" openSignal={requestedBike}>
        <SpringCalculator requestedBike={requestedBike} />
      </CollapsibleSection>
      <CollapsibleSection id="compare" tag="02" title="Compare Leverage Curves">
        <BikeCompare onUseBike={sendBikeToCalculator} />
      </CollapsibleSection>
    </>
  )
}
