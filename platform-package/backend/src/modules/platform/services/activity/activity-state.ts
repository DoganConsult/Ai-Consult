// Activity Feed - Activity State Management Operations
// Validates: Requirement 2.5 - Users can mark activities as read, snooze, or archive them

import { safeQuery, tenantSchema } from '../../../../config/database';
import { assertValidTenantId } from '../tenant/tenant-isolation';
import {
  ActivityEntry,
  ActivityFilter,
  ActivityAction,
  EntityType,
} from './activity-feed.types';

/**
 * Mark a single activity as read
 * Validates: Requirement 2.5 - Users can mark activities as read
 *
 * Updates the read status of a single activity to true.
 * Returns true if the activity was found and updated, false otherwise.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param activityId - The ID of the activity to mark as read
 * @returns True if the activity was updated, false if not found
 */
export async function markAsRead(
  tenantId: string,
  activityId: string
): Promise<boolean> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".activity_feed
     SET read = TRUE
     WHERE activity_id = $1 AND read = FALSE`,
    [activityId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Mark all activities as read for a user, optionally filtered
 * Validates: Requirement 2.5 - Users can mark activities as read
 *
 * Updates the read status of all matching activities to true.
 * If a filter is provided, only activities matching the filter criteria are updated.
 * Returns the count of activities that were marked as read.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param userId - The user ID whose activities should be marked as read
 * @param filter - Optional filter to limit which activities are marked as read
 * @returns The number of activities that were marked as read
 */
export async function markAllAsReadForUser(
  tenantId: string,
  userId: string,
  filter?: ActivityFilter
): Promise<number> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);

  // Build query conditions
  const conditions: string[] = ['user_id = $1', 'read = FALSE'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  // Apply optional filter conditions
  if (filter) {
    if (filter.modules && filter.modules.length > 0) {
      conditions.push(`module = ANY($${paramIndex})`);
      params.push(filter.modules);
      paramIndex++;
    }

    if (filter.entityTypes && filter.entityTypes.length > 0) {
      conditions.push(`entity_type = ANY($${paramIndex})`);
      params.push(filter.entityTypes);
      paramIndex++;
    }

    if (filter.actions && filter.actions.length > 0) {
      conditions.push(`action = ANY($${paramIndex})`);
      params.push(filter.actions);
      paramIndex++;
    }

    if (filter.dateFrom) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filter.dateFrom);
      paramIndex++;
    }

    if (filter.dateTo) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filter.dateTo);
      paramIndex++;
    }

    if (filter.archived !== undefined) {
      conditions.push(`archived = $${paramIndex}`);
      params.push(filter.archived);
      paramIndex++;
    }
  }

  const whereClause = conditions.join(' AND ');

  const result = await safeQuery(
    `UPDATE "${schema}".activity_feed
     SET read = TRUE
     WHERE ${whereClause}`,
    params
  );

  return result.rowCount ?? 0;
}

/**
 * Archive an activity
 * Validates: Requirement 2.5 - Users can archive activities
 *
 * Sets the archived status of an activity to true.
 * Archived activities are typically hidden from the main feed but can be retrieved.
 * Returns true if the activity was found and archived, false otherwise.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param activityId - The ID of the activity to archive
 * @returns True if the activity was archived, false if not found or already archived
 */
export async function archiveActivity(
  tenantId: string,
  activityId: string
): Promise<boolean> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".activity_feed
     SET archived = TRUE
     WHERE activity_id = $1 AND archived = FALSE`,
    [activityId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Unarchive an activity
 * Validates: Requirement 2.5 - Users can manage activity archive status
 *
 * Sets the archived status of an activity to false.
 * Returns true if the activity was found and unarchived, false otherwise.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param activityId - The ID of the activity to unarchive
 * @returns True if the activity was unarchived, false if not found or not archived
 */
export async function unarchiveActivity(
  tenantId: string,
  activityId: string
): Promise<boolean> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".activity_feed
     SET archived = FALSE
     WHERE activity_id = $1 AND archived = TRUE`,
    [activityId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Snooze an activity until a specified time
 * Validates: Requirement 2.5 - Users can snooze activities
 *
 * Sets the snoozed_until timestamp for an activity.
 * Snoozed activities are temporarily hidden from the feed until the snooze time expires.
 * Returns true if the activity was found and snoozed, false otherwise.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param activityId - The ID of the activity to snooze
 * @param snoozedUntil - ISO timestamp string indicating when the snooze expires
 * @returns True if the activity was snoozed, false if not found
 */
export async function snoozeActivity(
  tenantId: string,
  activityId: string,
  snoozedUntil: string
): Promise<boolean> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);

  // Validate the snoozedUntil timestamp
  const snoozeDate = new Date(snoozedUntil);
  if (isNaN(snoozeDate.getTime())) {
    throw new Error('Invalid snoozedUntil timestamp');
  }

  // Ensure snooze time is in the future
  if (snoozeDate <= new Date()) {
    throw new Error('Snooze time must be in the future');
  }

  const result = await safeQuery(
    `UPDATE "${schema}".activity_feed
     SET snoozed_until = $2
     WHERE activity_id = $1`,
    [activityId, snoozedUntil]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Remove snooze from an activity
 * Validates: Requirement 2.5 - Users can manage activity snooze status
 *
 * Clears the snoozed_until timestamp for an activity, making it visible again.
 * Returns true if the activity was found and unsnoozed, false otherwise.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param activityId - The ID of the activity to unsnooze
 * @returns True if the activity was unsnoozed, false if not found or not snoozed
 */
export async function unsnoozeActivity(
  tenantId: string,
  activityId: string
): Promise<boolean> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".activity_feed
     SET snoozed_until = NULL
     WHERE activity_id = $1 AND snoozed_until IS NOT NULL`,
    [activityId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get a single activity by ID
 * Validates: Requirement 2.5 - Activity state management
 *
 * Retrieves a single activity entry by its ID.
 * Returns null if the activity is not found.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param activityId - The ID of the activity to retrieve
 * @returns The activity entry or null if not found
 */
export async function getActivityById(
  tenantId: string,
  activityId: string
): Promise<ActivityEntry | null> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
      activity_id, user_id, user_name, action, module,
      entity_type, entity_id, entity_title, metadata,
      read, archived, snoozed_until, created_at
    FROM "${schema}".activity_feed
    WHERE activity_id = $1`,
    [activityId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
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
  };
}
