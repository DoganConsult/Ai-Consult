/**
 * Activity State Management Service
 *
 * Handles read/unread state, archiving, and snoozing of activity feed entries.
 * All data stored in tenant-scoped `activity_feed` table.
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from './logger.service';

// ─── Read State ──────────────────────────────────────────────

/**
 * Mark a single activity feed entry as read.
 */
export async function markAsRead(
  tenantId: string,
  activityId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_feed
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [activityId, userId]
    );
  } catch (err) {
    logger.error(`[ActivityState] Failed to mark activity as read: activityId=${activityId}, error=${(err as Error).message}`);
  }
}

/**
 * Mark all unread activities as read for a specific user.
 * Returns the number of activities marked as read.
 */
export async function markAllAsReadForUser(
  tenantId: string,
  userId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `UPDATE "${schema}".activity_feed
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false
       RETURNING id`,
      [userId]
    );
    return result.rowCount ?? 0;
  } catch (err) {
    logger.error(`[ActivityState] Failed to mark all as read for user=${userId}: ${(err as Error).message}`);
    return 0;
  }
}

// ─── Archive State ───────────────────────────────────────────

/**
 * Archive an activity feed entry (hide from default feed view).
 */
export async function archiveActivity(
  tenantId: string,
  activityId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_feed
       SET archived = true, archived_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [activityId, userId]
    );
  } catch (err) {
    logger.error(`[ActivityState] Failed to archive activity: activityId=${activityId}, error=${(err as Error).message}`);
  }
}

/**
 * Unarchive an activity feed entry (restore to default feed view).
 */
export async function unarchiveActivity(
  tenantId: string,
  activityId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_feed
       SET archived = false, archived_at = NULL
       WHERE id = $1 AND user_id = $2`,
      [activityId, userId]
    );
  } catch (err) {
    logger.error(`[ActivityState] Failed to unarchive activity: activityId=${activityId}, error=${(err as Error).message}`);
  }
}

// ─── Snooze State ────────────────────────────────────────────

/**
 * Snooze an activity until a specified date/time.
 * Snoozed activities are hidden from the default feed until the snooze expires.
 */
export async function snoozeActivity(
  tenantId: string,
  activityId: string,
  userId: string,
  snoozedUntil: Date
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_feed
       SET snoozed_until = $3
       WHERE id = $1 AND user_id = $2`,
      [activityId, userId, snoozedUntil.toISOString()]
    );
  } catch (err) {
    logger.error(`[ActivityState] Failed to snooze activity: activityId=${activityId}, error=${(err as Error).message}`);
  }
}

/**
 * Remove snooze from an activity, making it visible again immediately.
 */
export async function unsnoozeActivity(
  tenantId: string,
  activityId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_feed
       SET snoozed_until = NULL
       WHERE id = $1 AND user_id = $2`,
      [activityId, userId]
    );
  } catch (err) {
    logger.error(`[ActivityState] Failed to unsnooze activity: activityId=${activityId}, error=${(err as Error).message}`);
  }
}

// ─── Lookup ──────────────────────────────────────────────────

/**
 * Get a single activity feed entry by ID.
 */
export async function getActivityById(
  tenantId: string,
  activityId: string
): Promise<any | null> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
              is_read, read_at, archived, archived_at, snoozed_until, created_at
       FROM "${schema}".activity_feed
       WHERE id = $1`,
      [activityId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    logger.error(`[ActivityState] Failed to get activity by id: activityId=${activityId}, error=${(err as Error).message}`);
    return null;
  }
}
