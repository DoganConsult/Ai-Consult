// ============================================
// DOS Tenancy — Tenant Boundary Service
// Tenant isolation and boundary enforcement:
// cross-tenant access validation, boundary
// configuration, resource counting, quota
// enforcement, and isolation mode checks.
// ============================================

import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../observability/logger.service';
import { toErrorMessage } from '../../../utils/http-error.util';

// ── Types ──

export type IsolationMode = 'strict' | 'permissive';

export interface BoundaryConfig {
  isolation_mode: IsolationMode;
  allow_cross_tenant_read: boolean;
  allow_cross_tenant_write: boolean;
  allowed_partner_tenant_ids: string[];
  max_resources_per_type: Record<string, number>;
}

export interface ResourceCounts {
  tenant_id: string;
  counts: Record<string, number>;
  total: number;
  counted_at: string;
}

export interface QuotaValidation {
  allowed: boolean;
  resource_type: string;
  current_count: number;
  max_allowed: number;
  remaining: number;
}

/**
 * Default boundary configuration for new tenants.
 * Strict isolation by default per Law 11 (deny by default).
 */
const DEFAULT_BOUNDARY_CONFIG: BoundaryConfig = {
  isolation_mode: 'strict',
  allow_cross_tenant_read: false,
  allow_cross_tenant_write: false,
  allowed_partner_tenant_ids: [],
  max_resources_per_type: {
    users: 500,
    policies: 1000,
    risks: 2000,
    controls: 5000,
    evidence: 10000,
    audits: 500,
    incidents: 2000,
    vendors: 1000,
    exceptions: 500,
  },
};

/**
 * Tables tracked for per-tenant resource counting.
 * Each entry maps a logical resource type to its schema-qualified table name.
 */
const RESOURCE_TABLES: Record<string, string> = {
  users: 'users',
  policies: 'policies',
  risks: 'risks',
  controls: 'controls',
  evidence: 'evidence',
  audits: 'audits',
  incidents: 'incidents',
  vendors: 'vendors',
  exceptions: 'exceptions',
  workflows: 'workflows',
  reports: 'reports',
};

// ── Service Functions ──

/**
 * Enforce that a resource belongs to the expected tenant.
 * Throws an error if the resource's tenant ID does not match the
 * requesting tenant, preventing cross-tenant data leakage.
 */
export function enforceTenantBoundary(tenantId: string, resourceTenantId: string): void {
  if (tenantId !== resourceTenantId) {
    logger.warn('[DOS TenantBoundary] Tenant boundary violation detected', {
      requestingTenant: tenantId,
      resourceTenant: resourceTenantId,
    });
    throw new Error(
      `Tenant boundary violation: tenant '${tenantId}' cannot access resources owned by tenant '${resourceTenantId}'`,
    );
  }
}

/**
 * Validate whether cross-tenant access is allowed between two tenants.
 * Checks both source and target boundary configurations to determine
 * if the access should be permitted. Both tenants must explicitly
 * allow cross-tenant access and list each other as partners.
 */
export async function validateCrossTenantAccess(
  sourceTenantId: string,
  targetTenantId: string,
): Promise<boolean> {
  // Same tenant is always allowed
  if (sourceTenantId === targetTenantId) return true;

  try {
    const sourceConfig = await getTenantBoundaryConfig(sourceTenantId);
    const targetConfig = await getTenantBoundaryConfig(targetTenantId);

    // Both tenants must allow cross-tenant reads at minimum
    if (!sourceConfig.allow_cross_tenant_read || !targetConfig.allow_cross_tenant_read) {
      logger.info('[DOS TenantBoundary] Cross-tenant access denied — read not allowed', {
        source: sourceTenantId, target: targetTenantId,
      });
      return false;
    }

    // Source must list target as allowed partner (and vice versa)
    const sourceAllowsTarget = sourceConfig.allowed_partner_tenant_ids.includes(targetTenantId);
    const targetAllowsSource = targetConfig.allowed_partner_tenant_ids.includes(sourceTenantId);

    if (!sourceAllowsTarget || !targetAllowsSource) {
      logger.info('[DOS TenantBoundary] Cross-tenant access denied — not mutual partners', {
        source: sourceTenantId, target: targetTenantId,
        sourceAllowsTarget, targetAllowsSource,
      });
      return false;
    }

    return true;
  } catch (err) {
    // Law 11: deny by default when boundary check fails
    logger.error('[DOS TenantBoundary] Cross-tenant validation failed, denying by default (Law 11)', {
      source: sourceTenantId, target: targetTenantId, error: toErrorMessage(err),
    });
    return false;
  }
}

/**
 * Retrieve the tenant boundary configuration.
 * Falls back to the default strict configuration if no custom config
 * has been stored for the tenant.
 */
export async function getTenantBoundaryConfig(tenantId: string): Promise<BoundaryConfig> {
  try {
    const result = await safeQuery(
      `SELECT config
       FROM dos.tenant_boundary_configs
       WHERE tenant_id = $1`,
      [tenantId],
    );

    if (result.rows.length === 0) {
      // Return default strict config — Law 11 deny by default
      return { ...DEFAULT_BOUNDARY_CONFIG };
    }

    const stored = result.rows[0].config as Record<string, any>;

    // Merge stored config with defaults to ensure all fields are present
    return {
      isolation_mode: stored.isolation_mode || DEFAULT_BOUNDARY_CONFIG.isolation_mode,
      allow_cross_tenant_read: stored.allow_cross_tenant_read ?? DEFAULT_BOUNDARY_CONFIG.allow_cross_tenant_read,
      allow_cross_tenant_write: stored.allow_cross_tenant_write ?? DEFAULT_BOUNDARY_CONFIG.allow_cross_tenant_write,
      allowed_partner_tenant_ids: stored.allowed_partner_tenant_ids || DEFAULT_BOUNDARY_CONFIG.allowed_partner_tenant_ids,
      max_resources_per_type: {
        ...DEFAULT_BOUNDARY_CONFIG.max_resources_per_type,
        ...(stored.max_resources_per_type || {}),
      },
    };
  } catch (err) {
    logger.error('[DOS TenantBoundary] Failed to fetch boundary config, using strict defaults', {
      tenantId, error: toErrorMessage(err),
    });
    return { ...DEFAULT_BOUNDARY_CONFIG };
  }
}

/**
 * Update the tenant boundary configuration.
 * Performs an upsert — creates the config row if it does not exist,
 * updates it if it already does.
 */
export async function updateTenantBoundaryConfig(
  tenantId: string,
  config: BoundaryConfig,
): Promise<BoundaryConfig> {
  // Validate isolation mode
  if (!['strict', 'permissive'].includes(config.isolation_mode)) {
    throw new Error(`Invalid isolation mode: '${config.isolation_mode}'. Must be 'strict' or 'permissive'.`);
  }

  // In strict mode, cross-tenant access flags must be false
  if (config.isolation_mode === 'strict') {
    if (config.allow_cross_tenant_read || config.allow_cross_tenant_write) {
      throw new Error('Cross-tenant access cannot be enabled in strict isolation mode');
    }
    if (config.allowed_partner_tenant_ids.length > 0) {
      throw new Error('Partner tenant IDs cannot be set in strict isolation mode');
    }
  }

  // Write access requires read access
  if (config.allow_cross_tenant_write && !config.allow_cross_tenant_read) {
    throw new Error('Cross-tenant write access requires cross-tenant read access to be enabled');
  }

  try {
    const configJson = JSON.stringify(config);

    await safeQuery(
      `INSERT INTO dos.tenant_boundary_configs (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = $2, updated_at = NOW()`,
      [tenantId, configJson],
    );

    logger.info('[DOS TenantBoundary] Boundary config updated', {
      tenantId, isolationMode: config.isolation_mode,
    });

    return config;
  } catch (err) {
    logger.error('[DOS TenantBoundary] Failed to update boundary config', {
      tenantId, error: toErrorMessage(err),
    });
    throw err;
  }
}

/**
 * Count resources per tracked table within the tenant's schema.
 * Returns a map of resource type to count and the aggregate total.
 */
export async function getTenantResourceCounts(tenantId: string): Promise<ResourceCounts> {
  const schema = tenantSchema(tenantId);
  const counts: Record<string, number> = {};
  let total = 0;

  for (const [resourceType, tableName] of Object.entries(RESOURCE_TABLES)) {
    try {
      const result = await safeQuery(
        `SELECT COUNT(*)::int AS cnt
         FROM "${schema}"."${tableName}"
         WHERE deleted_at IS NULL`,
      );
      const count = result.rows[0]?.cnt || 0;
      counts[resourceType] = count;
      total += count;
    } catch (err) {
      // Table may not exist for this tenant's schema — record 0
      counts[resourceType] = 0;
      logger.debug('[DOS TenantBoundary] Table not found or inaccessible for counting', {
        tenantId, table: tableName, error: toErrorMessage(err),
      });
    }
  }

  return {
    tenant_id: tenantId,
    counts,
    total,
    counted_at: new Date().toISOString(),
  };
}

/**
 * Validate whether the tenant is within quota limits for a given resource type.
 * Returns a structured result indicating if the operation is allowed and
 * the remaining capacity.
 */
export async function validateTenantQuota(
  tenantId: string,
  resourceType: string,
): Promise<QuotaValidation> {
  const config = await getTenantBoundaryConfig(tenantId);
  const maxAllowed = config.max_resources_per_type[resourceType];

  // If no quota is defined for this resource type, allow by default
  if (maxAllowed === undefined || maxAllowed === null) {
    return {
      allowed: true,
      resource_type: resourceType,
      current_count: 0,
      max_allowed: -1, // unlimited
      remaining: -1,
    };
  }

  try {
    const schema = tenantSchema(tenantId);
    const tableName = RESOURCE_TABLES[resourceType];

    if (!tableName) {
      logger.warn('[DOS TenantBoundary] Unknown resource type for quota check', { tenantId, resourceType });
      // Unknown resource type — allow by default but log the anomaly
      return {
        allowed: true,
        resource_type: resourceType,
        current_count: 0,
        max_allowed: maxAllowed,
        remaining: maxAllowed,
      };
    }

    const result = await safeQuery(
      `SELECT COUNT(*)::int AS cnt
       FROM "${schema}"."${tableName}"
       WHERE deleted_at IS NULL`,
    );

    const currentCount = result.rows[0]?.cnt || 0;
    const remaining = maxAllowed - currentCount;
    const allowed = currentCount < maxAllowed;

    if (!allowed) {
      logger.warn('[DOS TenantBoundary] Tenant quota exceeded', {
        tenantId, resourceType, currentCount, maxAllowed,
      });
    }

    return {
      allowed,
      resource_type: resourceType,
      current_count: currentCount,
      max_allowed: maxAllowed,
      remaining: Math.max(0, remaining),
    };
  } catch (err) {
    // Law 11: deny by default when quota cannot be verified
    logger.error('[DOS TenantBoundary] Quota validation failed, denying by default (Law 11)', {
      tenantId, resourceType, error: toErrorMessage(err),
    });
    return {
      allowed: false,
      resource_type: resourceType,
      current_count: 0,
      max_allowed: maxAllowed,
      remaining: 0,
    };
  }
}

/**
 * Check whether strict tenant isolation is enforced for the given tenant.
 * Returns true if isolation_mode is 'strict', false if 'permissive'.
 * Defaults to true (strict) on any error per Law 11.
 */
export async function isTenantIsolationEnforced(tenantId: string): Promise<boolean> {
  try {
    const config = await getTenantBoundaryConfig(tenantId);
    return config.isolation_mode === 'strict';
  } catch (err) {
    // Law 11: assume strict isolation on failure
    logger.error('[DOS TenantBoundary] Isolation check failed, assuming strict (Law 11)', {
      tenantId, error: toErrorMessage(err),
    });
    return true;
  }
}

// ── Namespace Export ──

export const TenantBoundaryService = {
  enforceTenantBoundary,
  validateCrossTenantAccess,
  getTenantBoundaryConfig,
  updateTenantBoundaryConfig,
  getTenantResourceCounts,
  validateTenantQuota,
  isTenantIsolationEnforced,
};
