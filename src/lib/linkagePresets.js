// Each preset defines a leverage ratio curve as an array of
// { travel: 0..1 (fraction of full travel), lr: leverage ratio }
// Representative shapes based on published data for each archetype.

export const LINKAGE_PRESETS = [
  {
    id: 'horst',
    name: 'Horst Link (4-bar)',
    examples: 'Trek, Specialized FSR, GT Sensor',
    color: '#38bdf8',
    description: 'Slightly falling ratio — progressive spring feel, moderate anti-squat',
    points: [
      { t: 0.00, lr: 3.20 },
      { t: 0.10, lr: 3.15 },
      { t: 0.20, lr: 3.08 },
      { t: 0.30, lr: 3.00 },
      { t: 0.40, lr: 2.93 },
      { t: 0.50, lr: 2.87 },
      { t: 0.60, lr: 2.82 },
      { t: 0.70, lr: 2.78 },
      { t: 0.80, lr: 2.74 },
      { t: 0.90, lr: 2.70 },
      { t: 1.00, lr: 2.66 },
    ],
  },
  {
    id: 'vpp',
    name: 'VPP (Virtual Pivot Point)',
    examples: 'Santa Cruz, Intense',
    color: '#fb923c',
    description: 'Falling then rising — mid-stroke support, bump compliance at end stroke',
    points: [
      { t: 0.00, lr: 3.30 },
      { t: 0.10, lr: 3.15 },
      { t: 0.20, lr: 2.98 },
      { t: 0.30, lr: 2.85 },
      { t: 0.40, lr: 2.78 },
      { t: 0.50, lr: 2.76 },
      { t: 0.60, lr: 2.80 },
      { t: 0.70, lr: 2.88 },
      { t: 0.80, lr: 2.98 },
      { t: 0.90, lr: 3.10 },
      { t: 1.00, lr: 3.25 },
    ],
  },
  {
    id: 'dwlink',
    name: 'DW-Link',
    examples: 'Ibis, Pivot, Evil',
    color: '#d97706',
    description: 'Strongly progressive — ramps up through stroke, excellent small-bump sensitivity',
    points: [
      { t: 0.00, lr: 3.50 },
      { t: 0.10, lr: 3.38 },
      { t: 0.20, lr: 3.24 },
      { t: 0.30, lr: 3.08 },
      { t: 0.40, lr: 2.92 },
      { t: 0.50, lr: 2.76 },
      { t: 0.60, lr: 2.60 },
      { t: 0.70, lr: 2.46 },
      { t: 0.80, lr: 2.34 },
      { t: 0.90, lr: 2.24 },
      { t: 1.00, lr: 2.16 },
    ],
  },
  {
    id: 'singlepivot',
    name: 'Single Pivot',
    examples: 'Many hardtails, older designs',
    color: '#f87171',
    description: 'Constant ratio — linear spring behavior, no progressive feel',
    points: [
      { t: 0.00, lr: 3.00 },
      { t: 0.25, lr: 3.00 },
      { t: 0.50, lr: 3.00 },
      { t: 0.75, lr: 3.00 },
      { t: 1.00, lr: 3.00 },
    ],
  },
  {
    id: 'flexstay',
    name: 'Flex Stay / UDH',
    examples: 'Yeti SB, Rocky Mountain Instinct',
    color: '#e879f9',
    description: 'Mildly falling — simple, low friction, slightly progressive',
    points: [
      { t: 0.00, lr: 3.10 },
      { t: 0.20, lr: 3.05 },
      { t: 0.40, lr: 2.98 },
      { t: 0.60, lr: 2.90 },
      { t: 0.80, lr: 2.82 },
      { t: 1.00, lr: 2.74 },
    ],
  },
]

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

export function averageLr(preset) {
  const pts = preset.points
  let sum = 0
  for (let i = 0; i < pts.length - 1; i++) {
    sum += (pts[i].lr + pts[i + 1].lr) / 2 * (pts[i + 1].t - pts[i].t)
  }
  return sum
}
