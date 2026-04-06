export {
  platformHealthService,
  registerDomainHealthCheck,
  getPlatformHealthSnapshot,
  getDomainHealth,
  isReady,
  isLive,
} from './health/platform-health.service';

export {
  telemetryService,
  registerTelemetryHandler,
  emitTelemetry,
  measureWithTelemetry,
} from './telemetry/telemetry.service';

export { structuredLogger } from './logging/structured-logger';

export {
  metricsRegistryService,
  incrementCounter,
  setGauge,
  recordHistogram,
  measureAsync,
  registerSlo,
  updateSloCurrentValue,
  getSloStatuses,
  getBreachedSlos,
  getMetricSnapshot,
} from './metrics/metrics-registry.service';

export {
  traceContextService,
  startSpan,
  endSpan,
  traceAsync,
  getActiveSpans,
  getRecentSpans,
} from './tracing/trace-context.service';

export {
  reliabilityService,
  withRetry,
  withTimeout,
  withCircuitBreaker,
  registerCircuitBreaker,
  getCircuitBreakerStatuses,
  sendToDeadLetter,
  getDeadLetterEntries,
  detectStuckInstances,
} from './reliability/reliability.service';

export {
  alertService,
  registerAlertDefinition,
  registerAlertHandler,
  raiseAlert,
  resolveAlert,
  getActiveAlerts,
} from './alerts/alert.service';

export {
  diagnosticsService,
  getDiagnosticsSnapshot,
  getServiceDiagnostics,
} from './diagnostics/diagnostics.service';

export {
  incidentService,
  openIncident,
  acknowledgeIncident,
  addMitigation,
  resolveIncident,
  getActiveIncidents,
  getIncident,
  getIncidentHistory,
} from './incidents/incident.service';

export {
  recoveryService,
  requestRecoveryAction,
  approveRecoveryAction,
  executeRecoveryAction,
  cancelRecoveryAction,
  getPendingRecoveryActions,
  getRecoveryHistory,
} from './recovery/recovery.service';

export {
  runbookRegistryService,
  registerRunbook,
  getRunbook,
  getAllRunbooks,
  getRunbooksByService,
  getRunbooksByAlert,
  bootstrapPlatformRunbooks,
} from './runbooks/runbook-registry.service';

export {
  asBuiltLedgerService,
  recordAsBuiltEntry,
  registerUnresolvedRisk,
  resolveRisk,
  getUnresolvedRisks,
  getCriticalUnresolvedRisks,
  bootstrapPlatformAsBuilt,
} from './handover/as-built-ledger.service';

export type {
  HealthState,
  DependencyHealth,
  RuntimeHealthStatus,
  PlatformHealthSnapshot,
  TelemetrySignal,
  TelemetryFamily,
  StructuredLogEntry,
  SloDefinition,
  SloStatus,
  AlertDefinition,
  AlertEvent,
  AlertSeverity,
  AlertClass,
  IncidentRecord,
  IncidentSeverity,
  RecoveryAction,
  RecoveryActionType,
  RunbookDefinition,
  AsBuiltEntry,
  UnresolvedRisk,
  RetryPolicy,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitState,
  DeadLetterEntry,
} from './contracts/operations.types';
