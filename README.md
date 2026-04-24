# LinkageLab

**Coil spring rate calculator and suspension kinematics explorer for mountain bikes.**

Live → [kldgh.github.io/linkage-lab](https://kldgh.github.io/linkage-lab/)

---

## What it does

**Section 01 — Spring Rate Calculator**
Enter your rider weight, shock stroke, wheel travel, target sag, and rear weight bias to get your recommended coil spring rate in both N/mm and lb/in. Select your bike's linkage type to apply a correction for how LR varies through the stroke.

**Section 02 — Leverage Curve Explorer**
Compare the leverage ratio curves of five common linkage archetypes (Horst 4-bar, VPP, DW-Link, Single Pivot, Flex Stay). See how a falling, rising, or linear LR curve affects spring behavior through the stroke.

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

A 150mm / 57.5mm setup gives LR ≈ 2.61. Higher LR means the shock sees more force per mm of wheel movement — requiring a stiffer spring.

When a linkage type is selected, LR is refined using the curve value at the sag point rather than the travel-average:

```
effectiveLR = geoLR × (LR_at_sag / LR_average)
```

This corrects for the fact that a falling-ratio linkage (e.g. Horst) has higher LR early in the stroke, right where sag sits — meaning the spring needs to work harder than the simple travel/stroke ratio implies.

### Leverage curve presets

Five archetypes with representative curve shapes based on published data:

| Linkage | Character | Examples |
|---|---|---|
| Horst Link (4-bar) | Slightly falling | Trek, Specialized FSR, GT Sensor |
| VPP | Falling then rising | Santa Cruz, Intense |
| DW-Link | Strongly progressive (falling LR) | Ibis, Pivot, Evil |
| Single Pivot | Constant / linear | Hardtails, older designs |
| Flex Stay / UDH | Mildly falling | Yeti SB, Rocky Mountain Instinct |

Curves are representative archetypes, not measured from specific frames. Real bikes vary.

---

## Key assumptions

**Rider weight only — bike weight excluded.**
Sag is *incremental* compression from the rider sitting down. The bike is already resting at full extension before the rider mounts; its weight has no effect on sag. This matches the approach used by Fox, RockShox, and MRP.

**Rear weight bias is the biggest variable.**
Most calculators (Fox, MRP, TF Tuned) bake in an assumed rear bias of ~60-65% without exposing it. We make it explicit. Default is 65%; slack enduro/DH bikes with rearward geometry can push 68-75%.

Typical ranges:
- XC / weight-forward position: ~55%
- Trail / neutral seated: ~60-65%
- Enduro / attack position: ~65-70%
- DH race tuck: ~70-75%

**Sag zones:**
- XC: 18-24% (mostly air shocks; coil spring rates shown for reference)
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
