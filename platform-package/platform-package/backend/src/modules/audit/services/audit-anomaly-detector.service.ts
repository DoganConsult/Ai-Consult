import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/logger.service';

export interface AuditAnomaly {
  type: string;
  description: string;
  severity: string;
  entityType: string;
  entityId: string;
  detectedAt: string;
}

// Thresholds for anomaly detection
const BULK_DELETE_THRESHOLD = 20;
const FAILED_AUTH_SPIKE_THRESHOLD = 10;
const OFF_HOURS_START = 0; // midnight
const OFF_HOURS_END = 5;   // 5 AM

/**
 * Detect anomalies in the audit trail from the last 24 hours.
 * Checks for:
 *   - Bulk deletions by a single actor
 *   - Off-hours access patterns
 *   - Permission escalation events
 *   - Failed authentication spikes by a single actor
 */
export async function detectAnomalies(tenantId: string): Promise<AuditAnomaly[]> {
  const schema = tenantSchema(tenantId);
  const anomalies: AuditAnomaly[] = [];
  const now = new Date().toISOString();

  try {
    // 1. Bulk deletions — actors who deleted more than threshold in 24h
    const bulkDeletes = await safeQuery(
      `SELECT actor_id, entity_type, COUNT(*) AS delete_count
       FROM ${schema}.audit_trail
       WHERE action = 'delete'
         AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY actor_id, entity_type
       HAVING COUNT(*) >= $1`,
      [BULK_DELETE_THRESHOLD],
    );
    for (const row of bulkDeletes.rows) {
      anomalies.push({
        type: 'bulk_deletion',
        description: `Actor ${row.actor_id} deleted ${row.delete_count} ${row.entity_type} records in the last 24 hours`,
        severity: 'high',
        entityType: row.entity_type,
        entityId: row.actor_id,
        detectedAt: now,
      });
    }

    // 2. Off-hours access — actions performed during unusual hours
    const offHours = await safeQuery(
      `SELECT actor_id, COUNT(*) AS action_count,
              MIN(created_at) AS first_action, MAX(created_at) AS last_action
       FROM ${schema}.audit_trail
       WHERE created_at > NOW() - INTERVAL '24 hours'
         AND EXTRACT(HOUR FROM created_at) >= $1
         AND EXTRACT(HOUR FROM created_at) < $2
       GROUP BY actor_id
       HAVING COUNT(*) > 5`,
      [OFF_HOURS_START, OFF_HOURS_END],
    );
    for (const row of offHours.rows) {
      anomalies.push({
        type: 'off_hours_access',
        description: `Actor ${row.actor_id} performed ${row.action_count} actions between ${OFF_HOURS_START}:00 and ${OFF_HOURS_END}:00`,
        severity: 'medium',
        entityType: 'actor',
        entityId: row.actor_id,
        detectedAt: now,
      });
    }

    // 3. Permission escalation — role/permission changes
    const escalations = await safeQuery(
      `SELECT actor_id, entity_type, entity_id, details
       FROM ${schema}.audit_trail
       WHERE action IN ('permission_grant', 'role_assign', 'privilege_escalation', 'role_change')
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC`,
    );
    for (const row of escalations.rows) {
      anomalies.push({
        type: 'permission_escalation',
        description: `Actor ${row.actor_id} performed permission/role change on ${row.entity_type} ${row.entity_id}`,
        severity: 'high',
        entityType: row.entity_type,
        entityId: row.entity_id,
        detectedAt: now,
      });
    }

    // 4. Failed auth spikes — many failed login attempts from a single actor
    const failedAuth = await safeQuery(
      `SELECT actor_id, COUNT(*) AS fail_count
       FROM ${schema}.audit_trail
       WHERE action IN ('login_failed', 'auth_failed', 'authentication_failure')
         AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY actor_id
       HAVING COUNT(*) >= $1`,
      [FAILED_AUTH_SPIKE_THRESHOLD],
    );
    for (const row of failedAuth.rows) {
      anomalies.push({
        type: 'failed_auth_spike',
        description: `Actor ${row.actor_id} had ${row.fail_count} failed authentication attempts in the last 24 hours`,
        severity: 'critical',
        entityType: 'actor',
        entityId: row.actor_id,
        detectedAt: now,
      });
    }

    logger.info(
      `[audit-anomaly-detector] tenant=${tenantId} anomaliesDetected=${anomalies.length}`,
    );
    return anomalies;
  } catch (err) {
    logger.error(
      `[audit-anomaly-detector] Failed to detect anomalies for tenant=${tenantId}`,
      err,
    );
    throw err;
  }
}

/**
 * Persist detected anomalies to the audit_anomalies table.
 */
export async function persistAnomalies(
  tenantId: string,
  anomalies: AuditAnomaly[],
): Promise<number> {
  if (anomalies.length === 0) return 0;

  const schema = tenantSchema(tenantId);

  try {
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const anomaly of anomalies) {
      const id = uuid();
      placeholders.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`,
      );
      values.push(
        id,
        anomaly.type,
        anomaly.description,
        anomaly.severity,
        anomaly.entityType,
        anomaly.entityId,
        anomaly.detectedAt,
      );
    }

    await safeQuery(
      `INSERT INTO ${schema}.audit_anomalies
         (id, type, description, severity, entity_type, entity_id, detected_at)
       VALUES ${placeholders.join(', ')}`,
      values,
    );

    logger.info(
      `[audit-anomaly-detector] tenant=${tenantId} persisted=${anomalies.length} anomalies`,
    );
    return anomalies.length;
  } catch (err) {
    logger.error(
      `[audit-anomaly-detector] Failed to persist anomalies for tenant=${tenantId}`,
      err,
    );
    throw err;
  }
}

/**
 * Notify tenant admin users about detected anomalies by creating
 * activity notifications for each admin.
 */
export async function notifyAdminsOfAnomalies(
  tenantId: string,
  anomalies: AuditAnomaly[],
): Promise<void> {
  if (anomalies.length === 0) return;

  const schema = tenantSchema(tenantId);

  try {
    // Fetch admin user IDs for this tenant
    const admins = await safeQuery(
      `SELECT DISTINCT u.id
       FROM ${schema}.users u
       JOIN ${schema}.user_roles ur ON ur.user_id = u.id
       JOIN ${schema}.roles r ON r.id = ur.role_id
       WHERE r.code IN ('tenant_admin', 'platform_admin', 'security_admin')
         AND u.status = 'active'`,
    );

    if (admins.rows.length === 0) {
      logger.warn(
        `[audit-anomaly-detector] tenant=${tenantId} no admins found for anomaly notification`,
      );
      return;
    }

    // Build summary message
    const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
    const highCount = anomalies.filter((a) => a.severity === 'high').length;
    const summary = `Audit anomaly alert: ${anomalies.length} anomalies detected (${criticalCount} critical, ${highCount} high). Review the audit anomalies dashboard.`;

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const admin of admins.rows) {
      const notifId = uuid();
      placeholders.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, NOW())`,
      );
      values.push(notifId, admin.id, 'audit_anomaly_alert', summary, 'unread');
    }

    await safeQuery(
      `INSERT INTO ${schema}.activity_notifications
         (id, user_id, notification_type, message, status, created_at)
       VALUES ${placeholders.join(', ')}`,
      values,
    );

    logger.info(
      `[audit-anomaly-detector] tenant=${tenantId} notified=${admins.rows.length} admins about ${anomalies.length} anomalies`,
    );
  } catch (err) {
    logger.error(
      `[audit-anomaly-detector] Failed to notify admins for tenant=${tenantId}`,
      err,
    );
    throw err;
  }
}
