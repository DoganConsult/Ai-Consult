import { integrationRegistryService } from '../registry/integration-registry.service';
import { integrationSyncService } from '../sync/integration-sync.service';
import { integrationHealthService } from '../health/integration-health.service';
import { integrationAdminService } from '../admin/integration-admin.service';
import type {
  ConnectorDiagnostics,
  RateLimitStatus,
} from '../contracts/integration.types';

const requestCountsPerMinute = new Map<string, { count: number; windowStart: number }>();
const requestCountsPerHour = new Map<string, { count: number; windowStart: number }>();

export function trackConnectorRequest(connectorCode: string): void {
  const now = Date.now();

  const minute = requestCountsPerMinute.get(connectorCode) ?? { count: 0, windowStart: now };
  if (now - minute.windowStart > 60_000) {
    requestCountsPerMinute.set(connectorCode, { count: 1, windowStart: now });
  } else {
    requestCountsPerMinute.set(connectorCode, { count: minute.count + 1, windowStart: minute.windowStart });
  }

  const hour = requestCountsPerHour.get(connectorCode) ?? { count: 0, windowStart: now };
  if (now - hour.windowStart > 3_600_000) {
    requestCountsPerHour.set(connectorCode, { count: 1, windowStart: now });
  } else {
    requestCountsPerHour.set(connectorCode, { count: hour.count + 1, windowStart: hour.windowStart });
  }
}

export function getRateLimitStatus(connectorCode: string): RateLimitStatus {
  const connector = integrationRegistryService.getConnector(connectorCode);
  const now = Date.now();

  const minuteRecord = requestCountsPerMinute.get(connectorCode);
  const hourRecord = requestCountsPerHour.get(connectorCode);

  const requestsLastMinute = minuteRecord && now - minuteRecord.windowStart <= 60_000
    ? minuteRecord.count
    : 0;

  const requestsLastHour = hourRecord && now - hourRecord.windowStart <= 3_600_000
    ? hourRecord.count
    : 0;

  const maxPerMinute = connector?.rateLimits.maxRequestsPerMinute ?? Infinity;
  const maxPerHour = connector?.rateLimits.maxRequestsPerHour ?? Infinity;
  const throttled = requestsLastMinute >= maxPerMinute || requestsLastHour >= maxPerHour;

  return {
    requestsLastMinute,
    requestsLastHour,
    throttled,
  };
}

export function getConnectorDiagnostics(connectorCode: string, tenantId?: string): ConnectorDiagnostics {
  const connector = integrationRegistryService.getConnector(connectorCode);
  const health = integrationHealthService.getConnectorHealthSnapshot(connectorCode, tenantId);
  const recentSyncRuns = integrationSyncService.getRecentSyncRuns(connectorCode, 10);
  const recentDeliveries = integrationSyncService.getRecentDeliveries(connectorCode, 10);
  const quarantineEntries = integrationSyncService.getQuarantineEntries(connectorCode, tenantId);
  const credentialStatus = tenantId
    ? integrationRegistryService.getCredentialBinding(connectorCode, tenantId)
    : null;
  const rateLimitStatus = getRateLimitStatus(connectorCode);

  return {
    connectorCode,
    tenantId,
    state: connector?.state ?? 'disabled',
    health,
    recentSyncRuns,
    recentDeliveries,
    quarantineCount: quarantineEntries.length,
    credentialStatus,
    rateLimitStatus,
    snapshotAt: new Date().toISOString(),
  };
}

export function getAllConnectorDiagnostics(): ConnectorDiagnostics[] {
  const connectors = integrationRegistryService.getAllConnectors();
  return connectors.map((c) => getConnectorDiagnostics(c.connectorCode));
}

export interface IntegrationPlatformDiagnostics {
  totalConnectors: number;
  activeConnectors: number;
  pausedConnectors: number;
  quarantinedConnectors: number;
  disabledConnectors: number;
  totalQuarantineEntries: number;
  openCircuitBreakers: number;
  halfOpenCircuitBreakers: number;
  recentAdminActions: ReturnType<typeof integrationAdminService.getAdminActionHistory>;
  connectorHealthSummaries: ReturnType<typeof integrationHealthService.getAllConnectorHealthSnapshots>;
  capturedAt: string;
}

export function getIntegrationPlatformDiagnostics(): IntegrationPlatformDiagnostics {
  const connectors = integrationRegistryService.getAllConnectors();
  const healthSnapshots = integrationHealthService.getAllConnectorHealthSnapshots();

  const totalQuarantineEntries = connectors.reduce((sum, c) => {
    return sum + integrationSyncService.getQuarantineEntries(c.connectorCode).length;
  }, 0);

  return {
    totalConnectors: connectors.length,
    activeConnectors: connectors.filter((c) => c.state === 'active').length,
    pausedConnectors: connectors.filter((c) => c.state === 'paused').length,
    quarantinedConnectors: connectors.filter((c) => c.state === 'quarantined').length,
    disabledConnectors: connectors.filter((c) => c.state === 'disabled').length,
    totalQuarantineEntries,
    openCircuitBreakers: healthSnapshots.filter((h) => h.circuitState === 'open').length,
    halfOpenCircuitBreakers: healthSnapshots.filter((h) => h.circuitState === 'half-open').length,
    recentAdminActions: integrationAdminService.getAdminActionHistory(undefined, 20),
    connectorHealthSummaries: healthSnapshots,
    capturedAt: new Date().toISOString(),
  };
}

export const integrationDiagnosticsService = {
  trackConnectorRequest,
  getRateLimitStatus,
  getConnectorDiagnostics,
  getAllConnectorDiagnostics,
  getIntegrationPlatformDiagnostics,
};
