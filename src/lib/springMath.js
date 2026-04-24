// All weights in lbs, distances in inches unless noted
// Spring rate output in lb/in

export const SAG_PRESETS = [
  { label: 'XC', pct: 0.20 },
  { label: 'Trail', pct: 0.28 },
  { label: 'Enduro', pct: 0.30 },
  { label: 'DH', pct: 0.33 },
]

export function leverageRatio(wheelTravel, shockStroke) {
  if (!shockStroke || shockStroke === 0) return null
  return wheelTravel / shockStroke
}

// Virtual work: F_shock = F_wheel / LR, spring must provide F_shock at sag
// k = F_wheel / (LR * sag_frac * stroke)
export function springRate(totalWeightLbs, rearPct, lr, sagFrac, strokeIn) {
  if (!lr || lr === 0 || !strokeIn || strokeIn === 0) return null
  const rearForce = totalWeightLbs * rearPct
  return rearForce / (lr * sagFrac * strokeIn)
}

// Newton's to kg/mm
export function lbinToNmm(lbin) {
  return lbin * 0.17513
}

export function kgToLbs(kg) { return kg * 2.20462 }
export function lbsToKg(lbs) { return lbs / 2.20462 }
export function mmToIn(mm) { return mm / 25.4 }
export function inToMm(inches) { return inches * 25.4 }

export function sagMm(wheelTravelMm, sagFrac) {
  return wheelTravelMm * sagFrac
}
