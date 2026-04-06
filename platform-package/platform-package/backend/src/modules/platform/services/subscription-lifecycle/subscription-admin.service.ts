// @ts-nocheck
/**
 * Subscription Admin Service
 *
 * Usage limit checks, admin overview dashboard, and super-admin
 * status/tier overrides.
 */

import { safeQuery } from '../../../../config/database/database';
import {
  Subscription,
} from '../subscription-lifecycle.types';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { TIER_LIMITS, getSubscription } from './subscription-helpers.service';
import { writeAuditLog } from './subscription-audit.service';
import type { GenericRow } from '../../../../types/db-rows.types';

// ─── Usage Limit Check ──────────────────────────────────────

export async function checkUsageLimits(tenantId: string): Promise<{
  allowed: boolean;
  violations: { resource: string; current: number; limit: number }[];
  hardBlocks: string[];
  warnings: string[];
  currentUsage: { users: number; frameworks: number };
  allowedLimits: { maxUsers: number; maxFrameworks: number };
}> {
  const sub = await getSubscription(tenantId);
  const tier = sub?.tier || 'starter';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.starter;

  let usersCount = 0;
  let frameworksCount = 0;
  try {
    const uRes = await safeQuery(`SELECT COUNT(*)::int AS count FROM public.users WHERE tenant_id = $1`, [tenantId]);
    usersCount = getFirstRow(uRes)?.count || 0;
  } catch { /* */ }
  try {
    const fRes = await safeQuery(`SELECT COUNT(*)::int AS count FROM public.tenant_frameworks WHERE tenant_id = $1`, [tenantId]);
    frameworksCount = getFirstRow(fRes)?.count || 0;
  } catch { /* */ }

  const violations: { resource: string; current: number; limit: number }[] = [];
  const hardBlocks: string[] = [];
  const warnings: string[] = [];

  if (limits.maxUsers !== -1 && usersCount >= limits.maxUsers) {
    violations.push({ resource: 'users', current: usersCount, limit: limits.maxUsers });
    hardBlocks.push(`User limit reached (${usersCount}/${limits.maxUsers})`);
  } else if (limits.maxUsers !== -1 && usersCount >= limits.maxUsers * 0.8) {
    warnings.push(`Approaching user limit (${usersCount}/${limits.maxUsers})`);
  }

  if (limits.maxFrameworks !== -1 && frameworksCount >= limits.maxFrameworks) {
    violations.push({ resource: 'frameworks', current: frameworksCount, limit: limits.maxFrameworks });
    hardBlocks.push(`Framework limit reached (${frameworksCount}/${limits.maxFrameworks})`);
  } else if (limits.maxFrameworks !== -1 && frameworksCount >= limits.maxFrameworks * 0.8) {
    warnings.push(`Approaching framework limit (${frameworksCount}/${limits.maxFrameworks})`);
  }

  return {
    allowed: violations.length === 0,
    violations,
    hardBlocks,
    warnings,
    currentUsage: { users: usersCount, frameworks: frameworksCount },
    allowedLimits: { maxUsers: limits.maxUsers, maxFrameworks: limits.maxFrameworks },
  };
}

// ─── Admin Subscription Overview ─────────────────────────────

export async function getAdminSubscriptionOverview(filters?: { status?: string; tier?: string }): Promise<{
  tenants: Record<string, unknown>[];
  counts: Record<string, number>;
}> {
  let whereClause = '';
  const params: string[] = [];
  if (filters?.status) {
    params.push(filters.status);
    whereClause += ` AND status = $${params.length}`;
  }
  if (filters?.tier) {
    params.push(filters.tier);
    whereClause += ` AND tier = $${params.length}`;
  }

  const result = await safeQuery(
    `SELECT tenant_id, tier, status, subscription_mode, renewal_mode, current_period_end,
            grace_ends_at, auto_renew, created_at
     FROM public.subscriptions
     WHERE 1=1 ${whereClause}
     ORDER BY created_at DESC`,
    params
  );

  const counts = {
    total: result.rows.length,
    active: result.rows.filter((r: GenericRow) => r.status === 'active').length,
    trialing: result.rows.filter((r: GenericRow) => r.status === 'trial_active' || r.status === 'trialing').length,
    past_due: result.rows.filter((r: GenericRow) => r.status === 'past_due').length,
    grace: result.rows.filter((r: GenericRow) => r.status === 'grace_period').length,
    expired: result.rows.filter((r: GenericRow) => r.status === 'expired').length,
    paused: result.rows.filter((r: GenericRow) => r.status === 'paused').length,
    cancelled: result.rows.filter((r: GenericRow) => r.status === 'cancelled').length,
  };

  return { tenants: result.rows, counts };
}

// ─── Override (Super Admin) ──────────────────────────────────

export async function overrideStatus(tenantId: string, newStatus: string, performedBy: string, reason?: string): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  const oldState = existing ? { status: existing.status } : null;
  const result = await safeQuery(
    `UPDATE public.subscriptions SET status = $2, last_status_reason = $3, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId, newStatus, reason || null]
  );
  if (!getFirstRow(result)) throw new Error(`No subscription found for tenant ${tenantId}`);
  await writeAuditLog(tenantId, 'override_applied', oldState, { status: newStatus }, performedBy, reason);
  return getFirstRow(result);
}

export async function overrideTier(tenantId: string, newTier: string, performedBy: string, reason?: string): Promise<Subscription> {
  const existing = await getSubscription(tenantId);
  const oldState = existing ? { tier: existing.tier } : null;
  const result = await safeQuery(
    `UPDATE public.subscriptions SET tier = $2, updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId, newTier]
  );
  if (!getFirstRow(result)) throw new Error(`No subscription found for tenant ${tenantId}`);
  await writeAuditLog(tenantId, 'override_applied', oldState, { tier: newTier }, performedBy, reason);
  return getFirstRow(result);
}
