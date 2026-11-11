// Bike presets: real leverage curves, one bike at a time.
//
// Each entry carries the bike's LR curve as { t, lr } points (t = fraction of
// wheel travel). travel ÷ stroke should reproduce the curve's average LR, which
// makes the calculator's effective LR at sag land on the bike's own LR at sag.
//
// To add a bike: append an entry here. No other code changes needed.

export const BIKE_PRESETS = [
  {
    id: 'druid-v2',
    color: '#7c3aed',
    name: 'Forbidden Druid V2',
    year: '2023',
    travel: 130,
    stroke: 50,
    points: [
      { t: 0.0, lr: 2.98 }, { t: 0.1, lr: 2.884 }, { t: 0.2, lr: 2.80 },
      { t: 0.3, lr: 2.726 }, { t: 0.4, lr: 2.66 }, { t: 0.5, lr: 2.60 },
      { t: 0.6, lr: 2.544 }, { t: 0.7, lr: 2.491 }, { t: 0.8, lr: 2.435 },
      { t: 0.9, lr: 2.369 }, { t: 0.95, lr: 2.329 }, { t: 1.0, lr: 2.264 },
    ],
  },
  {
    id: 'sentinel-v3',
    color: '#0284c7',
    name: 'Transition Sentinel V3',
    year: '2025',
    travel: 150,
    stroke: 60,
    points: [
      { t: 0.0, lr: 2.85 }, { t: 0.1, lr: 2.77 }, { t: 0.2, lr: 2.68 },
      { t: 0.3, lr: 2.60 }, { t: 0.4, lr: 2.53 }, { t: 0.5, lr: 2.45 },
      { t: 0.6, lr: 2.38 }, { t: 0.7, lr: 2.32 }, { t: 0.8, lr: 2.26 },
      { t: 0.9, lr: 2.21 }, { t: 1.0, lr: 2.17 },
    ],
  },
  {
    id: 'bronson-v5',
    color: '#0d9488',
    name: 'Santa Cruz Bronson V5',
    year: '2025',
    travel: 150,
    stroke: 57.5,
    points: [
      { t: 0.0, lr: 3.08 }, { t: 0.1, lr: 2.96 }, { t: 0.2, lr: 2.85 },
      { t: 0.3, lr: 2.75 }, { t: 0.4, lr: 2.66 }, { t: 0.5, lr: 2.56 },
      { t: 0.6, lr: 2.48 }, { t: 0.7, lr: 2.40 }, { t: 0.8, lr: 2.34 },
      { t: 0.9, lr: 2.29 }, { t: 1.0, lr: 2.26 },
    ],
  },
  {
    id: 'ripmo-v3',
    color: '#ca8a04',
    name: 'Ibis Ripmo V3',
    year: '2025',
    travel: 147,
    stroke: 55,
    points: [
      { t: 0.0, lr: 3.30 }, { t: 0.1, lr: 3.15 }, { t: 0.2, lr: 3.00 },
      { t: 0.3, lr: 2.85 }, { t: 0.4, lr: 2.71 }, { t: 0.5, lr: 2.59 },
      { t: 0.6, lr: 2.49 }, { t: 0.7, lr: 2.42 }, { t: 0.8, lr: 2.36 },
      { t: 0.9, lr: 2.32 }, { t: 1.0, lr: 2.30 },
    ],
  },
  {
    id: 'claymore',
    color: '#ea580c',
    name: 'Deviate Claymore',
    year: '2022',
    travel: 165,
    stroke: 62.5,
    points: [
      { t: 0.0, lr: 2.97 }, { t: 0.1, lr: 2.93 }, { t: 0.2, lr: 2.88 },
      { t: 0.3, lr: 2.83 }, { t: 0.4, lr: 2.77 }, { t: 0.5, lr: 2.70 },
      { t: 0.6, lr: 2.62 }, { t: 0.7, lr: 2.52 }, { t: 0.8, lr: 2.43 },
      { t: 0.9, lr: 2.36 }, { t: 1.0, lr: 2.30 },
    ],
  },
  {
    id: 'murmur-enduro-v3',
    color: '#db2777',
    name: 'Starling Murmur Enduro V3',
    year: '2023',
    travel: 150,
    stroke: 60,
    points: [
      { t: 0.0, lr: 2.45 }, { t: 0.3, lr: 2.50 }, { t: 1.0, lr: 2.55 },
    ],
  },
  {
    id: 'sb160',
    color: '#1e3a8a',
    name: 'Yeti SB160',
    year: '2023',
    travel: 160,
    stroke: 65,
    points: [
      { t: 0.0, lr: 2.62 }, { t: 0.1, lr: 2.592 }, { t: 0.2, lr: 2.568 },
      { t: 0.3, lr: 2.543 }, { t: 0.4, lr: 2.519 }, { t: 0.5, lr: 2.494 },
      { t: 0.6, lr: 2.463 }, { t: 0.7, lr: 2.425 }, { t: 0.8, lr: 2.377 },
      { t: 0.85, lr: 2.349 }, { t: 0.9, lr: 2.312 }, { t: 0.95, lr: 2.257 },
      { t: 1.0, lr: 2.17 },
    ],
  },
  {
    id: 'dreadnought-v2',
    color: '#65a30d',
    name: 'Forbidden Dreadnought V2',
    year: '2024',
    travel: 160,
    stroke: 60,
    points: [
      { t: 0.0, lr: 3.068 }, { t: 0.1, lr: 2.961 }, { t: 0.2, lr: 2.87 },
      { t: 0.3, lr: 2.791 }, { t: 0.4, lr: 2.719 }, { t: 0.5, lr: 2.655 },
      { t: 0.6, lr: 2.596 }, { t: 0.7, lr: 2.543 }, { t: 0.8, lr: 2.485 },
      { t: 0.85, lr: 2.45 }, { t: 0.9, lr: 2.409 }, { t: 0.95, lr: 2.356 },
      { t: 1.0, lr: 2.281 },
    ],
  },
]
