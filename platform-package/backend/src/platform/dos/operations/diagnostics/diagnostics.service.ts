import { platformHealthService } from '../health/platform-health.service';
import { metricsRegistryService } from '../metrics/metrics-registry.service';
import { traceContextService } from '../tracing/trace-context.service';
import { reliabilityService } from '../reliability/reliability.service';
import { incidentService } from '../incidents/incident.service';
import { recoveryService } from '../recovery/recovery.service';
import { alertService } from '../alerts/alert.service';

export interface DiagnosticsSnapshot {
  health: Awaited<ReturnType<typeof platformHealthService.getPlatformHealthSnapshot>>;
  activeIncidents: Awaited<ReturnType<typeof incidentService.getActiveIncidents>>;
  activeAlerts: Awaited<ReturnType<typeof alertService.getActiveAlerts>>;
  circuitBreakers: Awaited<ReturnType<typeof reliabilityService.getCircuitBreakerStatuses>>;
  deadLetterCount: number;
  activeSpans: number;
  sloBreaches: Awaited<ReturnType<typeof metricsRegistryService.getBreachedSlos>>;
  pendingRecoveryActions: number;
  capturedAt: string;
}

export async function getDiagnosticsSnapshot(): Promise<DiagnosticsSnapshot> {
  const [health, sloBreaches] = await Promise.all([
    platformHealthService.getPlatformHealthSnapshot(),
    Promise.resolve(metricsRegistryService.getBreachedSlos()),
  ]);

  return {
    health,
    activeIncidents: incidentService.getActiveIncidents(),
    activeAlerts: alertService.getActiveAlerts(),
    circuitBreakers: reliabilityService.getCircuitBreakerStatuses(),
    deadLetterCount: reliabilityService.getDeadLetterEntries().length,
    activeSpans: traceContextService.getActiveSpans().length,
    sloBreaches,
    pendingRecoveryActions: recoveryService.getPendingRecoveryActions().length,
    capturedAt: new Date().toISOString(),
  };
}

export interface ServiceDiagnostics {
  serviceCode: string;
  health: Awaited<ReturnType<typeof platformHealthService.getDomainHealth>>;
  activeAlerts: Awaited<ReturnType<typeof alertService.getActiveAlerts>>;
  circuitBreakerStatuses: ReturnType<typeof reliabilityService.getCircuitBreakerStatuses>;
  recentSpans: ReturnType<typeof traceContextService.getRecentSpans>;
}

export async function getServiceDiagnostics(serviceCode: string): Promise<ServiceDiagnostics> {
  const health = await platformHealthService.getDomainHealth(serviceCode);
  return {
    serviceCode,
    health,
    activeAlerts: alertService.getActiveAlerts(),
    circuitBreakerStatuses: reliabilityService.getCircuitBreakerStatuses().filter(
      (cb) => cb.name.startsWith(serviceCode),
    ),
    recentSpans: traceContextService.getRecentSpans(50).filter(
      (s) => s.serviceCode === serviceCode,
    ),
  };
}

export const diagnosticsService = {
  getDiagnosticsSnapshot,
  getServiceDiagnostics,
};
