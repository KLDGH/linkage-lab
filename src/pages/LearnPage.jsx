import BumpVelocity from '../components/learn/BumpVelocity'
import Packing from '../components/learn/Packing'
import Clickers from '../components/learn/Clickers'
import AxlePath from '../components/learn/AxlePath'
import CollapsibleSection from '../components/CollapsibleSection'

// Each entry is one explainer. Add new modules here — they render in order,
// numbered, so later concepts can build on earlier ones.
const MODULES = [
  {
    id: 'bump-velocity',
    num: '01',
    title: 'Velocity, not position',
    subtitle: 'Why a damper responds to how fast the suspension moves — not where it sits in the travel.',
    Component: BumpVelocity,
  },
  {
    id: 'packing',
    num: '02',
    title: 'Packing and rebound',
    subtitle: 'Why rebound damping matters most across repeated hits — and how to tell when it\'s wrong.',
    Component: Packing,
  },
  {
    id: 'clickers',
    num: '03',
    title: 'What your clickers do',
    subtitle: 'How low- and high-speed compression and rebound each reshape one curve — and which terrain each one is for.',
    Component: Clickers,
  },
  {
    id: 'axle-path',
    num: '04',
    title: 'Axle path and chain growth',
    subtitle: 'Where the rear wheel travels, why rearward paths eat square edges, and what that costs in pedal kickback.',
    Component: AxlePath,
  },
]

export default function LearnPage() {
  return (
    <div className="page">
      <div className="learn-head">
        <h1 className="learn-title">Learn</h1>
        <p className="learn-intro">
          Interactive explainers for the ideas behind suspension setup, and what
          each one means for your own tuning.
        </p>
      </div>

      {MODULES.map((m) => {
        const C = m.Component
        return (
          <CollapsibleSection key={m.id} id={m.id} tag={m.num} title={m.title}>
            <p className="learn-subtitle">{m.subtitle}</p>
            <C />
          </CollapsibleSection>
        )
      })}
    </div>
  )
}
