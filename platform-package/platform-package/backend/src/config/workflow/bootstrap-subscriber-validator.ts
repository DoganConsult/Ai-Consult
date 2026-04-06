import { eventBus } from '../../platform/dos/events/event-bus';
import { logger } from '../../platform/dos/observability/logger.service';

interface ConsumedEventContract {
  moduleCode: string;
  eventName: string;
  handler: string;
}

async function loadAllConsumedContracts(): Promise<ConsumedEventContract[]> {
  const contracts: ConsumedEventContract[] = [];
  const modules: Array<{ code: string; importFn: () => Promise<{ consumed?: Record<string, { handler?: string }> }> }> = [
    { code: 'risk', importFn: () => import('../../modules/risk/events/risk.events').then(m => m.RISK_EVENT_CONTRACT) },
    { code: 'compliance', importFn: () => import('../../modules/compliance/events/compliance.events').then(m => m.COMPLIANCE_EVENT_CONTRACT) },
    { code: 'policy', importFn: () => import('../../modules/policy/events/policy.events').then(m => m.POLICY_EVENT_CONTRACT) },
    { code: 'evidence', importFn: () => import('../../modules/evidence/events/evidence.events').then(m => m.EVIDENCE_EVENT_CONTRACT) },
    { code: 'audit', importFn: () => import('../../modules/audit/events/audit.events').then(m => m.AUDIT_EVENT_CONTRACT) },
    { code: 'incident', importFn: () => import('../../modules/incident/events/incident.events').then(m => m.INCIDENT_EVENT_CONTRACT) },
    { code: 'exception', importFn: () => import('../../modules/exception/events/exception.events').then(m => m.EXCEPTION_EVENT_CONTRACT) },
    { code: 'governance', importFn: () => import('../../modules/governance/events/governance.events').then(m => m.GOVERNANCE_EVENT_CONTRACT) },
    { code: 'vendor', importFn: () => import('../../modules/vendor/events/vendor.events').then(m => m.VENDOR_EVENT_CONTRACT) },
    { code: 'qiyas', importFn: () => import('../../modules/qiyas/events/qiyas.events').then(m => m.QIYAS_EVENT_CONTRACT) },
  ];

  for (const mod of modules) {
    try {
      const contract = await mod.importFn();
      if (contract?.consumed) {
        for (const [eventName, meta] of Object.entries(contract.consumed)) {
          contracts.push({ moduleCode: mod.code, eventName, handler: meta.handler || 'unknown' });
        }
      }
    } catch { /* module may not exist */ }
  }

  return contracts;
}

export async function validateBootstrapSubscribers(): Promise<{ passed: boolean; missing: string[]; total: number; registered: number }> {
  const consumed = await loadAllConsumedContracts();
  const subscribers = eventBus.getSubscribers();
  const subscribedEvents = new Set(Object.keys(subscribers));

  const missing: string[] = [];
  for (const c of consumed) {
    if (!subscribedEvents.has(c.eventName)) {
      missing.push(`${c.moduleCode}: ${c.eventName} (handler: ${c.handler})`);
    }
  }

  const passed = missing.length === 0;
  if (!passed) {
    logger.warn(`[BootstrapValidator] ${missing.length}/${consumed.length} consumed events have no registered subscriber: ${missing.join('; ')}`);
  } else {
    logger.info(`[BootstrapValidator] All ${consumed.length} consumed event contracts have registered subscribers`);
  }

  return { passed, missing, total: consumed.length, registered: consumed.length - missing.length };
}
