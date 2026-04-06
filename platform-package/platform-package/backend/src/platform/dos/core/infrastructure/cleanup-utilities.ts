// @ts-nocheck
// Activity Feed - Cleanup Utilities
// Snooze expiry management and unread count queries

import { safeQuery, tenantSchema } from '../../../../config/database';
import { assertValidTenantId } from '../../../../modules/platform/services/tenant/tenant-isolation';
import {
  ActivityEntry,
  ActivityAction,
  EntityType,
} from '../../../../modules/platform/services/activity/activity-feed.types';
import type { GenericRow } from '../../../../types/db-rows.types';

/**
 * Get snoozed activities that have expired (snooze time has passed)
 * Validates: Requirement 2.5 - Activity snooze management
 *
 * Retrieves all activities whose snooze time has expired.
 * These activities should be made visible again in the feed.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @returns Array of activities with expired snooze times
 */
export async function getExpiredSnoozedActivities(
  tenantId: string
): Promise<ActivityEntry[]> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
      activity_id, user_id, user_name, action, module,
      entity_type, entity_id, entity_title, metadata,
      read, archived, snoozed_until, created_at
    FROM "${schema}".activity_feed
    WHERE snoozed_until IS NOT NULL AND snoozed_until <= NOW()
    ORDER BY snoozed_until ASC`,
    []
  );

  return result.rows.map((row: GenericRow) => ({
    activityId: row.activity_id,
    userId: row.user_id,
    userName: row.user_name || '',
    action: row.action as ActivityAction,
    module: row.module,
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id,
    entityTitle: row.entity_title || '',
    metadata: row.metadata || {},
    read: row.read || false,
    archived: row.archived || false,
    snoozedUntil: row.snoozed_until || null,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at,
  }));
}

/**
 * Clear expired snoozes (set snoozed_until to NULL for expired snoozes)
 * Validates: Requirement 2.5 - Activity snooze management
 *
 * Clears the snoozed_until field for all activities whose snooze time has passed.
 * This is typically called by a scheduled job to automatically unsnooze activities.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @returns The number of activities that were unsnoozed
 */
export async function clearExpiredSnoozes(
  tenantId: string
): Promise<number> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".activity_feed
     SET snoozed_until = NULL
     WHERE snoozed_until IS NOT NULL AND snoozed_until <= NOW()`,
    []
  );
  return result.rowCount ?? 0;
}

/**
 * Get unread activity count for a user
 * Validates: Requirement 2.5 - Activity state management
 *
 * Returns the count of unread, non-archived activities for a user.
 * Excludes snoozed activities that haven't expired yet.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param userId - The user ID to count unread activities for
 * @returns The count of unread activities
 */
export async function getUnreadActivityCount(
  tenantId: string,
  userId: string
): Promise<number> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT COUNT(*) as count
     FROM "${schema}".activity_feed
     WHERE user_id = $1
       AND read = FALSE
       AND archived = FALSE
       AND (snoozed_until IS NULL OR snoozed_until <= NOW())`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}
