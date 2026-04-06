export type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'starting' | 'unknown';

export type IncidentSeverity = 'sev0' | 'sev1' | 'sev2' | 'sev3' | 'sev4';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertClass = 'page' | 'warn' | 'info';

export type RecoveryActionType =
  | 'rollback'
  | 'restart'
  | 'disable'
  | 'replay'
  | 'manual_intervention'
  | 'containment';

export type CircuitState = 'closed' | 'open' | 'half-open';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type RedactionClass = 'public' | 'internal' | 'sensitive' | 'restricted';

export type TelemetryFamily =
  | 'request'
  | 'startup'
  | 'provisioning'
  | 'workflow'
  | 'agent'
  | 'auth'
  | 'admin'
  | 'integration'
  | 'retry'
  | 'recovery';

export type RunbookTrigger =
  | 'alert'
  | 'incident'
  | 'manual'
  | 'scheduled'
  | 'deployment';

export interface DependencyHealth {
  name: string;
  state: HealthState;
  latencyMs?: number;
  message?: string;
  checkedAt: string;
}

export interface RuntimeHealthStatus {
  serviceCode: string;
  state: HealthState;
  liveness: boolean;
  readiness: boolean;
  dependencies: DependencyHealth[];
  startupComplete: boolean;
  checkedAt: string;
  message?: string;
}

export interface PlatformHealthSnapshot {
  overallState: HealthState;
  services: RuntimeHealthStatus[];
  timestamp: string;
  version: string;
  uptimeSeconds: number;
}

export interface TelemetrySignal {
  family: TelemetryFamily;
  action: string;
  correlationId: string;
  causationId?: string;
  tenantId?: string;
  productCode?: string;
  moduleCode?: string;
  actor?: string;
  outcome: 'success' | 'failure' | 'partial';
  durationMs?: number;
  metadata?: Record<string, unknown>;
  redactionClass: RedactionClass;
  timestamp: string;
}

export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  correlationId?: string;
  causationId?: string;
  tenantId?: string;
  workspaceId?: string;
  productCode?: string;
  moduleCode?: string;
  actor?: string;
  action?: string;
  outcome?: string;
  failureReason?: string;
  redactionClass?: RedactionClass;
  service: string;
  environment: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface SloDefinition {
  sloId: string;
  serviceCode: string;
  name: string;
  description: string;
  targetPercent: number;
  windowDays: number;
  metricName: string;
  threshold: number;
  comparisonOperator: 'lt' | 'lte' | 'gt' | 'gte';
}

export interface SloStatus {
  sloId: string;
  current: number;
  target: number;
  breached: boolean;
  checkedAt: string;
}

export interface AlertDefinition {
  alertId: string;
  name: string;
  severity: AlertSeverity;
  alertClass: AlertClass;
  condition: string;
  thresholdValue: number;
  comparisonOperator: 'lt' | 'lte' | 'gt' | 'gte';
  ownerRole: string;
  runbookId?: string;
  enabled: boolean;
}

export interface AlertEvent {
  alertId: string;
  alertName: string;
  severity: AlertSeverity;
  alertClass: AlertClass;
  summary: string;
  affectedService?: string;
  correlationId?: string;
  triggeredAt: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentRecord {
  incidentId: string;
  severity: IncidentSeverity;
  title: string;
  summary: string;
  affectedLayers: string[];
  affectedTenants: string[];
  affectedProducts: string[];
  affectedModules: string[];
  detectionSource: string;
  owner: string;
  responders: string[];
  openedAt: string;
  acknowledgedAt?: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  state: 'open' | 'acknowledged' | 'mitigating' | 'resolved' | 'closed';
  timeline: IncidentTimelineEntry[];
  mitigations: string[];
  followUpActions: string[];
  postmortemId?: string;
  customerImpact?: string;
}

export interface IncidentTimelineEntry {
  timestamp: string;
  actor: string;
  action: string;
  note?: string;
}

export interface RecoveryAction {
  recoveryId: string;
  actionType: RecoveryActionType;
  targetService: string;
  targetTenantId?: string;
  requestedBy: string;
  approvedBy?: string;
  requiresApproval: boolean;
  status: 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  description: string;
  rollbackNotes?: string;
  auditContext: Record<string, unknown>;
  createdAt: string;
  executedAt?: string;
  completedAt?: string;
  incidentId?: string;
}

export interface RunbookDefinition {
  runbookId: string;
  title: string;
  owner: string;
  ownerRole: string;
  escalationOwner?: string;
  triggerTypes: RunbookTrigger[];
  linkedAlertIds?: string[];
  serviceCode?: string;
  dependencyMap: string[];
  healthSignals: string[];
  dashboardLinks: string[];
  alertSources: string[];
  recoverySteps: string[];
  rollbackSteps: string[];
  commonFailureModes: string[];
  knownCaveats: string[];
  supportContacts: string[];
  lastReviewedAt?: string;
  version: string;
}

export interface AsBuiltEntry {
  entryId: string;
  category:
    | 'service'
    | 'package'
    | 'table'
    | 'contract'
    | 'event'
    | 'api'
    | 'workflow'
    | 'dependency';
  name: string;
  owner: string;
  ownerLayer: 'DOS' | 'DAuth' | 'product' | 'module';
  description: string;
  runtimeDependencies: string[];
  knownLimitations: string[];
  handoverNotes?: string;
  updatedAt: string;
}

export interface UnresolvedRisk {
  riskId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  area: string;
  owner?: string;
  mitigationPlan?: string;
  targetResolutionDate?: string;
  identifiedAt: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableErrors?: string[];
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  openDurationMs: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerStatus {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: string;
  openedAt?: string;
}

export interface DeadLetterEntry {
  id: string;
  source: string;
  payload: unknown;
  errorMessage: string;
  attempts: number;
  firstFailedAt: string;
  lastFailedAt: string;
  tenantId?: string;
  correlationId?: string;
}
