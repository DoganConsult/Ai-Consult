export {
  integrationRegistryService,
  registerConnector,
  getConnector,
  getAllConnectors,
  getConnectorsByOwner,
  updateConnectorState,
  bootstrapIntegrationRegistry,
} from './registry/integration-registry.service';

export {
  integrationSyncService,
  registerSyncHandler,
  startSyncRun,
  completeSyncRun,
  getSyncRun,
  getRecentSyncRuns,
  replayQuarantineEntry,
} from './sync/integration-sync.service';

export {
  integrationHealthService,
  recordConnectorSuccess,
  recordConnectorFailure,
  checkCircuit,
  getCircuitBreakerState,
  getConnectorHealthSnapshot,
  getAllConnectorHealthSnapshots,
  resetCircuitBreaker,
} from './health/integration-health.service';

export {
  integrationAdminService,
  executeAdminAction,
  getAdminActionHistory,
  pauseConnector,
  enableConnector,
  disableConnector,
  quarantineConnector,
  releaseQuarantine,
  triggerReplay,
} from './admin/integration-admin.service';

export {
  integrationEventsService,
  emitConnectorRegistered,
  emitConnectorStateChanged,
  emitSyncStarted,
  emitSyncCompleted,
  emitDeliveryCompleted,
  emitPayloadQuarantined,
  emitReplayResult,
  emitCredentialRotated,
  emitAdminAction,
} from './events/integration-events.service';

export {
  integrationDiagnosticsService,
  trackConnectorRequest,
  getRateLimitStatus,
  getConnectorDiagnostics,
  getAllConnectorDiagnostics,
  getIntegrationPlatformDiagnostics,
} from './diagnostics/integration-diagnostics.service';

export type {
  ConnectorState,
  AuthMethod,
  SyncMode,
  DataClassification,
  SyncRunStatus,
  DeliveryStatus,
  CredentialType,
  MappingFailurePolicy,
  CircuitState,
  IntegrationEventType,
  RateLimitPolicy,
  ConnectorApprovalPolicy,
  ConnectorHealthPolicy,
  ConnectorDefinition,
  CredentialRotationPolicy,
  CredentialBinding,
  SyncRun,
  OutboundDelivery,
  InboundPayload,
  MappingRule,
  MappingValidationPolicy,
  MappingDefinition,
  QuarantineEntry,
  ReplayResult,
  RateLimitStatus,
  IntegrationHealthSnapshot,
  ConnectorDiagnostics,
  AdminConnectorAction,
  AdminActionResult,
  IntegrationEvent,
} from './contracts/integration.types';

export {
  bindCredential,
  getCredentialBinding,
  getBindingByConnector,
  revokeCredential,
  markRotationPending,
  completeRotation,
  validateBinding,
  checkRotationDue,
  listBindingsByConnector,
  getSafeBindingMetadata,
} from './credentials/credential-binding.service';

export {
  registerInboundHandler,
  ingestWebhookPayload,
  getInboundPayload,
  getRecentInboundPayloads,
  markPayloadQuarantined,
} from './inbound/webhook-ingest.service';

export {
  registerDeliveryExecutor,
  createOutboundDelivery,
  executeDelivery,
  markDeliveryStatus,
  getDelivery,
  getRecentDeliveries,
  getDeliveryByIdempotencyKey,
} from './outbound/delivery.service';

export {
  registerMapping,
  getMapping,
  getMappingByContracts,
  listMappingsByConnector,
  applyMapping,
  applyMappingByContracts,
} from './mapping/mapping-validator.service';
export type { MappingValidationResult } from './mapping/mapping-validator.service';

export {
  registerRetryPolicy,
  getRetryPolicy,
  computeNextRetryDelay,
  shouldRetry,
  buildRetryState,
  isRetryableError,
  withRetry,
} from './retries/retry-policy.service';
export type { RetryStrategy, RetryPolicy, RetryState } from './retries/retry-policy.service';

export {
  quarantinePayload,
  getQuarantineEntry,
  listQuarantineEntries,
  listReplayableEntries,
  markNonReplayable,
  replayEntry,
  getQuarantineStats,
  registerReplayHandler,
} from './quarantine/quarantine.service';
