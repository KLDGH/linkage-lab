// Measured bike presets — real leverage curves, one bike at a time.
//
// Each entry carries the bike's LR curve as { t, lr } points (t = fraction of
// wheel travel). Anchors (start / sag / end, and average where published) come
// from measured kinematic data; intermediate points are smooth interpolations
// following the curve's measured shape class. Only the Druid V2 has a full
// fitted curve from a complete published graph.
//
// travel/stroke: stroke is chosen so travel ÷ stroke reproduces the measured
// average LR, which makes the calculator's effective LR at sag land on the
// bike's measured sag LR. VERIFY the flagged strokes against real spec sheets
// before trusting them blindly.
//
// To add a bike: append an entry here. No other code changes needed.

export const BIKE_PRESETS = [
  {
    id: 'druid-v2',
    name: 'Forbidden Druid V2',
    year: '2023',
    travel: 130,
    stroke: 50, // verified: 185×50 shock, avg LR 2.60 = 130/50
    // Full fitted curve: lr(t) = 2.25 + 0.66·(1−t)^1.3
    // Sources agree within ~1%: 2.93→2.68@sag→2.25 (meas.), 2.95→2.25, 2.91 start (graph)
    points: [
      { t: 0.0, lr: 2.91 }, { t: 0.1, lr: 2.83 }, { t: 0.2, lr: 2.74 },
      { t: 0.3, lr: 2.67 }, { t: 0.4, lr: 2.59 }, { t: 0.5, lr: 2.52 },
      { t: 0.6, lr: 2.45 }, { t: 0.7, lr: 2.39 }, { t: 0.8, lr: 2.33 },
      { t: 0.9, lr: 2.28 }, { t: 1.0, lr: 2.25 },
    ],
  },
  {
    id: 'sentinel-v3',
    name: 'Transition Sentinel V3',
    year: '2025',
    travel: 150,
    stroke: 60, // VERIFY — derived from measured avg LR ≈ 2.47 (150/60 = 2.50)
    // Anchors measured: 2.85 → 2.60 @ 30% sag → 2.17, 23.9% progression (PL shape)
    points: [
      { t: 0.0, lr: 2.85 }, { t: 0.1, lr: 2.77 }, { t: 0.2, lr: 2.68 },
      { t: 0.3, lr: 2.60 }, { t: 0.4, lr: 2.53 }, { t: 0.5, lr: 2.45 },
      { t: 0.6, lr: 2.38 }, { t: 0.7, lr: 2.32 }, { t: 0.8, lr: 2.26 },
      { t: 0.9, lr: 2.21 }, { t: 1.0, lr: 2.17 },
    ],
  },
  {
    id: 'bronson-v5',
    name: 'Santa Cruz Bronson V5',
    year: '2025',
    travel: 150,
    stroke: 57.5, // VERIFY — derived from measured avg LR ≈ 2.60 (150/57.5 = 2.61)
    // Anchors measured: 3.08 → 2.75 @ 30% sag → 2.26, 26.6% progression (falling progressive)
    points: [
      { t: 0.0, lr: 3.08 }, { t: 0.1, lr: 2.96 }, { t: 0.2, lr: 2.85 },
      { t: 0.3, lr: 2.75 }, { t: 0.4, lr: 2.66 }, { t: 0.5, lr: 2.56 },
      { t: 0.6, lr: 2.48 }, { t: 0.7, lr: 2.40 }, { t: 0.8, lr: 2.34 },
      { t: 0.9, lr: 2.29 }, { t: 1.0, lr: 2.26 },
    ],
  },
  {
    id: 'ripmo-v3',
    name: 'Ibis Ripmo V3',
    year: '2025',
    travel: 147,
    stroke: 55, // VERIFY — derived from curve avg LR ≈ 2.67 (147/55 = 2.67)
    // Anchors measured: 3.3 → 2.85 @ 30% sag → 2.3, 30.3% progression (PBLE shape).
    // NOTE: interpolating through the real anchors gives a sag correction of
    // ~+7%, not the +14% the DW-Link archetype carries — one of the two needs
    // rechecking against the original Avalanche sheet.
    points: [
      { t: 0.0, lr: 3.30 }, { t: 0.1, lr: 3.15 }, { t: 0.2, lr: 3.00 },
      { t: 0.3, lr: 2.85 }, { t: 0.4, lr: 2.71 }, { t: 0.5, lr: 2.59 },
      { t: 0.6, lr: 2.49 }, { t: 0.7, lr: 2.42 }, { t: 0.8, lr: 2.36 },
      { t: 0.9, lr: 2.32 }, { t: 1.0, lr: 2.30 },
    ],
  },
  {
    id: 'claymore',
    name: 'Deviate Claymore',
    year: '2022',
    travel: 165,
    stroke: 62.5, // VERIFY — derived from curve avg LR ≈ 2.67 (165/62.5 = 2.64)
    // Anchors measured: 2.97 → ~2.83 @ 30% sag → 2.30, 22.6% progression
    // (high-pivot: gradual early fall, steep progressive ending)
    points: [
      { t: 0.0, lr: 2.97 }, { t: 0.1, lr: 2.93 }, { t: 0.2, lr: 2.88 },
      { t: 0.3, lr: 2.83 }, { t: 0.4, lr: 2.77 }, { t: 0.5, lr: 2.70 },
      { t: 0.6, lr: 2.62 }, { t: 0.7, lr: 2.52 }, { t: 0.8, lr: 2.43 },
      { t: 0.9, lr: 2.36 }, { t: 1.0, lr: 2.30 },
    ],
  },
]
