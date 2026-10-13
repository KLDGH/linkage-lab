import { BIKE_PRESETS } from './bikePresets'

// Suspension-type archetypes. Each one takes its curve straight from the
// measured bike it is named after, so a type and its source bike can never
// disagree. (They used to carry separate copies of the numbers, and the
// DW-Link copy drifted to an unsourced curve that no measured bike matched.)
//
// The calculator only uses an archetype's SHAPE: it is rescaled onto your own
// travel ÷ stroke. Absolute values only matter for the measured bikes.

const ARCHETYPES = [
  { id: 'horst',     basedOn: 'sentinel-v3' },
  { id: 'vpp',       basedOn: 'bronson-v5' },
  { id: 'dwlink',    basedOn: 'ripmo-v3' },
  { id: 'highpivot', basedOn: 'claymore' },
]

export const LINKAGE_PRESETS = ARCHETYPES.map((a) => {
  const bike = BIKE_PRESETS.find((b) => b.id === a.basedOn)
  return { ...a, bike, color: bike.color, points: bike.points, prog: Math.round(progression(bike.points) * 100) }
})

export function getLrAtTravel(preset, tFrac) {
  const pts = preset.points
  if (tFrac <= pts[0].t) return pts[0].lr
  if (tFrac >= pts[pts.length - 1].t) return pts[pts.length - 1].lr
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    if (tFrac >= a.t && tFrac <= b.t) {
      const frac = (tFrac - a.t) / (b.t - a.t)
      return a.lr + frac * (b.lr - a.lr)
    }
  }
  return pts[0].lr
}

// Travel-weighted average LR (trapezoidal over t ∈ [0, 1]).
export function averageLr(preset) {
  const pts = preset.points
  let sum = 0
  for (let i = 0; i < pts.length - 1; i++) {
    sum += (pts[i].lr + pts[i + 1].lr) / 2 * (pts[i + 1].t - pts[i].t)
  }
  return sum
}

// End-to-end progression: (LR at top − LR at bottom) ÷ LR at top.
export function progression(points) {
  const start = points[0].lr, end = points[points.length - 1].lr
  return (start - end) / start
}
