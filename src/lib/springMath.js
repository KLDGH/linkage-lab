// All weights in kg, distances in mm, forces in N, spring rates in N/mm

export const SAG_PRESETS = [
  { label: 'XC', pct: 0.20 },
  { label: 'Trail', pct: 0.28 },
  { label: 'Enduro', pct: 0.30 },
  { label: 'DH', pct: 0.33 },
]

export const G = 9.81 // m/s² → N per kg

export function leverageRatio(wheelTravelMm, shockStrokeMm) {
  if (!shockStrokeMm || shockStrokeMm === 0) return null
  return wheelTravelMm / shockStrokeMm
}

// Virtual work: F_shock = F_wheel / LR
// At sag: k × (sag_frac × stroke_mm) = (totalKg × G × rearFrac) / LR
// → k (N/mm) = (totalKg × G × rearFrac) / (LR × sag_frac × stroke_mm)
export function springRateNmm(totalKg, rearFrac, lr, sagFrac, strokeMm) {
  if (!lr || lr === 0 || !strokeMm || strokeMm === 0) return null
  return (totalKg * G * rearFrac) / (lr * sagFrac * strokeMm)
}

// N/mm → kg/mm (common on spring labels)
export function nmmToKgmm(nmm) {
  return nmm / G
}
