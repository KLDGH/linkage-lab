import { getLrAtTravel, averageLr } from './linkagePresets'

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

// ── Leverage-curve suspension math ─────────────────────────────────
// Shared by the spring calculator and the bike comparison so both compute
// corrections with exactly the same functions.

// LR at wheel-travel fraction t (0..1), accounting for active preset or custom progression
export function lrAtTravelFrac(t, preset, customProg, geoLR) {
  // A measured curve entered at absolute magnitude (3-point custom) is honored
  // as-is — the numbers read off a published graph ARE the leverage ratio, not
  // just a shape to rescale onto travel÷stroke.
  if (preset && preset.absolute) return getLrAtTravel(preset, t)
  if (!geoLR) return geoLR
  if (customProg !== null) {
    return geoLR * (1 + (customProg / 200) * (1 - 2 * t))
  }
  if (preset) {
    return geoLR * getLrAtTravel(preset, t) / averageLr(preset)
  }
  return geoLR
}

// Given wheel sag fraction, return corresponding shock displacement (mm)
// by integrating 1/LR from 0 to the wheel sag position.
export function shockDispFromWheelSag(wheelSagPct, preset, customProg, geoLR, wheelTravel, N = 100) {
  if (!geoLR || wheelSagPct <= 0) return 0
  const wheelTarget = wheelSagPct * wheelTravel
  const dx = wheelTarget / N
  let shockDisp = 0
  for (let i = 0; i < N; i++) {
    const t = ((i + 0.5) / N) * wheelSagPct
    shockDisp += dx / lrAtTravelFrac(t, preset, customProg, geoLR)
  }
  return shockDisp
}

// When an absolute (entered-magnitude) curve is active, travel + the curve already
// pin the shock stroke: stroke = ∫ 1/LR over the full wheel travel. We derive it so
// the sag/rate math stays internally consistent, instead of over-trusting a typed
// stroke that may not match the curve. Non-absolute presets keep the typed stroke.
export function effectiveStroke(overridePreset, wheelTravel, typedStroke) {
  if (overridePreset && overridePreset.absolute && wheelTravel) {
    const nominal = leverageRatio(wheelTravel, typedStroke) || 1
    return shockDispFromWheelSag(1.0, overridePreset, null, nominal, wheelTravel)
  }
  return typedStroke
}

// Given shock sag fraction (of stroke), return corresponding wheel displacement (mm)
// by integrating up the wheel-travel axis until shock displacement reaches target.
export function wheelDispFromShockSag(shockSagPct, preset, customProg, geoLR, wheelTravel, shockStroke, N = 200) {
  if (!geoLR || shockSagPct <= 0) return 0
  const shockTarget = shockSagPct * shockStroke
  const dx = wheelTravel / N
  let shockAcc = 0
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N
    const lr = lrAtTravelFrac(t, preset, customProg, geoLR)
    const newAcc = shockAcc + dx / lr
    if (newAcc >= shockTarget) {
      const frac = (shockTarget - shockAcc) / (newAcc - shockAcc)
      return (i + frac) * dx
    }
    shockAcc = newAcc
  }
  return wheelTravel
}

// Resolve user's sag input (shock or wheel) into all four representations
export function resolveSag(sagInput, sagMode, preset, customProg, geoLR, wheelTravel, shockStroke) {
  if (!geoLR || !wheelTravel || !shockStroke) {
    return { wheelSagPct: 0, shockSagPct: 0, wheelSagMm: 0, shockSagMm: 0 }
  }
  if (sagMode === 'wheel') {
    const wheelSagPct = sagInput
    const wheelSagMm = wheelSagPct * wheelTravel
    const shockSagMm = shockDispFromWheelSag(wheelSagPct, preset, customProg, geoLR, wheelTravel)
    const shockSagPct = shockSagMm / shockStroke
    return { wheelSagPct, shockSagPct, wheelSagMm, shockSagMm }
  } else {
    const shockSagPct = sagInput
    const shockSagMm = shockSagPct * shockStroke
    const wheelSagMm = wheelDispFromShockSag(shockSagPct, preset, customProg, geoLR, wheelTravel, shockStroke)
    const wheelSagPct = wheelSagMm / wheelTravel
    return { wheelSagPct, shockSagPct, wheelSagMm, shockSagMm }
  }
}

// Numerically integrate shock displacement through the stroke using variable LR,
// then compute force at wheel at each travel point. Spring rate derived from
// instantaneous LR at sag and shock displacement at sag (correct physics).
export function computeForceCurve(preset, customProg, geoLR, wheelTravel, shockStroke, wheelSagPct, riderKg, rearFrac, N = 20) {
  if (!geoLR) return Array(N + 1).fill(0)
  const lrAtSag = lrAtTravelFrac(wheelSagPct, preset, customProg, geoLR)
  const shockSagMm = shockDispFromWheelSag(wheelSagPct, preset, customProg, geoLR, wheelTravel)
  if (!shockSagMm) return Array(N + 1).fill(0)
  const k = (riderKg * G * rearFrac * lrAtSag) / shockSagMm // N/mm
  const pts = []
  let shockDisp = 0
  for (let i = 0; i <= N; i++) {
    if (i > 0) {
      const t_mid = (i - 0.5) / N
      const lr_t = lrAtTravelFrac(t_mid, preset, customProg, geoLR)
      shockDisp += (wheelTravel / N) / lr_t
    }
    const lr_t = lrAtTravelFrac(i / N, preset, customProg, geoLR)
    pts.push(Math.round(k * shockDisp / lr_t))
  }
  return pts
}

// Shock sag (mm) that a spring of rate kNmm settles at under a wheel load,
// with optional preload. Solves k·(d + preload) = F_wheel·LR(d) exactly: the
// leverage ratio depends on where the shock sits, so this iterates. LR varies
// slowly with travel, so the fixed-point converges in a handful of steps.
export function sagForRate(kNmm, wheelForceN, preset, customProg, geoLR, wheelTravel, shockStroke, preloadMm = 0) {
  if (!kNmm || !geoLR || !shockStroke) return null
  let d = shockStroke * 0.3
  for (let i = 0; i < 40; i++) {
    const wheelMm = wheelDispFromShockSag(Math.max(d, 0.01) / shockStroke, preset, customProg, geoLR, wheelTravel, shockStroke)
    const lr = lrAtTravelFrac(wheelMm / wheelTravel, preset, customProg, geoLR)
    const next = Math.max(0, (wheelForceN * lr) / kNmm - preloadMm)
    if (Math.abs(next - d) < 0.002) return next
    d = next
  }
  return d
}

// LR at the point where the shock has moved shockMm, for reading measured sag.
export function lrAtShockMm(shockMm, preset, customProg, geoLR, wheelTravel, shockStroke) {
  const wheelMm = wheelDispFromShockSag(shockMm / shockStroke, preset, customProg, geoLR, wheelTravel, shockStroke)
  return { lr: lrAtTravelFrac(wheelMm / wheelTravel, preset, customProg, geoLR), wheelMm }
}

export const lbinToNmm = (lbin) => lbin / 5.71015
