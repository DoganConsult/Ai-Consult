// @ts-nocheck
/**
 * load-lifecycle-registrations.ts
 *
 * Imports all module lifecycle registration files at startup.
 * Each file calls registerLifecycleDefinition() as a side effect.
 *
 * Law 5: Generic lifecycle engine — all registrations go through DOS.
 *
 * M6: Critical modules MUST load successfully in production.
 * Non-critical modules log warnings but do not block startup.
 */

import { logger } from '../platform/dos/observability/logger.service';

const CRITICAL_MODULES = new Set([
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident',
  'exception', 'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action',
  'bootstrap', 'onboarding', 'provisioning', 'workflow',
]);

const MODULE_CODES = [
  'action', 'admin', 'agrc-engine', 'ai', 'ai-governance', 'analytics',
  'asset', 'audit', 'bcp', 'bootstrap', 'compliance', 'controls',
  'dashboard', 'dora', 'evidence', 'exception', 'foundation', 'governance',
  'governance-ai', 'governance-os', 'inbox', 'incident', 'integrations',
  'issues', 'journey', 'ksa-regulatory', 'local-knowledge', 'navigation',
  'notification', 'onboarding', 'packs', 'policy', 'portals', 'privacy',
  'proactive-leadership', 'provisioning', 'qiyas', 'records', 'remediation',
  'reporting', 'risk', 'team', 'training', 'vendor', 'widgets', 'workflow',
];

export async function loadLifecycleRegistrations(): Promise<void> {
  let loaded = 0;
  let failed = 0;
  const failedModules: string[] = [];
  const failedCritical: string[] = [];

  for (const code of MODULE_CODES) {
    try {
      await import(`../modules/${code}/lifecycle-registration.ts`).catch(() =>
        import(`../modules/${code}/lifecycle-registration.js`)
      );
      loaded++;
    } catch (err) {
      failed++;
      failedModules.push(code);
      const isCritical = CRITICAL_MODULES.has(code);
      if (isCritical) failedCritical.push(code);
      logger[isCritical ? 'error' : 'warn'](
        `[Lifecycle] ${isCritical ? 'CRITICAL' : 'Non-critical'}: Failed to load lifecycle registration for module "${code}"`,
        { error: err instanceof Error ? err.message : String(err), critical: isCritical },
      );
    }
  }

  if (failedModules.length > 0) {
    logger.warn(`[Lifecycle] Failed modules: ${failedModules.join(', ')}`);
  }

  if (failedCritical.length > 0) {
    const msg = `[Lifecycle] ${failedCritical.length} critical module(s) failed to register: ${failedCritical.join(', ')}. DB fallback will be used but in-memory authorization is degraded.`;
    if (process.env.NODE_ENV === 'production') {
      logger.error(msg);
      throw new Error(msg);
    }
    logger.error(msg);
  }

  logger.info(`[Lifecycle] Loaded ${loaded}/${MODULE_CODES.length} module lifecycle registrations (${failed} skipped, ${failedCritical.length} critical)`);
}
