// @ts-nocheck
/**
 * WebSocket Service — Real-time push notifications to tenant users.
 *
 * Provides fire-and-forget push methods for routes and event handlers.
 * The actual WebSocket server is initialized in server-startup.ts via initWebSocket().
 */

import { logger } from '../../../../../platform/dos/observability/logger.service';

interface WSEvent {
  type: string;
  tenantId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// In-memory tracking of active WebSocket connections per tenant
const activeTenants = new Map<string, Set<string>>();

/**
 * Push a WebSocket event to all connections for a given tenant.
 * Fire-and-forget — errors are logged, never thrown.
 */
export function pushToTenant(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
): void {
  try {
    const event = buildWSEvent(tenantId, eventType, payload);

    // If no WebSocket server is running (e.g. during tests), log and return
    const global_ = globalThis as Record<string, unknown>;
    const wss = global_.__wss;
    if (!wss) {
      logger.debug(`[WS] No WebSocket server — skipping push for ${eventType} to ${tenantId}`);
      return;
    }

    let sent = 0;
    wss.clients?.forEach?.((client: any) => {
      if (client.readyState === 1 && client.tenantId === tenantId) {
        client.send(JSON.stringify(event));
        sent++;
      }
    });

    if (sent > 0) {
      logger.debug(`[WS] Pushed ${eventType} to ${sent} clients for tenant ${tenantId}`);
    }
  } catch (err) {
    logger.warn('[WS] pushToTenant failed', {
      tenantId,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Build a typed WebSocket event payload.
 */
export function buildWSEvent(
  tenantId: string,
  type: string,
  payload: Record<string, unknown> = {},
): WSEvent {
  return {
    type,
    tenantId,
    payload,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get all tenant IDs that currently have active WebSocket connections.
 */
export function getActiveTenantIds(): string[] {
  return [...activeTenants.keys()];
}

/**
 * Register a tenant connection (called by WS server on connect).
 */
export function registerConnection(tenantId: string, connectionId: string): void {
  if (!activeTenants.has(tenantId)) {
    activeTenants.set(tenantId, new Set());
  }
  activeTenants.get(tenantId)!.add(connectionId);
}

/**
 * Unregister a tenant connection (called by WS server on disconnect).
 */
export function unregisterConnection(tenantId: string, connectionId: string): void {
  const conns = activeTenants.get(tenantId);
  if (conns) {
    conns.delete(connectionId);
    if (conns.size === 0) activeTenants.delete(tenantId);
  }
}
