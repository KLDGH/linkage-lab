// Each preset defines a leverage ratio curve as an array of
// { travel: 0..1 (fraction of full travel), lr: leverage ratio }
// Representative shapes based on published data for each archetype.

export const LINKAGE_PRESETS = [
  {
    id: 'horst',
    name: 'Moderately high LR at sag',
    feel: 'slightly higher leverage at sag, mild progression',
    examples: 'many Horst/FSR and flex-stay designs',
    color: '#38bdf8',
    description: 'Slightly falling rate — LR is above average at sag, drops gently through stroke. Slightly stiffer spring than geometric LR alone. Covers Horst-link / FSR 4-bar and most flex-stay designs.',
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
    name: 'Slightly low LR at sag',
    feel: 'balanced, mild progression',
    examples: 'many VPP-style bikes (Santa Cruz, Intense)',
    color: '#2dd4bf',
    description: 'Falling then rising — LR is slightly below average at sag. Slightly softer spring than geometric LR alone. VPP and dual-link designs. Not all bikes with this linkage name behave the same.',
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
    name: 'Very high LR at sag',
    feel: 'early-stroke active, noticeably stiffer spring needed',
    examples: 'many DW-Link and Maestro bikes',
    color: '#facc15',
    description: 'Steeply falling rate — LR is well above average at sag, drops sharply through stroke. Noticeably stiffer spring than geometric LR alone. Not all DW-Link or Maestro bikes are identical — this is a representative curve.',
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
    name: 'Linear / Flat Rate',
    feel: 'consistent feel, no progressive ramp',
    examples: 'Evil Delta, Commencal (some), older full-sus',
    color: '#f87171',
    description: 'Flat / linear rate — LR stays constant through travel. LR at sag equals the average, same as geometric travel÷stroke. Shown here for curve comparison only — use Neutral/Unknown in the calculator.',
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
    name: 'Mildly Falling (Flex Stay)',
    feel: 'nearly linear, low friction',
    examples: 'Yeti SB, Rocky Mountain Instinct',
    color: '#e879f9',
    description: 'Mildly falling rate — LR slightly above average at sag, nearly constant. Similar to Moderately High but smaller correction. Shown here for curve comparison — in the calculator use Moderately High LR at sag.',
    points: [
      { t: 0.00, lr: 3.10 },
      { t: 0.20, lr: 3.05 },
      { t: 0.40, lr: 2.98 },
      { t: 0.60, lr: 2.90 },
      { t: 0.80, lr: 2.82 },
      { t: 1.00, lr: 2.74 },
    ],
  },
  {
    id: 'cbf',
    name: 'Low LR at sag',
    feel: 'progressive, more support deeper in travel',
    examples: 'rising-rate designs (Canfield, Revel)',
    color: '#fb923c',
    description: 'Rising rate — LR increases through stroke, opposite of most designs. LR at sag is well below average, so softer spring than geometric LR alone. CBF and similar rising-rate linkages.',
    points: [
      { t: 0.00, lr: 2.70 },
      { t: 0.10, lr: 2.75 },
      { t: 0.20, lr: 2.82 },
      { t: 0.30, lr: 2.90 },
      { t: 0.40, lr: 2.99 },
      { t: 0.50, lr: 3.08 },
      { t: 0.60, lr: 3.16 },
      { t: 0.70, lr: 3.23 },
      { t: 0.80, lr: 3.29 },
      { t: 0.90, lr: 3.34 },
      { t: 1.00, lr: 3.38 },
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
