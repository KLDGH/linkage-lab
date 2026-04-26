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

### Real-world example: Forbidden Druid V2

| Input | Value |
|---|---|
| Rider + gear | 185 lb (83.9 kg) |
| Wheel travel | 130 mm |
| Shock | 185×50mm (50mm stroke) |
| Target sag | 30% |
| Rear weight bias | 65% |
| Suspension type | High Pivot |

Measured LR data from [Linkage Design](https://linkagedesign.blogspot.com/2023/04/forbidden-druid-v2-2023.html): **2.95:1 → 2.25:1** across travel. Our high-pivot preset (2.97→2.30) matches within 2%.

**Step 1 — Geometric LR:**
```
geoLR = 130 / 50 = 2.60:1
```

Note: the travel-average of the measured Druid curve (2.95→2.25) is also ≈ 2.60 — confirming the preset and geometry are consistent.

**Step 2 — Linkage correction at sag:**

The high-pivot preset has LR = 2.83 at 30% travel vs an average of 2.67 across full travel. The sag point sits higher on the curve than average — the spring must work harder to reach it.

```
linkageMod = LR_at_sag / LR_average = 2.83 / 2.67 = +6%
effectiveLR = 2.60 × 1.06 = 2.76:1
```

**Step 3 — Spring rate:**
```
k = (83.9 × 9.81 × 0.65 × 2.76) / (0.30 × 50)
  = 1,476 N / 15 mm
  = 98.4 N/mm  ≈  562 lb/in
```
**Nearest stock spring: 550 lb/in**

Without the high-pivot correction the formula gives 529 lb/in (nearest stock 525 lb/in) — the linkage correction is the difference between a 525 and a 550 spring for this rider.

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

Adjustment % shown at 30% sag — the typical operating point for a coil enduro setup.

| Linkage | Character | Adj. at 30% sag | Examples |
|---|---|---|---|
| Horst / Four-Bar | Moderately high LR at sag, slight fall | **+3%** | Specialized FSR, many Horst-link designs |
| VPP | Slightly low LR at sag, U-shaped curve | **−4%** | Santa Cruz, Intense |
| DW-Link / Maestro | Very high LR at sag, strongly progressive | **+11%** | Ibis, Pivot, Evil |
| Single Pivot | Linear / flat rate | **0%** | Evil Delta, Commencal (some), older full-sus |
| Flex Stay | Mildly falling, nearly linear | **+3%** | Yeti SB, Rocky Mountain Instinct |
| High Pivot | High LR at sag, steep progressive ending | **+6%** | Forbidden Druid, Norco Optic, Deviate Claymore |

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
