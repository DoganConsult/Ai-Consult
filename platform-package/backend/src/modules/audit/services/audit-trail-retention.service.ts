import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/logger.service';

const DEFAULT_RETENTION_DAYS = 365;

/**
 * Archive audit trail entries older than the specified retention period.
 * Uses INSERT...SELECT to copy rows into audit_trail_archive, then deletes
 * the originals from audit_trail. Both operations use the same cutoff to
 * ensure consistency.
 */
export async function archiveOldAuditEntries(
  tenantId: string,
  retentionDays?: number,
): Promise<{ archived: number }> {
  const schema = tenantSchema(tenantId);
  const days = retentionDays ?? DEFAULT_RETENTION_DAYS;

  try {
    // Step 1: Copy old entries to archive table
    const insertResult = await safeQuery(
      `INSERT INTO ${schema}.audit_trail_archive
         (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at, archived_at)
       SELECT
         id, actor_id, action, entity_type, entity_id, details, ip_address, created_at, NOW()
       FROM ${schema}.audit_trail
       WHERE created_at < NOW() - INTERVAL '1 day' * $1
       ON CONFLICT (id) DO NOTHING`,
      [days],
    );

    const archivedCount = insertResult.rowCount ?? 0;

    // Step 2: Delete archived entries from the source table
    if (archivedCount > 0) {
      await safeQuery(
        `DELETE FROM ${schema}.audit_trail
         WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
        [days],
      );
    }

    logger.info(
      `[audit-trail-retention] tenant=${tenantId} archived=${archivedCount} retentionDays=${days}`,
    );
    return { archived: archivedCount };
  } catch (err) {
    logger.error(
      `[audit-trail-retention] Failed to archive entries for tenant=${tenantId}`,
      err,
    );
    throw err;
  }
}
