// Each preset defines a leverage ratio curve as an array of
// { travel: 0..1 (fraction of full travel), lr: leverage ratio }
// Representative shapes based on published data for each archetype.

export const LINKAGE_PRESETS = [
  {
    id: 'horst',
    prog: 24,
    name: 'Progressive linear — moderate correction',
    feel: 'active off the top, steady progressive ramp',
    examples: 'Transition Sentinel, Specialized FSR, many Horst/four-bar bikes',
    color: '#38bdf8',
    description: 'Consistently falling LR curve (Progressive Linear shape). LR at sag is ~5% above the travel average, so the spring needs to work harder than geometry alone suggests. Curve based on measured 2025 Transition Sentinel V3: start 2.85 → sag 2.60 → end 2.17, 23.9% progression.',
    points: [
      { t: 0.00, lr: 3.36 },
      { t: 0.10, lr: 3.26 },
      { t: 0.20, lr: 3.16 },
      { t: 0.30, lr: 3.07 },
      { t: 0.40, lr: 2.98 },
      { t: 0.50, lr: 2.89 },
      { t: 0.60, lr: 2.81 },
      { t: 0.70, lr: 2.74 },
      { t: 0.80, lr: 2.67 },
      { t: 0.90, lr: 2.60 },
      { t: 1.00, lr: 2.56 },
    ],
  },
  {
    id: 'vpp',
    prog: 27,
    name: 'Progressive linear — high LR at top',
    feel: 'very supple off the top, strong progressive ramp',
    examples: 'Santa Cruz Bronson/Megatower, Intense (modern VPP)',
    color: '#2dd4bf',
    description: 'Steeply falling progressive curve — starts with a high LR (very supple at top of travel) and falls consistently through the stroke. Modern VPP bikes are not the mid-stroke-support bathtub curve of older designs. Curve based on measured 2025 Santa Cruz Bronson V5: start 3.08 → sag 2.75 → end 2.26, 26.6% progression. LR at sag is ~6% above average.',
    points: [
      { t: 0.00, lr: 3.08 },
      { t: 0.10, lr: 2.96 },
      { t: 0.20, lr: 2.85 },
      { t: 0.30, lr: 2.75 },
      { t: 0.40, lr: 2.66 },
      { t: 0.50, lr: 2.56 },
      { t: 0.60, lr: 2.48 },
      { t: 0.70, lr: 2.40 },
      { t: 0.80, lr: 2.34 },
      { t: 0.90, lr: 2.29 },
      { t: 1.00, lr: 2.26 },
    ],
  },
  {
    id: 'dwlink',
    prog: 30,
    name: 'PBLE — very high LR at sag',
    feel: 'very active off the top, biggest spring correction of any type',
    examples: 'Ibis Ripmo, Pivot, Evil, DW-Link and Yoke (Maestro) bikes',
    color: '#facc15',
    description: 'Progressive Beginning, Linear Ending — drops very steeply in the first third of travel (where sag sits) then becomes more gradual. LR at sag is ~14% above the travel average — the largest correction of any linkage type. Significantly stiffer spring needed vs geometric baseline. Curve based on measured 2025 Ibis Ripmo V3: start 3.3 → sag 2.85 → end 2.3, 30.3% progression.',
    points: [
      { t: 0.00, lr: 3.50 },
      { t: 0.10, lr: 3.34 },
      { t: 0.20, lr: 3.18 },
      { t: 0.30, lr: 3.08 },
      { t: 0.40, lr: 2.82 },
      { t: 0.50, lr: 2.60 },
      { t: 0.60, lr: 2.43 },
      { t: 0.70, lr: 2.30 },
      { t: 0.80, lr: 2.22 },
      { t: 0.90, lr: 2.17 },
      { t: 1.00, lr: 2.12 },
    ],
  },
  {
    id: 'singlepivot',
    prog: 0,
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
    prog: 12,
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
    id: 'highpivot',
    prog: 23,
    name: 'High LR at sag, progressive ending',
    feel: 'supple off the top, ramps up hard at end-stroke',
    examples: 'high-pivot designs (Forbidden Druid, Norco Optic, Deviate Claymore)',
    color: '#fb923c',
    description: 'Steeply progressive with a "progressive ending" shape — LR starts high and falls gradually through the first half of travel, then drops sharply toward bottom-out. High-pivot and rearward-axle-path bikes use this curve to stay active and supple early while building strong end-stroke resistance. Validated against two measured bikes: Deviate Claymore (2.97→2.30, 22.6% progression) and Forbidden Druid V2 (2.95→2.25 per Linkage Design analysis) — our preset matches both within 2%.',
    points: [
      { t: 0.00, lr: 2.97 },
      { t: 0.10, lr: 2.93 },
      { t: 0.20, lr: 2.88 },
      { t: 0.30, lr: 2.83 },
      { t: 0.40, lr: 2.77 },
      { t: 0.50, lr: 2.70 },
      { t: 0.60, lr: 2.62 },
      { t: 0.70, lr: 2.52 },
      { t: 0.80, lr: 2.43 },
      { t: 0.90, lr: 2.36 },
      { t: 1.00, lr: 2.30 },
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
