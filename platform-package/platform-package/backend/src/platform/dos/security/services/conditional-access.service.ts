// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';
import { getSecurityConfigTyped } from '../../../../modules/platform/services/security/security-config-registry.service';

export interface ConditionalGrant {
  id: string;
  userId: string;
  grantType: 'time_bound' | 'condition' | 'emergency' | 'project' | 'one_time';
  permissionCodes: string[];
  roleCodes: string[];
  moduleCodes: string[];
  validFrom: string;
  validTo: string | null;
  maxUses: number | null;
  currentUses: number;
  reason: string;
  isActive: boolean;
  createdAt: string;
}

export interface ConditionalGrantInput {
  userId: string;
  grantType: ConditionalGrant['grantType'];
  permissionCodes?: string[];
  roleCodes?: string[];
  moduleCodes?: string[];
  validFrom?: string;
  validTo?: string;
  maxUses?: number;
  reason: string;
  approvedBy: string;
}

export async function createConditionalGrant(tenantId: string, input: ConditionalGrantInput): Promise<ConditionalGrant> {
  const enabled = await getSecurityConfigTyped(tenantId, 'time_bound_access_enabled', true);
  if (!enabled) throw new Error('Conditional access grants are disabled');

  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".conditional_access_grants
     (user_id, grant_type, permission_codes, role_codes, module_codes,
      valid_from, valid_to, max_uses, reason, approved_by, approved_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()), $7::timestamptz, $8, $9, $10, NOW())
     RETURNING *`,
    [
      input.userId, input.grantType, input.permissionCodes || [],
      input.roleCodes || [], input.moduleCodes || [],
      input.validFrom || null, input.validTo || null,
      input.maxUses || null, input.reason, input.approvedBy,
    ],
  );

  await safeQuery(
    `INSERT INTO "${schema}".security_events
     (event_type, severity, actor_user_id, target_user_id, details)
     VALUES ('conditional_grant', $1, $2, $3, $4)`,
    [
      input.grantType === 'emergency' ? 'high' : 'medium',
      input.approvedBy, input.userId,
      JSON.stringify({ grantType: input.grantType, permissionCodes: input.permissionCodes, reason: input.reason }),
    ],
  );

  return mapGrant(rows[0]);
}

export async function revokeConditionalGrant(tenantId: string, grantId: string, revokedBy: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".conditional_access_grants
     SET is_active = false, revoked_by = $1, revoked_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [revokedBy, grantId],
  );
}

export async function getActiveGrantsForUser(tenantId: string, userId: string): Promise<ConditionalGrant[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".conditional_access_grants
     WHERE user_id = $1 AND is_active = true
       AND valid_from <= NOW() AND (valid_to IS NULL OR valid_to > NOW())
       AND (max_uses IS NULL OR current_uses < max_uses)
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(mapGrant);
}

export async function resolveConditionalPermissions(tenantId: string, userId: string): Promise<string[]> {
  const grants = await getActiveGrantsForUser(tenantId, userId);
  const permissions = new Set<string>();
  for (const g of grants) {
    for (const p of g.permissionCodes) permissions.add(p);
  }
  return Array.from(permissions);
}

export async function recordGrantUsage(tenantId: string, grantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".conditional_access_grants
     SET current_uses = current_uses + 1, updated_at = NOW()
     WHERE id = $1`,
    [grantId],
  );
}

export async function expireStaleGrants(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const { rowCount } = await safeQuery(
    `UPDATE "${schema}".conditional_access_grants
     SET is_active = false, updated_at = NOW()
     WHERE is_active = true AND (
       (valid_to IS NOT NULL AND valid_to < NOW()) OR
       (max_uses IS NOT NULL AND current_uses >= max_uses)
     )`,
  );
  return rowCount || 0;
}

function mapGrant(r: GenericRow): ConditionalGrant {
  return {
    id: r.id,
    userId: r.user_id,
    grantType: r.grant_type,
    permissionCodes: r.permission_codes || [],
    roleCodes: r.role_codes || [],
    moduleCodes: r.module_codes || [],
    validFrom: r.valid_from,
    validTo: r.valid_to,
    maxUses: r.max_uses,
    currentUses: r.current_uses,
    reason: r.reason,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}
