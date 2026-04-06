// @ts-nocheck
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';
/**
 * Platform Activation: feature flag management and full platform activation flow.
 * Seeds constitution, automation rules, feature flags, and operation config.
 */
import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database/database';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { toErrorMessage } from '../../../../errors/http-error.util';
import type { PlatformMode } from './platform-mode.types';
import { setTenantPlatformMode } from './mode-transition.service';
import { swallowDefault, EC , catchHandler } from '../../../../platform/dos/resilience/resilient-catch';

export async function getFeatureFlags(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT feature_key, enabled, updated_at
     FROM "${schema}".feature_flags WHERE deleted_at IS NULL ORDER BY feature_key`
  );
  return result.rows;
}

export async function setFeatureFlag(tenantId: string, featureKey: string, enabled: boolean, updatedBy?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".feature_flags (feature_key, enabled, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (feature_key) DO UPDATE SET enabled = $2, updated_by = $3, updated_at = NOW()
     RETURNING *`,
    [featureKey, enabled, updatedBy || SYSTEM_JOB_ACTOR]
  );
  return getFirstRow(result);
}

export async function activatePlatform(tenantId: string, targetMode: PlatformMode, activatedBy: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const steps: string[] = [];

  // 1. Seed constitution if not exists
  try {
    const { seedDefaultConstitution } = await import('../../../governance/services/governance/governance-constitution.service');
    await seedDefaultConstitution(tenantId, { riskAppetite: 'moderate' });
    steps.push('constitution_seeded');
  } catch { steps.push('constitution_already_exists'); }

  // 2. Seed automation rules
  try {
    const { seedDefaultAutomationRules } = await import('../../../../platform/dos/events/event-bus');
    await seedDefaultAutomationRules(tenantId);
    steps.push('automation_rules_seeded');
  } catch { steps.push('automation_rules_skipped'); }

  // 3. Enable core feature flags
  const coreFlags = [
    'control_monitoring', 'kri_breach_detection', 'policy_review_alerts',
    'remediation_overdue', 'evidence_automation', 'vendor_risk_scoring',
    'maturity_assessment', 'ai_copilot', 'advanced_analytics',
    'agrc_engine_enabled', 'agrc_control_monitor_enabled', 'agrc_kri_monitor_enabled',
    'agrc_policy_review_enabled', 'agrc_auto_task_creation_enabled',
    'agrc_auto_notification_enabled',
  ];
  for (const flag of coreFlags) {
    await setFeatureFlag(tenantId, flag, true, activatedBy).catch(catchHandler(EC.EVENT_BUS, {}));
  }
  steps.push('feature_flags_enabled');

  // 4. Set platform mode
  await setTenantPlatformMode(tenantId, targetMode, activatedBy);
  steps.push(`mode_set_to_${targetMode}`);

  // 4.5. Auto-assign personal agents when mode is hyper/autonomous
  if (targetMode === 'hybrid' || targetMode === 'shadow_agent' || targetMode === 'full_autonomous') {
    try {
      const { autoAssignAgentsForTenantMode } = await import('../../../ai/services/personal/personal-agent.service');
      const assignedCount = await autoAssignAgentsForTenantMode(tenantId, targetMode, activatedBy);
      steps.push(`agents_auto_assigned_${assignedCount}`);
    } catch (err: unknown) {
      logger.error(`[PlatformMode] Failed to auto-assign agents: ${toErrorMessage(err)}`);
      steps.push('agents_auto_assignment_failed');
    }
  }

  // 5. Seed platform operation config
  await safeQuery(
    `INSERT INTO "${schema}".platform_operation_config (config_key, config_value, owner_module, owner_type)
     VALUES ('default_operation_mode', $1::jsonb, 'platform', 'platform')
     ON CONFLICT (config_key, owner_module) DO UPDATE SET config_value = $1::jsonb, updated_at = NOW()`,
    [JSON.stringify(targetMode)]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
  await safeQuery(
    `INSERT INTO "${schema}".platform_operation_config (config_key, config_value, owner_module, owner_type)
     VALUES ('mode_audit_enabled', 'true'::jsonb, 'platform', 'platform')
     ON CONFLICT (config_key, owner_module) DO UPDATE SET config_value = 'true'::jsonb, updated_at = NOW()`,
  ).catch(catchHandler(EC.EVENT_BUS, {}));
  steps.push('operation_config_seeded');

  return {
    activated: true,
    mode: targetMode,
    steps,
    activatedAt: new Date().toISOString(),
    activatedBy,
  };
}

/**
 * Feature 19: Check if autonomy progression is recommended for a tenant.
 * Returns the latest recommendation from autonomy_progression_log.
 */
export async function getAutonomyProgressionRecommendation(
  tenantId: string,
): Promise<{ recommendationId: string; currentMode: string; recommendedMode: string; reason: string; passedThresholds: boolean; consecutivePassCycles: number } | null> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT recommendation_id, current_mode, passed_thresholds, consecutive_pass_cycles
     FROM "${schema}".autonomy_progression_log
     WHERE tenant_id = $1
     ORDER BY review_cycle DESC
     LIMIT 1`,
    [tenantId],
  ), { tenantId: tenantId, operation: 'query autonomy_progression_log' });

  if (result.rows.length === 0) {
    return null;
  }

  const row = getFirstRow(result);
  const __currentMode = row.current_mode as PlatformMode;

  // Re-compute recommended mode based on stored metrics
  // (This is a simplified version; full logic is in autonomy-review.service.ts)
  const { reviewTenantAutonomy } = await import('../autonomy/autonomy-review.service');
  const recommendation = await reviewTenantAutonomy(tenantId);

  if (!recommendation) {
    return null;
  }

  return {
    recommendationId: recommendation.recommendationId,
    currentMode: recommendation.currentMode,
    recommendedMode: recommendation.recommendedMode,
    reason: recommendation.reason,
    passedThresholds: recommendation.passedThresholds,
    consecutivePassCycles: recommendation.consecutivePassCycles,
  };
}
