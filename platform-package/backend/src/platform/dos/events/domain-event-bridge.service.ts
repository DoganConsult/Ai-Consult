// @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
import { logger } from '../observability/logger.service';
// ============================================
// Shahin — Domain Event Bridge
// Single place: dashboard cache invalidation + EventBus publish
// on any CUD. Called from automation middleware (and optionally
// from routes that don't use it, e.g. evidence).
//
// Module → event type resolution is driven by ModuleDescriptor
// (from module-workflow-registry.service.ts) — no more hand-coded maps.
// ============================================

import { eventBus } from './event-bus';
import { resolveByRoute, resolveByGrcName, resolveEventTypeFromDescriptor } from '../modules/lifecycle/module-workflow-registry.service';

export type DomainAction = 'create' | 'update' | 'delete';

/**
 * Call after any CUD so that:
 * 1) Dashboard cache is invalidated for the tenant
 * 2) EventBus gets an event (WebSocket + subscribers)
 * Fire-and-forget; never throws.
 */
export function notifyDomainChange(
  tenantId: string,
  module: string,
  action: DomainAction,
  entityId: string,
): void {
  if (!tenantId || !entityId) return;

  try {
    // Resolve dashboardTarget from descriptor (grcModuleName or route alias)
    const descriptor = resolveByGrcName(module, tenantId) || resolveByRoute(module, tenantId);
    const target = descriptor?.dashboardTarget || module;
    eventBus.publish({
      eventType: 'dashboard.cache_invalidated' as any,
      tenantId,
      sourceService: 'domain-event-bridge',
      severity: 'info',
      payload: { module: target, action, entityId },
    }).catch(() => {});
  } catch (e) {
    logger.error('[DomainEventBridge] Invalidation failed:', (e as Error).message);
  }

  try {
    const eventType = resolveEventTypeFromDescriptor(module, action, tenantId) as any;
    eventBus.publish({
      eventType,
      tenantId,
      sourceService: 'domain-event-bridge',
      entityType: module,
      entityId,
      severity: 'info',
      payload: { action, module, entityId },
    }).catch(err => {
      logger.error('[DomainEventBridge] EventBus publish failed:', (err as Error).message);
    });
  } catch (e) {
    logger.error('[DomainEventBridge] EventBus publish failed:', (e as Error).message);
  }
}
