/**
 * Activity Cleanup Utilities
 *
 * Handles expiring snoozes, counting unread activities, and
 * other periodic maintenance tasks for the activity feed.
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ─── Snooze Expiry ───────────────────────────────────────────

/**
 * Get all activity entries with expired snooze times.
 * These should be re-surfaced in the feed.
 */
export async function getExpiredSnoozedActivities(
  tenantId: string
): Promise<any[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
              is_read, archived, snoozed_until, created_at
       FROM "${schema}".activity_feed
       WHERE snoozed_until IS NOT NULL
         AND snoozed_until <= NOW()
         AND archived = false
       ORDER BY snoozed_until ASC`,
      []
    );
    return result.rows;
  } catch (err) {
    logger.error(`[ActivityCleanup] Failed to get expired snoozed activities for tenant=${tenantId}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Clear all expired snoozes by setting snoozed_until to NULL.
 * Returns the number of entries un-snoozed.
 */
export async function clearExpiredSnoozes(
  tenantId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `UPDATE "${schema}".activity_feed
       SET snoozed_until = NULL
       WHERE snoozed_until IS NOT NULL
         AND snoozed_until <= NOW()
       RETURNING id`,
      []
    );
    const count = result.rowCount ?? 0;
    if (count > 0) {
      logger.info(`[ActivityCleanup] Cleared ${count} expired snoozes for tenant=${tenantId}`);
    }
    return count;
  } catch (err) {
    logger.error(`[ActivityCleanup] Failed to clear expired snoozes for tenant=${tenantId}: ${(err as Error).message}`);
    return 0;
  }
}

// ─── Unread Counts ───────────────────────────────────────────

/**
 * Get the count of unread, non-archived, non-snoozed activities for a user.
 */
export async function getUnreadActivityCount(
  tenantId: string,
  userId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${schema}".activity_feed
       WHERE user_id = $1
         AND is_read = false
         AND archived = false
         AND (snoozed_until IS NULL OR snoozed_until <= NOW())`,
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0].count : 0;
  } catch (err) {
    logger.error(`[ActivityCleanup] Failed to get unread count for user=${userId}: ${(err as Error).message}`);
    return 0;
  }
}
