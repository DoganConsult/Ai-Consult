# Dogan AI OS — Operator Runbooks

Each file maps **one alert** in `ops/prometheus/rules/` to **one response procedure**.

| Alert | Runbook | Severity |
|---|---|---|
| `DoganComponentDown` | [component-down.md](./component-down.md) | critical |
| `DoganAuthFailureBurst` | [auth-failure-burst.md](./auth-failure-burst.md) | warning |
| `DoganSodBlocked` | [sod-blocked.md](./sod-blocked.md) | warning |
| `DoganRiskCritical` | [risk-critical.md](./risk-critical.md) | critical |
| `DoganOutboxBacklog` | [outbox-backlog.md](./outbox-backlog.md) | warning |
| `DoganOutboxDeadLetter` | [outbox-deadletter.md](./outbox-deadletter.md) | warning |
| `DoganSLOAvailabilityFastBurn` | [slo-fast-burn.md](./slo-fast-burn.md) | critical |
| `DoganSLOAvailabilitySlowBurn` | [slo-slow-burn.md](./slo-slow-burn.md) | warning |
| `DoganLatencyP99High` | [latency-p99-high.md](./latency-p99-high.md) | warning |

All runbooks follow the same shape: **Symptom → Verify → Diagnose → Mitigate → Resolve → Postmortem hook.**
