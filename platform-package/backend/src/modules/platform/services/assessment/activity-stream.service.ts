// @ts-nocheck
/**
 * Activity Stream Aggregation Service
 *
 * Provides paginated activity feeds, entity-level timelines,
 * per-user activity history, activity statistics, and recording.
 * Supports filtering by module, entity type, user, date range,
 * and activity type. Both offset-based and cursor-based pagination.
 *
 * Tables: activity_stream, audit_trail in tenant schema.
 * Owner: DOS (platform observability)
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Types ────────────────────────────────────────────────────────────────────

/** A single activity stream entry. */
export interface ActivityEntry {
  activityId: string;
  userId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/** Filters for querying the activity stream. */
export interface ActivityStreamFilters {
  module?: string;
  entityType?: string;
  userId?: string;
  activityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}

/** Paginated activity stream response. */
export interface PaginatedActivityStream {
  items: ActivityEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor?: string;
}

/** Activity statistics aggregation. */
export interface ActivityStats {
  totalActivities: number;
  byModule: Record<string, number>;
  byAction: Record<string, number>;
  byUser: Array<{ userId: string; count: number }>;
  timeRange: { start: string; end: string };
}

/** Input for recording a new activity. */
export interface RecordActivityInput {
  userId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  summary?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const MAX_USER_ACTIVITY_LIMIT = 200;

// ── Row Mapping ──────────────────────────────────────────────────────────────

/** Map a database row to an ActivityEntry. */
function rowToEntry(row: GenericRow): ActivityEntry {
  return {
    activityId: row.activity_id || row.id || '',
    userId: row.user_id || '',
    module: row.module || '',
    action: row.action || '',
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    summary: row.summary || '',
    changes: typeof row.changes === 'string' ? JSON.parse(row.changes) : (row.changes || {}),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at || ''),
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

/** Validate a tenant ID is non-empty. */
function assertTenant(tenantId: string): void {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new Error('tenantId is required and must be a non-empty string');
  }
}

/** Sanitize and clamp a limit value. */
function sanitizeLimit(limit?: number, max = MAX_LIMIT): number {
  if (!limit || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, max);
}

/** Sanitize an offset value. */
function sanitizeOffset(offset?: number): number {
  if (!offset || offset < 0) return 0;
  return Math.floor(offset);
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the paginated activity stream with filters.
 *
 * Supports filtering by module, entityType, userId, activityType (action),
 * date range, and pagination via offset or cursor.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param filters - Optional query filters and pagination
 * @returns Paginated activity stream response
 */
export async function getActivityStream(
  tenantId: string,
  filters: ActivityStreamFilters = {},
): Promise<PaginatedActivityStream> {
  assertTenant(tenantId);
  const schema = tenantSchema(tenantId);
  const limit = sanitizeLimit(filters.limit);
  const offset = sanitizeOffset(filters.offset);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.module) {
    conditions.push(`module = $${idx++}`);
    params.push(filters.module);
  }
  if (filters.entityType) {
    conditions.push(`entity_type = $${idx++}`);
    params.push(filters.entityType);
  }
  if (filters.userId) {
    conditions.push(`user_id = $${idx++}`);
    params.push(filters.userId);
  }
  if (filters.activityType) {
    conditions.push(`action = $${idx++}`);
    params.push(filters.activityType);
  }
  if (filters.startDate) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(filters.endDate);
  }
  if (filters.cursor) {
    conditions.push(`created_at < $${idx++}`);
    params.push(filters.cursor);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching rows (without pagination)
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".activity_stream ${where}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  // Fetch paginated rows
  const dataParams = [...params, limit, offset];
  const dataResult = await safeQuery(
    `SELECT activity_id, user_id, module, action, entity_type, entity_id,
            summary, changes, metadata, created_at
     FROM "${schema}".activity_stream ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams,
  );

  const items = dataResult.rows.map(rowToEntry);
  const hasMore = offset + items.length < total;
  const nextCursor = items.length > 0 ? items[items.length - 1].timestamp : undefined;

  return { items, total, limit, offset, hasMore, nextCursor };
}

/**
 * Get all activity entries for a specific entity.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param entityType - The type of entity (e.g., 'risk', 'control')
 * @param entityId - The unique identifier of the entity
 * @returns Array of activity entries ordered by most recent first
 */
export async function getActivityByEntity(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<ActivityEntry[]> {
  assertTenant(tenantId);
  if (!entityType || !entityId) {
    throw new Error('entityType and entityId are required');
  }
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT activity_id, user_id, module, action, entity_type, entity_id,
            summary, changes, metadata, created_at
     FROM "${schema}".activity_stream
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC
     LIMIT 200`,
    [entityType, entityId],
  );

  return result.rows.map(rowToEntry);
}

/**
 * Get recent activity for a specific user.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param userId - The user whose activity to retrieve
 * @param limit - Maximum number of entries to return (default 50)
 * @returns Array of activity entries ordered by most recent first
 */
export async function getActivityByUser(
  tenantId: string,
  userId: string,
  limit = DEFAULT_LIMIT,
): Promise<ActivityEntry[]> {
  assertTenant(tenantId);
  if (!userId) {
    throw new Error('userId is required');
  }
  const schema = tenantSchema(tenantId);
  const safeLimit = sanitizeLimit(limit, MAX_USER_ACTIVITY_LIMIT);

  const result = await safeQuery(
    `SELECT activity_id, user_id, module, action, entity_type, entity_id,
            summary, changes, metadata, created_at
     FROM "${schema}".activity_stream
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, safeLimit],
  );

  return result.rows.map(rowToEntry);
}

/**
 * Get activity statistics for a time range.
 *
 * Aggregates activity counts by module, action type, and user.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param timeRange - Start and end dates for aggregation window
 * @returns Activity statistics with breakdowns by module, action, and user
 */
export async function getActivityStats(
  tenantId: string,
  timeRange: { start: string; end: string },
): Promise<ActivityStats> {
  assertTenant(tenantId);
  if (!timeRange?.start || !timeRange?.end) {
    throw new Error('timeRange with start and end dates is required');
  }
  const schema = tenantSchema(tenantId);

  // Total count
  const totalResult = await safeQuery(
    `SELECT COUNT(*)::int AS total
     FROM "${schema}".activity_stream
     WHERE created_at >= $1 AND created_at <= $2`,
    [timeRange.start, timeRange.end],
  );

  // Counts by module
  const byModuleResult = await safeQuery(
    `SELECT module, COUNT(*)::int AS cnt
     FROM "${schema}".activity_stream
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY module
     ORDER BY cnt DESC`,
    [timeRange.start, timeRange.end],
  );

  // Counts by action type
  const byActionResult = await safeQuery(
    `SELECT action, COUNT(*)::int AS cnt
     FROM "${schema}".activity_stream
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY action
     ORDER BY cnt DESC`,
    [timeRange.start, timeRange.end],
  );

  // Counts by user (top 20)
  const byUserResult = await safeQuery(
    `SELECT user_id, COUNT(*)::int AS cnt
     FROM "${schema}".activity_stream
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY user_id
     ORDER BY cnt DESC
     LIMIT 20`,
    [timeRange.start, timeRange.end],
  );

  const byModule: Record<string, number> = {};
  for (const row of byModuleResult.rows) {
    byModule[row.module] = row.cnt;
  }

  const byAction: Record<string, number> = {};
  for (const row of byActionResult.rows) {
    byAction[row.action] = row.cnt;
  }

  const byUser = byUserResult.rows.map((row: GenericRow) => ({
    userId: row.user_id as string,
    count: row.cnt as number,
  }));

  return {
    totalActivities: totalResult.rows[0]?.total ?? 0,
    byModule,
    byAction,
    byUser,
    timeRange,
  };
}

/**
 * Record a new activity entry in the activity stream.
 *
 * Validates input, persists to the activity_stream table, and logs
 * the operation for audit observability.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param activity - Activity data to record
 * @returns The recorded activity entry with generated ID and timestamp
 */
export async function recordActivity(
  tenantId: string,
  activity: RecordActivityInput,
): Promise<ActivityEntry> {
  assertTenant(tenantId);
  if (!activity.userId) throw new Error('activity.userId is required');
  if (!activity.action) throw new Error('activity.action is required');
  if (!activity.entityType) throw new Error('activity.entityType is required');
  if (!activity.entityId) throw new Error('activity.entityId is required');

  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".activity_stream
       (user_id, module, action, entity_type, entity_id, summary, changes, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING activity_id, created_at`,
    [
      activity.userId,
      activity.module || '',
      activity.action,
      activity.entityType,
      activity.entityId,
      activity.summary || '',
      JSON.stringify(activity.changes || {}),
      JSON.stringify(activity.metadata || {}),
    ],
  );

  const row = result.rows[0];
  logger.debug(`[ActivityStream] Recorded activity: ${activity.action} on ${activity.entityType}/${activity.entityId}`);

  return {
    activityId: row.activity_id,
    userId: activity.userId,
    module: activity.module || '',
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    summary: activity.summary || '',
    changes: activity.changes || {},
    metadata: activity.metadata || {},
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

/**
 * Get activity entries from the audit_trail table as a fallback or
 * complementary data source for comprehensive activity tracking.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param filters - Optional query filters
 * @returns Array of activity entries sourced from the audit trail
 */
export async function getAuditTrailActivity(
  tenantId: string,
  filters: { module?: string; userId?: string; limit?: number } = {},
): Promise<ActivityEntry[]> {
  assertTenant(tenantId);
  const schema = tenantSchema(tenantId);
  const limit = sanitizeLimit(filters.limit, 100);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.module) {
    conditions.push(`module = $${idx++}`);
    params.push(filters.module);
  }
  if (filters.userId) {
    conditions.push(`user_id = $${idx++}`);
    params.push(filters.userId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT id, user_id, module, action, entity_type, entity_id,
            COALESCE(after_state::text, '{}') AS changes, created_at
     FROM "${schema}".audit_trail ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++}`,
    [...params, limit],
  );

  return result.rows.map((row: GenericRow) => ({
    activityId: row.id || '',
    userId: row.user_id || '',
    module: row.module || '',
    action: row.action || '',
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    summary: `${row.action} ${row.entity_type}`,
    changes: typeof row.changes === 'string' ? JSON.parse(row.changes) : (row.changes || {}),
    metadata: {},
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at || ''),
  }));
}
