// @ts-nocheck
import { logger } from '../../../../utils/logger';
// ============================================
// AGRC-OS — Intelligent Resource Allocator Service
// Requirements: 3.2 Intelligent Resource Allocation
// Purpose: Allocates compute, memory, and rate limits to agents
// based on priority, workload, and tenant quotas
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC , catchHandler } from '../../../../utils/resilient-catch';

export interface ResourceAllocation {
  agentId: string;
  tenantId: string;
  computeUnits: number;        // CPU/memory allocation (0-100)
  rateLimitPerMinute: number;  // Max requests per minute
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: number;   // Expected execution time in ms
  allocatedAt: string;
  expiresAt: string;
}

export interface ResourceQuota {
  tenantId: string;
  totalComputeUnits: number;
  totalRateLimitPerMinute: number;
  reservedForCritical: number;  // Percentage reserved for critical agents
  currentUsage: {
    computeUnits: number;
    rateLimitUsed: number;
  };
}

/**
 * Get tenant resource quota
 */
export async function getTenantResourceQuota(tenantId: string): Promise<ResourceQuota> {
  const schema = tenantSchema(tenantId);
  
  // Get current active allocations
  const activeRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT agent_id, compute_units, rate_limit_per_minute, priority
     FROM "${schema}".resource_allocations
     WHERE tenant_id = $1 AND expires_at > NOW() AND is_active = true`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query resource_allocations' });

  const currentUsage = {
    computeUnits: activeRes.rows.reduce((sum, r) => sum + (Number(r.compute_units) || 0), 0),
    rateLimitUsed: activeRes.rows.reduce((sum, r) => sum + (Number(r.rate_limit_per_minute) || 0), 0),
  };

  // Default quota (can be overridden per tenant)
  const defaultQuota: ResourceQuota = {
    tenantId,
    totalComputeUnits: 1000,
    totalRateLimitPerMinute: 1000,
    reservedForCritical: 30, // 30% reserved for critical agents
    currentUsage,
  };

  // Check for tenant-specific quota override
  try {
    const quotaRes = await safeQuery(
      `SELECT config_value FROM "${schema}".platform_operation_config
       WHERE config_key = 'resource_quota' AND owner_module = 'platform' LIMIT 1`,
      []
    );
    if (quotaRes.rows.length > 0) {
      const custom = JSON.parse(getFirstRow(quotaRes)?.config_value || '{}');
      return { ...defaultQuota, ...custom, currentUsage };
    }
  } catch { /* fall through to default */ }

  return defaultQuota;
}

/**
 * Allocate resources to an agent based on priority and workload
 */
export async function allocateResources(
  tenantId: string,
  agentId: string,
  priority: 'critical' | 'high' | 'medium' | 'low',
  estimatedDuration?: number
): Promise<ResourceAllocation | null> {
  const schema = tenantSchema(tenantId);
  const quota = await getTenantResourceQuota(tenantId);

  // Calculate allocation based on priority
  const priorityWeights: Record<string, number> = {
    critical: 0.4,  // 40% of available resources
    high: 0.3,      // 30%
    medium: 0.2,    // 20%
    low: 0.1,       // 10%
  };

  const availableCompute = quota.totalComputeUnits - quota.currentUsage.computeUnits;
  const reservedCritical = quota.totalComputeUnits * (quota.reservedForCritical / 100);
  const availableForNonCritical = availableCompute - reservedCritical;

  let computeUnits: number;
  if (priority === 'critical') {
    computeUnits = Math.min(reservedCritical, availableCompute * priorityWeights[priority]);
  } else {
    computeUnits = Math.min(availableForNonCritical * priorityWeights[priority], availableCompute * priorityWeights[priority]);
  }

  // Ensure minimum allocation
  computeUnits = Math.max(computeUnits, 10);

  // Rate limit allocation (requests per minute)
  const availableRateLimit = quota.totalRateLimitPerMinute - quota.currentUsage.rateLimitUsed;
  const rateLimitPerMinute = Math.floor(availableRateLimit * priorityWeights[priority]);
  const minRateLimit = priority === 'critical' ? 50 : priority === 'high' ? 30 : priority === 'medium' ? 15 : 5;
  const finalRateLimit = Math.max(rateLimitPerMinute, minRateLimit);

  // Check if allocation is possible
  if (computeUnits < 10 || finalRateLimit < 5) {
    await eventBus.publish({
      tenantId,
      eventType: 'resource_allocation_failed',
      severity: 'warning',
      entityId: agentId,
      payload: { agentId, priority, reason: 'Insufficient resources', quota },
    });
    return null;
  }

  // Calculate expiry (default 1 hour, or based on estimated duration)
  const duration = estimatedDuration || 3600000; // 1 hour default
  const expiresAt = new Date(Date.now() + duration);

  // Store allocation
  try {
    await safeQuery(
      `INSERT INTO "${schema}".resource_allocations
       (tenant_id, agent_id, compute_units, rate_limit_per_minute, priority, estimated_duration, allocated_at, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, true)
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET
         compute_units = EXCLUDED.compute_units,
         rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
         priority = EXCLUDED.priority,
         estimated_duration = EXCLUDED.estimated_duration,
         expires_at = EXCLUDED.expires_at,
         is_active = true,
         updated_at = NOW()`,
      [tenantId, agentId, computeUnits, finalRateLimit, priority, duration, expiresAt.toISOString()]
    );

    const allocation: ResourceAllocation = {
      agentId,
      tenantId,
      computeUnits,
      rateLimitPerMinute: finalRateLimit,
      priority,
      estimatedDuration: duration,
      allocatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await eventBus.publish({
      tenantId,
      eventType: 'resource_allocated',
      severity: 'info',
      entityId: agentId,
      payload: allocation,
    });

    return allocation;
  } catch (err: unknown) {
    logger.error(`[ResourceAllocator] Failed to allocate resources: ${toErrorMessage(err)}`);
    return null;
  }
}

/**
 * Release resources for an agent
 */
export async function releaseResources(tenantId: string, agentId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".resource_allocations
     SET is_active = false, released_at = NOW(), updated_at = NOW()
     WHERE tenant_id = $1 AND agent_id = $2 AND is_active = true`,
    [tenantId, agentId]
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  await eventBus.publish({
    tenantId,
    eventType: 'resource_released',
    severity: 'info',
    entityId: agentId,
    payload: { agentId },
  });
}

/**
 * Get current resource allocation for an agent
 */
export async function getAgentResourceAllocation(
  tenantId: string,
  agentId: string
): Promise<ResourceAllocation | null> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT agent_id, compute_units, rate_limit_per_minute, priority,
            estimated_duration, allocated_at, expires_at
     FROM "${schema}".resource_allocations
     WHERE tenant_id = $1 AND agent_id = $2 AND is_active = true AND expires_at > NOW()
     ORDER BY allocated_at DESC LIMIT 1`,
    [tenantId, agentId]
  ), { tenantId: tenantId, operation: 'query resource_allocations' });

  if (result.rows.length === 0) return null;

  const row = getFirstRow(result);
  return {
    agentId: row.agent_id,
    tenantId,
    computeUnits: Number(row.compute_units) || 0,
    rateLimitPerMinute: Number(row.rate_limit_per_minute) || 0,
    priority: row.priority,
    estimatedDuration: Number(row.estimated_duration) || 0,
    allocatedAt: row.allocated_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Cleanup expired allocations (should be called periodically)
 */
export async function cleanupExpiredAllocations(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `UPDATE "${schema}".resource_allocations
     SET is_active = false, released_at = NOW(), updated_at = NOW()
     WHERE tenant_id = $1 AND expires_at <= NOW() AND is_active = true
     RETURNING agent_id`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'update resource_allocations' });

  return result.rows.length;
}
