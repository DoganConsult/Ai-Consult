// @ts-nocheck
// Activity Feed - Cursor-Based Pagination
// Validates: Requirement 2.9 - Activity feed supports cursor-based pagination
// Property 9: Cursor Pagination Consistency

import { safeQuery, tenantSchema } from '../../../config/database';
import { assertValidTenantId } from '../../../modules/platform/services/tenant/tenant-isolation';
import { sortActivitiesDesc } from '../../../modules/platform/services/activity/activity-filtering';
import {
  ActivityEntry,
  ActivityFilter,
  ActivityAction,
  EntityType,
  ActivityCursor,
  PaginatedActivityResult,
} from '../../../modules/platform/services/activity/activity-feed.types';
import type { GenericRow } from '../../../types/db-rows.types';

/**
 * Pure function: Encode cursor to base64 string
 * Validates: Requirement 2.9 - Cursor-based pagination
 *
 * Encodes the cursor object (createdAt + activityId) to a base64 string
 * for use in API responses and subsequent requests.
 *
 * @param cursor - The cursor object containing createdAt and activityId
 * @returns Base64 encoded cursor string
 */
export function encodeCursor(cursor: ActivityCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, 'utf-8').toString('base64');
}

/**
 * Pure function: Decode cursor from base64 string
 * Validates: Requirement 2.9 - Cursor-based pagination
 *
 * Decodes a base64 cursor string back to the cursor object.
 * Returns null if the cursor is invalid or cannot be parsed.
 *
 * @param cursorString - Base64 encoded cursor string
 * @returns Decoded cursor object or null if invalid
 */
export function decodeCursor(cursorString: string): ActivityCursor | null {
  try {
    const json = Buffer.from(cursorString, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);

    // Validate cursor structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.createdAt === 'string' &&
      typeof parsed.activityId === 'string'
    ) {
      return {
        createdAt: parsed.createdAt,
        activityId: parsed.activityId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pure function: Apply cursor-based pagination to activities
 * Validates: Requirement 2.9 - Cursor-based pagination for efficient loading
 * Property 9: Cursor Pagination Consistency
 *
 * Filters activities to return only those after the cursor position,
 * sorted by createdAt descending. Uses createdAt + activityId for
 * stable pagination even when multiple activities have the same timestamp.
 *
 * @param activities - Array of activities (should be pre-sorted descending by createdAt)
 * @param cursor - Optional cursor to start pagination from
 * @param limit - Maximum number of activities to return (default 20)
 * @returns Paginated result with activities and nextCursor
 */
export function paginateActivitiesWithCursor(
  activities: ActivityEntry[],
  cursor: ActivityCursor | null,
  limit: number = 20
): PaginatedActivityResult {
  // Ensure activities are sorted descending by createdAt
  const sorted = sortActivitiesDesc(activities);

  let startIndex = 0;

  // If cursor is provided, find the position after the cursor
  if (cursor) {
    const cursorTime = new Date(cursor.createdAt).getTime();

    // Find the first activity that comes after the cursor
    // An activity comes after the cursor if:
    // 1. Its timestamp is less than cursor timestamp, OR
    // 2. Its timestamp equals cursor timestamp AND its activityId is different (and comes after alphabetically)
    startIndex = sorted.findIndex((activity) => {
      const activityTime = new Date(activity.createdAt).getTime();

      if (activityTime < cursorTime) {
        return true;
      }
      if (activityTime === cursorTime && activity.activityId !== cursor.activityId) {
        // For same timestamp, use activityId as tiebreaker
        // We want activities that come after the cursor's activityId
        return activity.activityId > cursor.activityId;
      }
      return false;
    });

    // If cursor activity not found or no activities after it, start from 0
    // This handles the case where cursor points to a deleted activity
    if (startIndex === -1) {
      // Check if cursor matches any activity exactly
      const cursorIndex = sorted.findIndex(
        a => a.activityId === cursor.activityId && a.createdAt === cursor.createdAt
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      } else {
        // Cursor doesn't match any activity, return empty result
        return { activities: [], nextCursor: null };
      }
    }
  }

  // Get the page of activities
  const pageActivities = sorted.slice(startIndex, startIndex + limit);

  // Determine if there are more activities after this page
  const hasMore = startIndex + limit < sorted.length;

  // Generate next cursor from the last activity in the page
  let nextCursor: string | null = null;
  if (hasMore && pageActivities.length > 0) {
    const lastActivity = pageActivities[pageActivities.length - 1];
    nextCursor = encodeCursor({
      createdAt: lastActivity.createdAt,
      activityId: lastActivity.activityId,
    });
  }

  return {
    activities: pageActivities,
    nextCursor,
  };
}

/**
 * Get activity feed with cursor-based pagination
 * Validates: Requirement 2.9 - Activity feed supports cursor-based pagination
 *
 * Fetches activities from the database with cursor-based pagination.
 * Uses createdAt + activityId for stable, efficient pagination.
 *
 * @param tenantId - Tenant ID for schema isolation
 * @param userId - User ID for filtering (optional, for user-specific feeds)
 * @param filter - Activity filter criteria
 * @param cursorString - Optional cursor string for pagination
 * @param limit - Maximum number of activities to return (default 20)
 * @returns Paginated result with activities and nextCursor
 */
export async function getActivityFeedPaginated(
  tenantId: string,
  _userId: string | null,
  filter: ActivityFilter,
  cursorString?: string,
  limit: number = 20
): Promise<PaginatedActivityResult> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);

  // Decode cursor if provided
  const cursor = cursorString ? decodeCursor(cursorString) : null;

  // Build query conditions
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Apply cursor condition for efficient database-level pagination
  if (cursor) {
    conditions.push(`(created_at, activity_id) < ($${paramIndex}, $${paramIndex + 1})`);
    params.push(cursor.createdAt, cursor.activityId);
    paramIndex += 2;
  }

  // Apply filter conditions
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

  if (filter.userIds && filter.userIds.length > 0) {
    conditions.push(`user_id = ANY($${paramIndex})`);
    params.push(filter.userIds);
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

  if (filter.read !== undefined) {
    conditions.push(`read = $${paramIndex}`);
    params.push(filter.read);
    paramIndex++;
  }

  if (filter.archived !== undefined) {
    conditions.push(`archived = $${paramIndex}`);
    params.push(filter.archived);
    paramIndex++;
  }

  // Build WHERE clause
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Fetch limit + 1 to determine if there are more results
  const fetchLimit = limit + 1;
  params.push(fetchLimit);

  const sql = `
    SELECT
      activity_id, user_id, COALESCE(user_name, '') as user_name, action, module,
      entity_type, entity_id, entity_title, metadata,
      COALESCE(read, false) as read, COALESCE(archived, false) as archived,
      snoozed_until, created_at
    FROM "${schema}".activity_feed
    ${whereClause}
    ORDER BY created_at DESC, activity_id DESC
    LIMIT $${paramIndex}
  `;

  const result = await safeQuery(sql, params);

  // Map database rows to ActivityEntry objects
  const activities: ActivityEntry[] = result.rows.slice(0, limit).map((row: GenericRow) => ({
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

  // Determine if there are more results
  const hasMore = result.rows.length > limit;

  // Generate next cursor from the last activity
  let nextCursorStr: string | null = null;
  if (hasMore && activities.length > 0) {
    const lastActivity = activities[activities.length - 1];
    nextCursorStr = encodeCursor({
      createdAt: lastActivity.createdAt,
      activityId: lastActivity.activityId,
    });
  }

  return {
    activities,
    nextCursor: nextCursorStr,
  };
}
