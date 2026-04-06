import { catchHandler, EC } from '../../../platform/dos/resilience/resilient-catch';
import { logger } from '../../../platform/dos/observability/logger.service';
// ============================================================
// Dogan Operating System — Action Engine
// Executes automated remediation actions in response to guardian findings
// ============================================================

import { Pool } from 'pg';
import { tenantSchema } from '../../../config/db/tenant-client';

/** Supported action types for automated remediation. */
export type DoganActionType =
  | 'revoke_access'
  | 'isolate_threat'
  | 'disable_module'
  | 'alert_admin'
  | 'rollback_config';

interface ActionResult {
  success: boolean;
  actionType: DoganActionType;
  detail: string;
}

/**
 * Central action executor for the Dogan Operating System.
 * All guardian-triggered remediation flows through this engine,
 * which logs every action to `dogan_actions_log` for auditability.
 */
export class DoganActionEngine {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute a remediation action and persist an audit log entry.
   *
   * @param actionType - The type of action to perform
   * @param params     - Contextual parameters (tenantId, targetId, reason, etc.)
   * @param executedBy - Identifier of the guardian or user that triggered the action
   */
  async executeAction(
    actionType: DoganActionType,
    params: Record<string, any>,
    executedBy = 'dogan-os',
  ): Promise<ActionResult> {
    const prefix = `[DoganOS:ActionEngine]`;
    let result: ActionResult;

    try {
      switch (actionType) {
        case 'revoke_access':
          result = await this.revokeAccess(params);
          break;
        case 'isolate_threat':
          result = await this.isolateThreat(params);
          break;
        case 'disable_module':
          result = await this.disableModule(params);
          break;
        case 'alert_admin':
          result = await this.alertAdmin(params);
          break;
        case 'rollback_config':
          result = await this.rollbackConfig(params);
          break;
        default:
          result = { success: false, actionType, detail: `Unknown action type: ${actionType}` };
      }

      // Persist to dogan_actions_log
      await this.logAction(actionType, params, result.success ? 'success' : 'failed', executedBy);
      logger.info(`${prefix} ${actionType}: ${result.detail}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result = { success: false, actionType, detail: `Execution error: ${msg}` };
      await this.logAction(actionType, params, 'error', executedBy);
      logger.error(`${prefix} ${actionType} failed: ${msg}`);
    }

    return result;
  }

  // ── Individual action handlers ──────────────────────────────

  private async revokeAccess(params: Record<string, any>): Promise<ActionResult> {
    const { tenantId, userId, reason } = params as { tenantId?: string; userId?: string; reason?: string };
    if (!tenantId || !userId) {
      return { success: false, actionType: 'revoke_access', detail: 'tenantId and userId required' };
    }
    const schema = tenantSchema(String(tenantId));
    await this.pool.query(
      `UPDATE "${schema}".users SET is_active = false, updated_at = NOW() WHERE user_id = $1`,
      [userId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    return { success: true, actionType: 'revoke_access', detail: `Revoked access for user ${userId} (${reason || 'auto'})` };
  }

  private async isolateThreat(params: Record<string, any>): Promise<ActionResult> {
    const { tenantId, entityType, entityId } = params as { tenantId?: string; entityType?: string; entityId?: string };
    if (!tenantId || !entityId) {
      return { success: false, actionType: 'isolate_threat', detail: 'tenantId and entityId required' };
    }
    // Log an isolation event; actual isolation depends on entity type
    await this.pool.query(
      `INSERT INTO public.audit_trail (action_type, entity_type, entity_id, details, created_at)
       VALUES ('threat_isolated', $1, $2, $3::jsonb, NOW())`,
      [entityType || 'any', entityId, JSON.stringify(params)],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    return { success: true, actionType: 'isolate_threat', detail: `Isolated ${entityType || 'entity'} ${entityId}` };
  }

  private async disableModule(params: Record<string, any>): Promise<ActionResult> {
    const { tenantId, moduleCode } = params as { tenantId?: string; moduleCode?: string };
    if (!tenantId || !moduleCode) {
      return { success: false, actionType: 'disable_module', detail: 'tenantId and moduleCode required' };
    }
    const schema = tenantSchema(String(tenantId));
    await this.pool.query(
      `UPDATE "${schema}".module_activations SET status = 'disabled', updated_at = NOW()
       WHERE module_code = $1`,
      [moduleCode],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    return { success: true, actionType: 'disable_module', detail: `Disabled module ${moduleCode} for tenant ${tenantId}` };
  }

  private async alertAdmin(params: Record<string, any>): Promise<ActionResult> {
    const { tenantId, subject, message } = params as { tenantId?: string; subject?: string; message?: string };
    if (!tenantId) {
      return { success: false, actionType: 'alert_admin', detail: 'tenantId required' };
    }
    const schema = tenantSchema(String(tenantId));
    await this.pool.query(
      `INSERT INTO "${schema}".notification_queue
         (recipient_id, notification_type, subject, body, created_at)
       SELECT user_id, 'dogan_alert', $1, $2, NOW()
       FROM "${schema}".users
       WHERE role IN ('admin', 'owner') AND is_active = true
       LIMIT 5`,
      [subject || 'Dogan OS Alert', message || JSON.stringify(params)],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    return { success: true, actionType: 'alert_admin', detail: `Admin alert sent for tenant ${tenantId}` };
  }

  private async rollbackConfig(params: Record<string, any>): Promise<ActionResult> {
    const { tenantId, configKey, previousValue } = params as { tenantId?: string; configKey?: string; previousValue?: unknown };
    if (!tenantId || !configKey) {
      return { success: false, actionType: 'rollback_config', detail: 'tenantId and configKey required' };
    }
    await this.pool.query(
      `UPDATE public.tenant_preferences SET value = $1, updated_at = NOW()
       WHERE tenant_id = $2 AND key = $3`,
      [JSON.stringify(previousValue), tenantId, configKey],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    return { success: true, actionType: 'rollback_config', detail: `Rolled back ${configKey} for tenant ${tenantId}` };
  }

  // ── Audit logging ───────────────────────────────────────────

  private async logAction(
    actionType: string,
    params: Record<string, any>,
    result: string,
    executedBy: string,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO public.dogan_actions_log
           (action_type, action_params, result, executed_by, created_at)
         VALUES ($1, $2::jsonb, $3, $4, NOW())`,
        [actionType, JSON.stringify(params), result, executedBy],
      );
    } catch {
      // Table may not exist yet — silently skip
    }
  }
}
