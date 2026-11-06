# Solitaire Dynamics

**Coil spring rate calculator and suspension kinematics tools for mountain bikes.**

Live → [solitairedynamics.com](https://solitairedynamics.com)

---

## What it does

### Spring Rate Calculator

Enter rider weight, wheel travel, shock stroke, target sag and rear weight bias to get a recommended coil spring rate in N/mm and lb/in. Start from your bike to use its measured leverage curve, or from a linkage type plus your own travel and stroke. The default, Geometric, applies no linkage correction and uses travel ÷ stroke alone.

The results show both units, the stock spring sizes with the sag each one gives, and charts of spring force and leverage ratio through the travel. Fold-out blocks handle preload and back-solve your real load from a measured sag.

### Bike Comparison

Measured leverage curves of real bikes side by side, as absolute ratios or relative to each bike's own average, with each bike's spring correction at a common sag.

### Learn

Interactive modules in six chapters: Basics, Springs, Damping, Friction, Geometry and Setup. Setup includes a symptom finder and a testing method with a setup log.

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
| Bike | Forbidden Druid V2 |
| Wheel travel | 130 mm |
| Shock | 185×50 mm (50 mm stroke) |
| Target sag | 30% at the shock |
| Rear weight bias | 65% |

The bike's leverage ratio runs about **2.98:1 → 2.26:1** across travel.

**Step 1: geometric LR**
```
geoLR = 130 / 50 = 2.60:1
```

The curve's travel-weighted average is 2.61, within 1% of travel ÷ stroke, so the curve and the geometry agree.

**Step 2: linkage correction at sag**

30% sag is 15 mm at the shock, which puts the wheel at 32.5% of its travel. The curve reads 2.71 there against its average of 2.61. Sag sits higher on the curve than the average, so the spring has to work harder to reach it.

```
linkageMod = LR_at_sag / LR_average = 2.71 / 2.61 = +3.7%
effectiveLR = 2.60 × 1.037 = 2.695:1
```

**Step 3: spring rate**
```
k = (83.9 × 9.81 × 0.65 × 2.695) / (0.30 × 50)
  = 1,442 N / 15 mm
  = 96.1 N/mm  ≈  549 lb/in
```
**Nearest stock spring: 550 lb/in**

Without the linkage correction the formula gives 530 lb/in (nearest stock 525 lb/in), so the correction is the difference between a 525 and a 550 spring for this rider.

### Leverage Ratio

```
LR = wheel travel / shock stroke
```

A 150mm / 55mm setup gives LR ≈ 2.73. Higher LR means the shock sees more force per mm of wheel movement, requiring a stiffer spring.

When a linkage type is selected, LR is refined using the curve value at the sag point rather than the travel-average:

```
effectiveLR = geoLR × (LR_at_sag / LR_average)
```

This corrects for the fact that a falling-ratio linkage (e.g. Horst) has higher LR early in the stroke, right where sag sits, meaning the spring needs to work harder than the simple travel/stroke ratio implies.

### Spring force chart

The force chart integrates LR through travel to compute actual spring force at each point in the stroke, not just at sag. This makes it possible to compare how different linkage types distribute spring load across the travel.

### Linkage types

Geometric is the default and applies no correction. Each linkage type takes its curve shape from one real bike and rescales it onto your travel ÷ stroke.

| Type | Curve character | Reference bike | Examples |
|---|---|---|---|
| Horst | Falling: high leverage early, steadily lower toward bottom-out | Transition Sentinel V3 | Specialized FSR, Transition |
| VPP | Falls steadily through the travel, not the older U-shape | Santa Cruz Bronson V5 | Santa Cruz, Intense |
| DW-Link | Falls fastest in the first third, then flattens | Ibis Ripmo V3 | Ibis, Pivot, Giant (Maestro) |
| High Pivot | Falls gradually, then steepens toward bottom-out | Deviate Claymore | Forbidden, Norco Optic, Deviate |

The size of each correction depends on your sag, so the calculator works it out live rather than quoting a fixed percentage. Real bikes vary.

---

## Key assumptions

**Rider weight only; bike weight is not counted yet.**
The bike's sprung weight also loads the spring, adding roughly 5-10% to the rear load and more on e-bikes, so results can run slightly soft. Include it in the rider figure if you want to account for it.

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

Cross-checked against production calculators:

- **MRP Spring Calculator**: 185 lb rider / 60% rear / 150mm travel / 55mm stroke / 30% sag → **466 lb/in** (MRP result: 466 lb/in ✓)
- **TF Tuned**: uses higher implicit rear bias (~68-74% depending on linkage type) to account for the aggressive position implied by different bike categories

---

## Running locally

```bash
npm install
npm run dev
```

Requires Node 18+. Built with Vite + React + Recharts.

---

## License

[GNU AGPL-3.0-or-later](LICENSE) © 2026 Solitaire Dynamics

You're free to use, study, modify, and share this code. The catch: if you run a
modified version as a network service, the AGPL requires you to make your source
available to its users under the same license. That keeps the tool open while
preventing a closed commercial fork.

The underlying physics, formulas, and kinematic models aren't owned by anyone;
they're free for all to reimplement. This license covers the code, copy, and
design of this particular implementation.
