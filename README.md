# LinkageLab

**Coil spring rate calculator and suspension kinematics tools for mountain bikes.**

Live → [solitairedynamics.com](https://solitairedynamics.com)

---

## What it does

### Section 01 — Spring Rate Calculator

Enter rider weight, wheel travel, shock stroke, target sag, and rear weight bias to get a recommended coil spring rate in N/mm and lb/in. Select your bike's suspension type to apply a linkage correction based on how LR varies through the stroke — the calculator adjusts your spring rate up or down based on where the leverage ratio sits at sag, not just the travel/stroke average.

The results card shows both units on one line, the nearest stock spring size, and a dual chart: your corrected spring force curve alongside your bike's leverage ratio curve. Both charts respond live to the suspension type buttons.

Inputs are split into two tiers:
- **Essential** — rider weight, wheel travel, shock stroke
- **Refine** — sag target, rear weight bias, e-bike weight offset

### Section 02 — Leverage Curve Explorer

Compare leverage ratio curves for six common linkage archetypes. Each preset shows its LR curve shape, sag-point leverage, and progression. Click a preset chip to highlight it and show a description with design context below the chart.

### Section 03 — Linkage Analysis (early alpha)

Full kinematic analysis from pivot geometry: leverage ratio, anti-squat, and pedal kickback through travel. Still being calibrated against real bike data. More bikes being added one at a time.

---

## Methodology

### Core formula

```
k (N/mm) = (riderKg × G × rearBias × LR) / (sag% × strokeMm)
```

Derived from the **virtual work principle**: because the shock moves less than the wheel (by a factor of LR), the spring must exert proportionally more force. At the sag point:

```
F_spring = F_wheel × LR
k × (sag% × stroke) = riderKg × G × rearBias × LR
```

### Leverage Ratio

```
LR = wheel travel / shock stroke
```

A 150mm / 55mm setup gives LR ≈ 2.73. Higher LR means the shock sees more force per mm of wheel movement — requiring a stiffer spring.

When a linkage type is selected, LR is refined using the curve value at the sag point rather than the travel-average:

```
effectiveLR = geoLR × (LR_at_sag / LR_average)
```

This corrects for the fact that a falling-ratio linkage (e.g. Horst) has higher LR early in the stroke, right where sag sits — meaning the spring needs to work harder than the simple travel/stroke ratio implies.

### Spring force chart

The force chart integrates LR through travel to compute actual spring force at each point in the stroke, not just at sag. This makes it possible to compare how different linkage types distribute spring load across the travel.

### Leverage curve presets

Six archetypes with curve shapes based on published kinematic data:

| Linkage | Character | LR at sag | Examples |
|---|---|---|---|
| Horst / Four-Bar | Moderately high LR at sag, slight fall | High | Specialized FSR, many Horst-link designs |
| VPP | Slightly low LR at sag, balanced | Slightly low | Santa Cruz, Intense |
| DW-Link / Maestro | Very high LR at sag, strongly progressive | Very high | Ibis, Pivot, Evil |
| Single Pivot | Linear / flat rate | Average | Evil Delta, Commencal (some), older full-sus |
| Flex Stay | Mildly falling, nearly linear | Slightly high | Yeti SB, Rocky Mountain Instinct |
| High Pivot | High LR at sag, steep progressive ending | High | Forbidden Druid, Norco Optic, Deviate Claymore |

High-pivot curve based on Deviate Claymore measured data: start 2.97 → sag 2.85 → end 2.30, 22.6% progression. Curves are representative archetypes — real bikes vary.

---

## Key assumptions

**Rider weight only — bike weight excluded.**
Sag is *incremental* compression from the rider sitting down. The bike is already resting at full extension before the rider mounts; its weight has no effect on sag. This matches the approach used by Fox, RockShox, and MRP.

**Rear weight bias is the biggest variable.**
Most calculators (Fox, MRP, TF Tuned) bake in an assumed rear bias of ~60-65% without exposing it. This calculator makes it explicit. Default is 65%; slack enduro/DH bikes with rearward geometry can push 68-75%.

Typical ranges:
- XC / weight-forward position: ~55%
- Trail / neutral seated: ~60-65%
- Enduro / attack position: ~65-70%
- DH race tuck: ~70-75%

**Sag zones:**
- XC: 18-24%
- Trail: 23-29%
- Enduro: 27-34%
- DH: 32-40%

**Nearest stock spring** is rounded to the nearest 25 lb/in increment, which is the standard commercial interval.

---

## Validation

Cross-checked against three production calculators:

- **MRP Spring Calculator** — 185 lb rider / 60% rear / 150mm travel / 55mm stroke / 30% sag → **466 lb/in** (MRP result: 466 lb/in ✓)
- **Fox Spring Selector** — same rider with 130mm / 55mm geometry → **~550 lb/in** (Fox shows 550 lb/in ✓; difference is purely LR change from shorter travel)
- **TF Tuned** — uses higher implicit rear bias (~68-74% depending on linkage type) to account for the aggressive position implied by different bike categories

---

## Running locally

```bash
npm install
npm run dev
```

Requires Node 18+. Built with Vite + React + Recharts.

---

## License

MIT
