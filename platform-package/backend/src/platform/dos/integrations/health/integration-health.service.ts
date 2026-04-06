// @ts-nocheck
import { logger } from '../../observability/logger.service';
import { integrationRegistryService } from '../registry/integration-registry.service';
import { integrationSyncService } from '../sync/integration-sync.service';
import type {
  IntegrationHealthSnapshot,
  ConnectorState,
  CircuitState,
} from '../contracts/integration.types';

interface ConnectorCircuitBreaker {
  connectorCode: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: string;
  openedAt?: string;
  halfOpenAt?: string;
  threshold: number;
  openDurationMs: number;
}

interface ConnectorFailureRecord {
  connectorCode: string;
  consecutiveFailures: number;
  lastFailureAt?: string;
  lastSyncAt?: string;
}

const circuitBreakers = new Map<string, ConnectorCircuitBreaker>();
const failureRecords = new Map<string, ConnectorFailureRecord>();

function getOrCreateCircuitBreaker(connectorCode: string): ConnectorCircuitBreaker {
  if (!circuitBreakers.has(connectorCode)) {
    const connector = integrationRegistryService.getConnector(connectorCode);
    const threshold = connector?.healthPolicy.circuitBreakerThreshold ?? 5;
    circuitBreakers.set(connectorCode, {
      connectorCode,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      threshold,
      openDurationMs: 60_000,
    });
  }
  return circuitBreakers.get(connectorCode)!;
}

function getOrCreateFailureRecord(connectorCode: string): ConnectorFailureRecord {
  if (!failureRecords.has(connectorCode)) {
    failureRecords.set(connectorCode, { connectorCode, consecutiveFailures: 0 });
  }
  return failureRecords.get(connectorCode)!;
}

export function recordConnectorSuccess(connectorCode: string): void {
  const cb = getOrCreateCircuitBreaker(connectorCode);
  const record = getOrCreateFailureRecord(connectorCode);

  record.consecutiveFailures = 0;
  record.lastSyncAt = new Date().toISOString();

  if (cb.state === 'half-open') {
    cb.successCount += 1;
    if (cb.successCount >= 2) {
      cb.state = 'closed';
      cb.failureCount = 0;
      cb.successCount = 0;
      cb.openedAt = undefined;
      cb.halfOpenAt = undefined;
      logger.info('[IntegrationHealth] Circuit closed after recovery', { connectorCode });
    }
  } else if (cb.state === 'closed') {
    cb.successCount += 1;
    cb.failureCount = Math.max(0, cb.failureCount - 1);
  }
}

export function recordConnectorFailure(connectorCode: string, reason?: string): void {
  const cb = getOrCreateCircuitBreaker(connectorCode);
  const record = getOrCreateFailureRecord(connectorCode);

  record.consecutiveFailures += 1;
  record.lastFailureAt = new Date().toISOString();

  cb.failureCount += 1;
  cb.lastFailureAt = record.lastFailureAt;

  if (cb.state === 'closed' && cb.failureCount >= cb.threshold) {
    cb.state = 'open';
    cb.openedAt = new Date().toISOString();
    logger.warn('[IntegrationHealth] Circuit opened', { connectorCode, failureCount: cb.failureCount, reason });

    const connector = integrationRegistryService.getConnector(connectorCode);
    if (connector?.healthPolicy.autoQuarantineOnFailure && record.consecutiveFailures >= connector.healthPolicy.maxConsecutiveFailures) {
      integrationRegistryService.updateConnectorState(connectorCode, 'quarantined').catch(() => {});
      logger.warn('[IntegrationHealth] Connector auto-quarantined', { connectorCode, consecutiveFailures: record.consecutiveFailures });
    }
  } else if (cb.state === 'half-open') {
    cb.state = 'open';
    cb.openedAt = new Date().toISOString();
    cb.halfOpenAt = undefined;
    logger.warn('[IntegrationHealth] Circuit re-opened from half-open', { connectorCode });
  }
}

export function checkCircuit(connectorCode: string): { allowed: boolean; circuitState: CircuitState } {
  const cb = getOrCreateCircuitBreaker(connectorCode);

  if (cb.state === 'open') {
    const openedMs = cb.openedAt ? Date.now() - new Date(cb.openedAt).getTime() : 0;
    if (openedMs >= cb.openDurationMs) {
      cb.state = 'half-open';
      cb.halfOpenAt = new Date().toISOString();
      cb.successCount = 0;
      logger.info('[IntegrationHealth] Circuit transitioned to half-open', { connectorCode });
      return { allowed: true, circuitState: 'half-open' };
    }
    return { allowed: false, circuitState: 'open' };
  }

  return { allowed: true, circuitState: cb.state };
}

export function getCircuitBreakerState(connectorCode: string): ConnectorCircuitBreaker {
  return getOrCreateCircuitBreaker(connectorCode);
}

export function getConnectorHealthSnapshot(connectorCode: string, tenantId?: string): IntegrationHealthSnapshot {
  const connector = integrationRegistryService.getConnector(connectorCode);
  const record = getOrCreateFailureRecord(connectorCode);
  const cb = getOrCreateCircuitBreaker(connectorCode);
  const __recentRuns = integrationSyncService.getRecentSyncRuns(connectorCode, 50);
  const recentDeliveries = integrationSyncService.getRecentDeliveries(connectorCode, 50);
  const quarantineEntries = integrationSyncService.getQuarantineEntries(connectorCode, tenantId);

  const completedDeliveries = recentDeliveries.filter((d) => d.status === 'delivered').length;
  const totalDeliveries = recentDeliveries.length;
  const deliverySuccessRate = totalDeliveries > 0 ? completedDeliveries / totalDeliveries : 1;

  return {
    connectorCode,
    tenantId,
    state: (connector?.state ?? 'disabled') as ConnectorState,
    lastSyncAt: record.lastSyncAt,
    lastFailureAt: record.lastFailureAt,
    consecutiveFailures: record.consecutiveFailures,
    quarantineCount: quarantineEntries.length,
    deliverySuccessRate,
    circuitState: cb.state,
    checkedAt: new Date().toISOString(),
  };
}

export function getAllConnectorHealthSnapshots(): IntegrationHealthSnapshot[] {
  const connectors = integrationRegistryService.getAllConnectors();
  return connectors.map((c) => getConnectorHealthSnapshot(c.connectorCode));
}

export function resetCircuitBreaker(connectorCode: string): void {
  const cb = getOrCreateCircuitBreaker(connectorCode);
  cb.state = 'closed';
  cb.failureCount = 0;
  cb.successCount = 0;
  cb.openedAt = undefined;
  cb.halfOpenAt = undefined;
  const record = getOrCreateFailureRecord(connectorCode);
  record.consecutiveFailures = 0;
  logger.info('[IntegrationHealth] Circuit breaker manually reset', { connectorCode });
}

export const integrationHealthService = {
  recordConnectorSuccess,
  recordConnectorFailure,
  checkCircuit,
  getCircuitBreakerState,
  getConnectorHealthSnapshot,
  getAllConnectorHealthSnapshots,
  resetCircuitBreaker,
};
