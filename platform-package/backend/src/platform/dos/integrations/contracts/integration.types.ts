export type ConnectorState = 'active' | 'paused' | 'quarantined' | 'disabled';

export type AuthMethod = 'api-key' | 'oauth2' | 'basic' | 'certificate' | 'iam-role' | 'none';

export type SyncMode = 'pull' | 'push' | 'event-driven' | 'batch' | 'webhook';

export type DataClassification = 'public' | 'internal' | 'sensitive' | 'restricted';

export type SyncRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'partial';

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export type CredentialType = 'api-key' | 'oauth2-token' | 'basic-credentials' | 'certificate' | 'iam-binding';

export type MappingFailurePolicy = 'reject' | 'quarantine' | 'partial-accept';

export type CircuitState = 'closed' | 'open' | 'half-open';

export type IntegrationEventType =
  | 'integration.connector.registered'
  | 'integration.connector.enabled'
  | 'integration.connector.disabled'
  | 'integration.connector.paused'
  | 'integration.connector.quarantined'
  | 'integration.sync.started'
  | 'integration.sync.completed'
  | 'integration.sync.failed'
  | 'integration.delivery.completed'
  | 'integration.delivery.failed'
  | 'integration.payload.quarantined'
  | 'integration.replay.completed'
  | 'integration.replay.failed'
  | 'integration.credential.rotated'
  | 'integration.admin.action';

export interface RateLimitPolicy {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  burstAllowed: boolean;
  throttleOnExceed: boolean;
}

export interface ConnectorApprovalPolicy {
  requiresApprovalForWrite: boolean;
  requiresApprovalForHighRisk: boolean;
  selfApprovalBlocked: boolean;
}

export interface ConnectorHealthPolicy {
  healthCheckIntervalSeconds: number;
  maxConsecutiveFailures: number;
  circuitBreakerThreshold: number;
  autoQuarantineOnFailure: boolean;
}

export interface ConnectorDefinition {
  connectorCode: string;
  name: string;
  ownerLayer: 'DOS' | 'product' | 'module';
  ownerCode: string;
  externalSystem: string;
  authMethod: AuthMethod;
  supportedModes: SyncMode[];
  inboundContracts: string[];
  outboundContracts: string[];
  eventBridgeModes: string[];
  rateLimits: RateLimitPolicy;
  dataClassification: DataClassification;
  approvalPolicy: ConnectorApprovalPolicy;
  adminExposurePolicy: 'visible' | 'admin-only' | 'hidden';
  healthPolicy: ConnectorHealthPolicy;
  state: ConnectorState;
  registeredAt: string;
  lastUpdatedAt: string;
}

export interface CredentialRotationPolicy {
  rotateBeforeExpiryDays: number;
  autoRotate: boolean;
  notifyOwnerOnExpiry: boolean;
}

export interface CredentialBinding {
  bindingId: string;
  connectorCode: string;
  tenantId: string;
  credentialType: CredentialType;
  referenceKey: string;
  status: 'active' | 'expired' | 'revoked' | 'rotation-pending';
  expiresAt?: string;
  lastValidatedAt?: string;
  boundAt: string;
  rotationPolicy?: CredentialRotationPolicy;
}

export interface SyncRun {
  runId: string;
  connectorCode: string;
  tenantId: string;
  mode: SyncMode;
  status: SyncRunStatus;
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  failureReason?: string;
  correlationId: string;
  partialFailure: boolean;
}

export interface OutboundDelivery {
  deliveryId: string;
  connectorCode: string;
  tenantId: string;
  targetEndpoint: string;
  payloadType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: DeliveryStatus;
  attempts: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  correlationId: string;
  createdAt: string;
}

export interface InboundPayload {
  payloadId: string;
  connectorCode: string;
  tenantId: string;
  source: string;
  contractType: string;
  rawPayload: Record<string, unknown>;
  receivedAt: string;
  mappedAt?: string;
  status: 'received' | 'mapped' | 'rejected' | 'quarantined';
  failureReason?: string;
  correlationId: string;
}

export interface MappingRule {
  sourceField: string;
  targetField: string;
  transform?: string;
  required: boolean;
  redact: boolean;
}

export interface MappingValidationPolicy {
  rejectOnMissingRequired: boolean;
  rejectOnTypeViolation: boolean;
  maxAllowedNullPercent: number;
}

export interface MappingDefinition {
  mappingId: string;
  connectorCode: string;
  sourceContract: string;
  targetContract: string;
  rules: MappingRule[];
  validationPolicy: MappingValidationPolicy;
  failurePolicy: MappingFailurePolicy;
  version: string;
}

export interface QuarantineEntry {
  quarantineId: string;
  connectorCode: string;
  tenantId: string;
  payloadType: 'inbound' | 'outbound';
  rawPayload: unknown;
  failureReason: string;
  attempts: number;
  firstFailedAt: string;
  lastFailedAt: string;
  correlationId: string;
  replayable: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ReplayResult {
  replayId: string;
  sourceQuarantineId: string;
  connectorCode: string;
  tenantId: string;
  status: 'accepted' | 'rejected' | 'completed' | 'failed';
  reason?: string;
  executedAt: string;
  correlationId: string;
}

export interface RateLimitStatus {
  requestsLastMinute: number;
  requestsLastHour: number;
  throttled: boolean;
  resetAt?: string;
}

export interface IntegrationHealthSnapshot {
  connectorCode: string;
  tenantId?: string;
  state: ConnectorState;
  lastSyncAt?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  quarantineCount: number;
  deliverySuccessRate: number;
  circuitState: CircuitState;
  checkedAt: string;
}

export interface ConnectorDiagnostics {
  connectorCode: string;
  tenantId?: string;
  state: ConnectorState;
  health: IntegrationHealthSnapshot;
  recentSyncRuns: SyncRun[];
  recentDeliveries: OutboundDelivery[];
  quarantineCount: number;
  credentialStatus: CredentialBinding | null;
  rateLimitStatus: RateLimitStatus;
  snapshotAt: string;
}

export interface AdminConnectorAction {
  actionCode:
    | 'enable'
    | 'disable'
    | 'pause'
    | 'quarantine'
    | 'release-quarantine'
    | 'rotate-credential'
    | 'replay';
  connectorCode: string;
  tenantId?: string;
  performedBy: string;
  reason: string;
  targetQuarantineId?: string;
}

export interface AdminActionResult {
  actionCode: AdminConnectorAction['actionCode'];
  connectorCode: string;
  success: boolean;
  previousState?: ConnectorState;
  newState?: ConnectorState;
  detail?: string;
  executedAt: string;
}

export interface IntegrationEvent<T = Record<string, unknown>> {
  eventType: IntegrationEventType;
  connectorCode: string;
  tenantId?: string;
  correlationId: string;
  payload: T;
  occurredAt: string;
}
