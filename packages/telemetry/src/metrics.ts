import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

let registry: Registry | undefined;

export function getMetricsRegistry(): Registry {
  if (registry) return registry;
  registry = new Registry();
  registry.setDefaultLabels({ service: 'dogan-ai-os' });
  collectDefaultMetrics({ register: registry });
  return registry;
}

export function renderMetrics(): Promise<string> {
  return getMetricsRegistry().metrics();
}

export interface DauthMetrics {
  authSuccess: Counter<'tenant' | 'kind'>;
  authFailure: Counter<'tenant' | 'reason'>;
  authzCheck: Counter<'tenant' | 'relation' | 'allowed'>;
  abacDecision: Counter<'tenant' | 'effect'>;
  sodBlocked: Counter<'tenant' | 'code'>;
  riskScored: Counter<'tenant' | 'band'>;
  outboxLagSeconds: Gauge<'tenant'>;
  outboxPending: Gauge;
  outboxDead: Gauge;
  httpDuration: Histogram<'pillar' | 'route' | 'status'>;
  healthUp: Gauge<'component'>;
}

let dauthMetrics: DauthMetrics | undefined;

export function getDauthMetrics(): DauthMetrics {
  if (dauthMetrics) return dauthMetrics;
  const reg = getMetricsRegistry();
  dauthMetrics = {
    authSuccess: new Counter({
      name: 'dogan_auth_success_total',
      help: 'Successful authentications',
      labelNames: ['tenant', 'kind'],
      registers: [reg],
    }),
    authFailure: new Counter({
      name: 'dogan_auth_failure_total',
      help: 'Failed authentications',
      labelNames: ['tenant', 'reason'],
      registers: [reg],
    }),
    authzCheck: new Counter({
      name: 'dogan_authz_check_total',
      help: 'OpenFGA checks',
      labelNames: ['tenant', 'relation', 'allowed'],
      registers: [reg],
    }),
    abacDecision: new Counter({
      name: 'dogan_abac_decision_total',
      help: 'ABAC evaluation decisions',
      labelNames: ['tenant', 'effect'],
      registers: [reg],
    }),
    sodBlocked: new Counter({
      name: 'dogan_sod_blocked_total',
      help: 'SoD violations blocked',
      labelNames: ['tenant', 'code'],
      registers: [reg],
    }),
    riskScored: new Counter({
      name: 'dogan_risk_scored_total',
      help: 'Risk bands assigned',
      labelNames: ['tenant', 'band'],
      registers: [reg],
    }),
    outboxLagSeconds: new Gauge({
      name: 'dogan_outbox_lag_seconds',
      help: 'Age of oldest pending outbox event in seconds',
      labelNames: ['tenant'],
      registers: [reg],
    }),
    outboxPending: new Gauge({
      name: 'dogan_outbox_pending',
      help: 'Pending outbox rows across all tenants',
      registers: [reg],
    }),
    outboxDead: new Gauge({
      name: 'dogan_outbox_dead',
      help: 'Dead-lettered outbox rows',
      registers: [reg],
    }),
    httpDuration: new Histogram({
      name: 'dogan_http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['pillar', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [reg],
    }),
    healthUp: new Gauge({
      name: 'dogan_component_up',
      help: '1 if component is healthy',
      labelNames: ['component'],
      registers: [reg],
    }),
  };
  return dauthMetrics;
}
