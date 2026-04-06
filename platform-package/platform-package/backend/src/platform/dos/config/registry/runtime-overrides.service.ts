// ============================================
// Runtime Overrides Service
// Admin override management — set, get, revoke
// temporary policy overrides with audit logging.
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logPolicyDecision } from '../../../../modules/packs/services/blueprint.service';

// -----------------------------------------------
// Types
// -----------------------------------------------

export type OverrideType =
  | 'module_activation'
  | 'workflow_profile'
  | 'sod_rule'
  | 'ai_policy'
  | 'sla_multiplier'
  | 'approval_depth'
  | 'delegation_scope';

export interface RuntimeOverride {
  id: number;
  override_type: OverrideType;
  target_key: string;
  override_value: Record<string, any>;
  reason: string;
  created_by: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

// -----------------------------------------------
// Set Override
// -----------------------------------------------

export async function setOverride(
  tenantId: string,
  type: OverrideType,
  targetKey: string,
  value: Record<string, any>,
  reason: string,
  createdBy: string,
  validUntil?: Date,
): Promise<RuntimeOverride> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".runtime_overrides
       (override_type, target_key, override_value, reason, created_by, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [type, targetKey, JSON.stringify(value), reason, createdBy, validUntil ?? null]
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'override_created',
    user_id: createdBy,
    input_context: { type, target_key: targetKey, value, valid_until: validUntil },
    decision: `Override set on ${type}:${targetKey}`,
    reason,
    policy_ref: 'runtime-overrides.service/setOverride',
  });

  return rows[0];
}

// -----------------------------------------------
// Get Active Overrides
// -----------------------------------------------

export async function getActiveOverrides(
  tenantId: string,
  type?: OverrideType,
): Promise<RuntimeOverride[]> {
  const schema = tenantSchema(tenantId);

  if (type) {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".runtime_overrides
       WHERE is_active = TRUE AND override_type = $1
         AND (valid_until IS NULL OR valid_until > NOW())
       ORDER BY created_at DESC`,
      [type]
    );
    return rows;
  }

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".runtime_overrides
     WHERE is_active = TRUE
       AND (valid_until IS NULL OR valid_until > NOW())
     ORDER BY created_at DESC`
  );
  return rows;
}

// -----------------------------------------------
// Get Override for Target
// -----------------------------------------------

export async function getOverrideForTarget(
  tenantId: string,
  type: OverrideType,
  targetKey: string,
): Promise<RuntimeOverride | null> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".runtime_overrides
     WHERE override_type = $1 AND target_key = $2
       AND is_active = TRUE
       AND (valid_until IS NULL OR valid_until > NOW())
     ORDER BY created_at DESC LIMIT 1`,
    [type, targetKey]
  );

  return rows[0] ?? null;
}

// -----------------------------------------------
// Revoke Override
// -----------------------------------------------

export async function revokeOverride(
  tenantId: string,
  overrideId: number,
  revokedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Get before revoking for audit
  const { rows: existing } = await safeQuery(
    `SELECT * FROM "${schema}".runtime_overrides WHERE id = $1`,
    [overrideId]
  );

  await safeQuery(
    `UPDATE "${schema}".runtime_overrides
     SET is_active = FALSE
     WHERE id = $1`,
    [overrideId]
  );

  if (existing.length > 0) {
    await logPolicyDecision(tenantId, {
      decision_type: 'override_revoked',
      user_id: revokedBy,
      input_context: {
        override_id: overrideId,
        type: existing[0].override_type,
        target_key: existing[0].target_key,
      },
      decision: `Override ${overrideId} revoked`,
      reason: `Revoked by ${revokedBy}`,
      policy_ref: 'runtime-overrides.service/revokeOverride',
    });
  }
}

// -----------------------------------------------
// Apply Overrides to Base Policy
// -----------------------------------------------

export async function applyOverrides<T extends Record<string, any>>(
  tenantId: string,
  type: OverrideType,
  targetKey: string,
  basePolicy: T,
): Promise<T> {
  const override = await getOverrideForTarget(tenantId, type, targetKey);
  if (!override) return basePolicy;

  // Merge override values into base policy
  return { ...basePolicy, ...override.override_value } as T;
}

// -----------------------------------------------
// Expire Stale Overrides (housekeeping)
// -----------------------------------------------

export async function expireStaleOverrides(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  const { rowCount } = await safeQuery(
    `UPDATE "${schema}".runtime_overrides
     SET is_active = FALSE
     WHERE is_active = TRUE AND valid_until IS NOT NULL AND valid_until <= NOW()`
  );

  return rowCount ?? 0;
}
