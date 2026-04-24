// All weights in kg, distances in mm, forces in N, spring rates in N/mm

// Coil-shock practical sag targets (XC excluded — XC runs air shocks)
export const SAG_PRESETS = [
  { label: 'Trail',   pct: 0.25 },
  { label: 'Enduro',  pct: 0.28 },
  { label: 'DH',      pct: 0.30 },
  { label: 'DH Race', pct: 0.33 },
]

export const G = 9.81 // m/s² → N per kg

export function leverageRatio(wheelTravelMm, shockStrokeMm) {
  if (!shockStrokeMm || shockStrokeMm === 0) return null
  return wheelTravelMm / shockStrokeMm
}

// Virtual work: shock moves dWheel/LR per mm of wheel travel, so spring must push LR× harder.
// F_spring = F_wheel × LR → k × (sag_frac × stroke_mm) = totalKg × G × rearFrac × LR
// → k (N/mm) = (totalKg × G × rearFrac × LR) / (sag_frac × stroke_mm)
export function springRateNmm(totalKg, rearFrac, lr, sagFrac, strokeMm) {
  if (!lr || lr === 0 || !strokeMm || strokeMm === 0) return null
  return (totalKg * G * rearFrac * lr) / (sagFrac * strokeMm)
}

export function nmmToKgmm(nmm) { return nmm / G }
export function nmmToLbin(nmm) { return nmm * 5.71015 }
