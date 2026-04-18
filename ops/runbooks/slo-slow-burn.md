# Runbook: DoganSLOAvailabilitySlowBurn

**Severity:** warning · **Pillar:** DNOC · **Page:** no

## Symptom
Error budget burning > 6× in both 30m and 6h windows.

## Verify / Diagnose / Mitigate
Same pattern as `slo-fast-burn.md` but lower urgency. Investigate the noisy component, plan a fix in the next release window.

## Resolve
Both 30m and 6h ratios return above the 6× threshold.
