import { logger } from '../../observability/logger.service';
import type { RunbookDefinition, RunbookTrigger } from '../contracts/operations.types';

const runbooks = new Map<string, RunbookDefinition>();

export function registerRunbook(def: RunbookDefinition): void {
  runbooks.set(def.runbookId, def);
  logger.info(`[RunbookRegistry] Registered: ${def.runbookId} — ${def.title}`);
}

export function getRunbook(runbookId: string): RunbookDefinition | undefined {
  return runbooks.get(runbookId);
}

export function getAllRunbooks(): RunbookDefinition[] {
  return Array.from(runbooks.values());
}

export function getRunbooksByService(serviceCode: string): RunbookDefinition[] {
  return Array.from(runbooks.values()).filter((r) => r.serviceCode === serviceCode);
}

export function getRunbooksByTrigger(trigger: RunbookTrigger): RunbookDefinition[] {
  return Array.from(runbooks.values()).filter((r) => r.triggerTypes.includes(trigger));
}

export function getRunbooksByAlert(alertId: string): RunbookDefinition[] {
  return Array.from(runbooks.values()).filter((r) => r.linkedAlertIds?.includes(alertId));
}

export function bootstrapPlatformRunbooks(): void {
  registerRunbook({
    runbookId: 'dos-core-unhealthy',
    title: 'DOS Core Service Unhealthy',
    owner: 'platform-ops',
    ownerRole: 'platform-engineer',
    escalationOwner: 'platform-lead',
    triggerTypes: ['alert', 'incident'],
    serviceCode: 'dos-core',
    dependencyMap: ['database', 'event-bus', 'cache'],
    healthSignals: ['dos-core health endpoint', 'database ping', 'event bus connectivity'],
    dashboardLinks: ['/admin/operations/diagnostics'],
    alertSources: ['dos-core health checks'],
    recoverySteps: [
      '1. Check /health endpoint response',
      '2. Verify database connectivity: SELECT 1',
      '3. Check event bus connectivity',
      '4. Review recent error logs for root cause',
      '5. Restart service if no data integrity risk',
      '6. Escalate if database is the root cause',
    ],
    rollbackSteps: [
      '1. Identify last stable deployment version',
      '2. Request rollback via recovery service (requires approval)',
      '3. Verify health after rollback',
      '4. Open incident if rollback fails',
    ],
    commonFailureModes: [
      'Database connection pool exhaustion',
      'Out-of-memory crash',
      'Dependency timeout cascade',
      'Bad deployment artifact',
    ],
    knownCaveats: ['Rolling restarts may cause brief degraded state'],
    supportContacts: ['platform-ops'],
    version: '1.0.0',
  });

  registerRunbook({
    runbookId: 'database-connectivity-lost',
    title: 'Database Connectivity Lost',
    owner: 'platform-ops',
    ownerRole: 'platform-engineer',
    escalationOwner: 'dba-team',
    triggerTypes: ['alert', 'incident'],
    dependencyMap: ['postgresql'],
    healthSignals: ['db ping latency', 'connection pool gauge'],
    dashboardLinks: ['/admin/operations/diagnostics'],
    alertSources: ['database health check'],
    recoverySteps: [
      '1. Verify database host is reachable (ping/telnet)',
      '2. Check connection string in environment config',
      '3. Check database server logs for errors',
      '4. Verify max_connections not exceeded',
      '5. Restart connection pool if safe',
      '6. Escalate to DBA if database-side issue',
    ],
    rollbackSteps: [
      '1. Switch to read replica if available',
      '2. Enable circuit breaker for affected services',
      '3. Notify tenants of degraded state',
    ],
    commonFailureModes: [
      'Max connections reached',
      'Network partition between app and DB',
      'DB host OOM/crash',
      'Certificate expiry',
    ],
    knownCaveats: ['Some operations may be queued and replayed after recovery'],
    supportContacts: ['dba-team', 'platform-ops'],
    version: '1.0.0',
  });

  registerRunbook({
    runbookId: 'incident-response-sev0',
    title: 'SEV0 Incident Response',
    owner: 'incident-commander',
    ownerRole: 'platform-lead',
    escalationOwner: 'cto',
    triggerTypes: ['incident'],
    dependencyMap: ['all-services'],
    healthSignals: ['all health endpoints', 'error rates', 'user impact reports'],
    dashboardLinks: ['/admin/operations/incidents', '/admin/operations/diagnostics'],
    alertSources: ['all alert sources'],
    recoverySteps: [
      '1. Immediately open SEV0 incident in incident service',
      '2. Page incident commander and responders',
      '3. Identify blast radius and affected tenants',
      '4. Establish communication channel (bridge/war room)',
      '5. Begin mitigation — containment first, fix second',
      '6. Update incident timeline every 15 minutes',
      '7. Notify affected tenants/customers per SLA',
      '8. Resolve incident and schedule postmortem within 24h',
    ],
    rollbackSteps: [
      '1. Request emergency rollback via recovery service',
      '2. Obtain approval from platform lead',
      '3. Execute rollback and monitor health',
      '4. Confirm resolution with affected teams',
    ],
    commonFailureModes: [
      'Cascading dependency failure',
      'Data corruption',
      'Authentication service outage',
      'Deployment failure across all instances',
    ],
    knownCaveats: ['SEV0 always requires postmortem. No exceptions.'],
    supportContacts: ['incident-commander', 'platform-lead', 'cto'],
    version: '1.0.0',
  });

  logger.info(`[RunbookRegistry] Platform runbooks bootstrapped: ${runbooks.size} registered`);
}

export const runbookRegistryService = {
  registerRunbook,
  getRunbook,
  getAllRunbooks,
  getRunbooksByService,
  getRunbooksByTrigger,
  getRunbooksByAlert,
  bootstrapPlatformRunbooks,
};
