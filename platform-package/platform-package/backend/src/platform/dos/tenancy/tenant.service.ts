// ============================================
// DOS Tenancy — Core Tenant Service
// Tenant identity and lifecycle management:
// CRUD operations, slug lookup, paginated
// listing with filters, and tenant access
// validation.
// ============================================

import { safeQuery } from '../../../config/database';
import { logger } from '../observability/logger.service';
import { toErrorMessage } from '../../../utils/http-error.util';
import { randomUUID } from 'crypto';

// ── Types ──

export type TenantStatus = 'provisioning' | 'active' | 'suspended' | 'decommissioned' | 'deleted';

export type TenantPlan = 'starter' | 'professional' | 'enterprise' | 'custom';

export interface TenantRecord {
  tenant_id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  domain: string | null;
  logo_url: string | null;
  config: Record<string, any>;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  activated_at: string | null;
  metadata: Record<string, any>;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: TenantPlan;
  domain?: string;
  logoUrl?: string;
  ownerUserId: string;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TenantFilters {
  status?: TenantStatus;
  plan?: TenantPlan;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// ── Service Functions ──

/**
 * Fetch a single tenant record by ID, including status, plan, and config.
 * Returns null if the tenant does not exist or has been hard-deleted.
 */
export async function getTenant(tenantId: string): Promise<TenantRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT tenant_id, name, slug, status, plan, domain, logo_url, config,
              owner_user_id, created_at, updated_at, deleted_at, activated_at, metadata
       FROM dos.tenants
       WHERE tenant_id = $1`,
      [tenantId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as TenantRecord;
  } catch (err) {
    logger.error('[DOS Tenancy] Failed to fetch tenant', { tenantId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Create a new tenant record with initial status 'provisioning'.
 * Generates a UUID for the tenant_id and validates slug uniqueness.
 */
export async function createTenant(input: CreateTenantInput): Promise<TenantRecord> {
  const tenantId = randomUUID();
  const plan = input.plan || 'starter';
  const config = input.config ? JSON.stringify(input.config) : '{}';
  const metadata = input.metadata ? JSON.stringify(input.metadata) : '{}';

  // Validate slug uniqueness before insert
  const existing = await safeQuery(
    `SELECT tenant_id FROM dos.tenants WHERE slug = $1 AND status != 'deleted'`,
    [input.slug],
  );
  if (existing.rows.length > 0) {
    throw new Error(`Tenant slug '${input.slug}' is already in use`);
  }

  try {
    await safeQuery(
      `INSERT INTO dos.tenants
         (tenant_id, name, slug, status, plan, domain, logo_url, config,
          owner_user_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, 'provisioning', $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        tenantId,
        input.name,
        input.slug,
        plan,
        input.domain || null,
        input.logoUrl || null,
        config,
        input.ownerUserId,
        metadata,
      ],
    );

    logger.info('[DOS Tenancy] Tenant created', { tenantId, slug: input.slug, plan });

    const created = await getTenant(tenantId);
    if (!created) {
      throw new Error('Tenant was inserted but could not be retrieved');
    }
    return created;
  } catch (err) {
    logger.error('[DOS Tenancy] Failed to create tenant', { slug: input.slug, error: toErrorMessage(err) });
    throw err;
  }
}

/**
 * Update mutable fields on an existing tenant record.
 * Only updates fields that are explicitly provided; ignores undefined values.
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<Pick<TenantRecord, 'name' | 'slug' | 'plan' | 'domain' | 'logo_url' | 'config' | 'metadata'>>,
): Promise<TenantRecord | null> {
  const setClauses: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${idx}`);
    params.push(updates.name);
    idx++;
  }
  if (updates.slug !== undefined) {
    // Check slug uniqueness if changing
    const existing = await safeQuery(
      `SELECT tenant_id FROM dos.tenants WHERE slug = $1 AND tenant_id != $2 AND status != 'deleted'`,
      [updates.slug, tenantId],
    );
    if (existing.rows.length > 0) {
      throw new Error(`Tenant slug '${updates.slug}' is already in use`);
    }
    setClauses.push(`slug = $${idx}`);
    params.push(updates.slug);
    idx++;
  }
  if (updates.plan !== undefined) {
    setClauses.push(`plan = $${idx}`);
    params.push(updates.plan);
    idx++;
  }
  if (updates.domain !== undefined) {
    setClauses.push(`domain = $${idx}`);
    params.push(updates.domain);
    idx++;
  }
  if (updates.logo_url !== undefined) {
    setClauses.push(`logo_url = $${idx}`);
    params.push(updates.logo_url);
    idx++;
  }
  if (updates.config !== undefined) {
    setClauses.push(`config = $${idx}`);
    params.push(JSON.stringify(updates.config));
    idx++;
  }
  if (updates.metadata !== undefined) {
    setClauses.push(`metadata = $${idx}`);
    params.push(JSON.stringify(updates.metadata));
    idx++;
  }

  if (setClauses.length === 0) {
    return getTenant(tenantId);
  }

  setClauses.push('updated_at = NOW()');
  params.push(tenantId);

  try {
    const result = await safeQuery(
      `UPDATE dos.tenants SET ${setClauses.join(', ')} WHERE tenant_id = $${idx} AND status != 'deleted'`,
      params,
    );

    if ((result.rowCount || 0) === 0) {
      logger.warn('[DOS Tenancy] Tenant not found or already deleted for update', { tenantId });
      return null;
    }

    logger.info('[DOS Tenancy] Tenant updated', { tenantId, fields: Object.keys(updates) });
    return getTenant(tenantId);
  } catch (err) {
    logger.error('[DOS Tenancy] Failed to update tenant', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

/**
 * Soft-delete a tenant by setting status to 'deleted' and recording deleted_at.
 * Does not remove data — the tenant schema and records remain for audit.
 */
export async function deleteTenant(tenantId: string): Promise<{ deleted: boolean }> {
  try {
    const result = await safeQuery(
      `UPDATE dos.tenants
       SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND status != 'deleted'`,
      [tenantId],
    );

    const deleted = (result.rowCount || 0) > 0;
    if (deleted) {
      logger.info('[DOS Tenancy] Tenant soft-deleted', { tenantId });
    } else {
      logger.warn('[DOS Tenancy] Tenant not found or already deleted', { tenantId });
    }
    return { deleted };
  } catch (err) {
    logger.error('[DOS Tenancy] Failed to delete tenant', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

/**
 * Paginated tenant listing with optional status, plan, and search filters.
 * Returns { data, total } for client-side pagination controls.
 */
export async function listTenants(
  filters: TenantFilters = {},
): Promise<{ data: TenantRecord[]; total: number }> {
  const conditions: string[] = ["status != 'deleted'"];
  const params: any[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx}`);
    params.push(filters.status);
    idx++;
  }
  if (filters.plan) {
    conditions.push(`plan = $${idx}`);
    params.push(filters.plan);
    idx++;
  }
  if (filters.searchTerm) {
    conditions.push(`(name ILIKE $${idx} OR slug ILIKE $${idx})`);
    params.push(`%${filters.searchTerm}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters.limit || 50, 500);
  const offset = filters.offset || 0;

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.tenants ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT tenant_id, name, slug, status, plan, domain, logo_url, config,
              owner_user_id, created_at, updated_at, deleted_at, activated_at, metadata
       FROM dos.tenants ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as TenantRecord[], total };
  } catch (err) {
    logger.error('[DOS Tenancy] Failed to list tenants', { error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

/**
 * Look up a tenant by its URL slug.
 * Returns null if no matching non-deleted tenant is found.
 */
export async function getTenantBySlug(slug: string): Promise<TenantRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT tenant_id, name, slug, status, plan, domain, logo_url, config,
              owner_user_id, created_at, updated_at, deleted_at, activated_at, metadata
       FROM dos.tenants
       WHERE slug = $1 AND status != 'deleted'`,
      [slug],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as TenantRecord;
  } catch (err) {
    logger.error('[DOS Tenancy] Failed to fetch tenant by slug', { slug, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Validate that a user belongs to the specified tenant.
 * Checks the tenant_memberships table for an active membership row.
 * Returns true if the user has access, false otherwise.
 */
export async function validateTenantAccess(
  tenantId: string,
  userId: string,
): Promise<boolean> {
  try {
    // First verify the tenant exists and is not deleted
    const tenant = await getTenant(tenantId);
    if (!tenant || tenant.status === 'deleted') {
      logger.warn('[DOS Tenancy] Tenant access denied — tenant not found or deleted', { tenantId, userId });
      return false;
    }

    // Owner always has access
    if (tenant.owner_user_id === userId) {
      return true;
    }

    // Check membership table for active membership
    const result = await safeQuery(
      `SELECT membership_id FROM dos.tenant_memberships
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'
       LIMIT 1`,
      [tenantId, userId],
    );

    const hasAccess = result.rows.length > 0;
    if (!hasAccess) {
      logger.warn('[DOS Tenancy] Tenant access denied — no active membership', { tenantId, userId });
    }
    return hasAccess;
  } catch (err) {
    // Law 11: deny by default when access cannot be resolved
    logger.error('[DOS Tenancy] Tenant access check failed, denying by default (Law 11)', {
      tenantId, userId, error: toErrorMessage(err),
    });
    return false;
  }
}

// ── Namespace Export ──

export const TenantService = {
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  listTenants,
  getTenantBySlug,
  validateTenantAccess,
};
