# Runbook: DoganSLOAvailabilityFastBurn

**Severity:** critical · **Pillar:** DNOC · **Page:** yes

## Symptom
Error budget burning > 14.4× in both 5m and 1h windows. SLO target = 99.9%/component.

## Verify
```bash
curl -fsS http://127.0.0.1:9090/api/v1/query?query=dogan:availability:ratio_5m | jq .
curl -fsS http://127.0.0.1:3100/kernel/ready | jq .
```

## Diagnose
- Identify which `component` label is dominating.
- Cross-check with `DoganComponentDown` if firing for the same component.

## Mitigate
Follow `component-down.md` for the offending component.

## Resolve
Both 5m and 1h ratios return above (1 - 14.4*0.001).
