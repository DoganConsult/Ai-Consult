/**
 * Activity Feed Logging Service
 *
 * Records user/system activities for timeline and feed display.
 * All data stored in tenant-scoped `activity_feed` and `activity_notifications` tables.
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from './logger.service';

// ─── Activity Logging ────────────────────────────────────────

/**
 * Record a user or system activity in the tenant activity feed.
 */
export async function logActivity(
  tenantId: string,
  opts: {
    userId: string;
    module: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  try {
    await safeQuery(
      `INSERT INTO "${schema}".activity_feed
         (id, user_id, module, action, entity_type, entity_id, metadata, is_read, archived, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, NOW())`,
      [id, opts.userId, opts.module, opts.action, opts.entityType, opts.entityId, JSON.stringify(opts.metadata ?? {})]
    );
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to log activity for tenant=${tenantId}: ${(err as Error).message}`);
  }
}

// ─── Activity Feed Queries ───────────────────────────────────

/**
 * Retrieve the activity feed for a tenant, optionally filtered by module or entity type.
 */
export async function getActivityFeed(
  tenantId: string,
  opts: {
    limit?: number;
    offset?: number;
    module?: string;
    entityType?: string;
  }
): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(opts.limit ?? 50, 500);
  const offset = opts.offset ?? 0;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (opts.module) {
    conditions.push(`module = $${paramIdx++}`);
    params.push(opts.module);
  }
  if (opts.entityType) {
    conditions.push(`entity_type = $${paramIdx++}`);
    params.push(opts.entityType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  params.push(offset);

  try {
    const result = await safeQuery(
      `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
              is_read, archived, snoozed_until, created_at
       FROM "${schema}".activity_feed
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    );
    return result.rows;
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to get activity feed for tenant=${tenantId}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Retrieve activity feed entries for a specific user.
 */
export async function getUserActivity(
  tenantId: string,
  userId: string,
  limit: number = 50
): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const safeLimit = Math.min(limit, 500);

  try {
    const result = await safeQuery(
      `SELECT id, user_id, module, action, entity_type, entity_id, metadata,
              is_read, archived, snoozed_until, created_at
       FROM "${schema}".activity_feed
       WHERE user_id = $1 AND archived = false
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows;
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to get user activity for user=${userId}: ${(err as Error).message}`);
    return [];
  }
}

// ─── Notifications ───────────────────────────────────────────

/**
 * Create a notification for a specific user.
 */
export async function createNotification(
  tenantId: string,
  opts: {
    userId: string;
    title: string;
    body: string;
    type: string;
    entityId?: string;
    module?: string;
  }
): Promise<{ id: string }> {
  const schema = tenantSchema(tenantId);
  const id = uuid();

  try {
    await safeQuery(
      `INSERT INTO "${schema}".activity_notifications
         (id, user_id, title, body, type, entity_id, module, is_read, dismissed, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, NOW())`,
      [id, opts.userId, opts.title, opts.body, opts.type, opts.entityId ?? null, opts.module ?? null]
    );
    return { id };
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to create notification for user=${opts.userId}: ${(err as Error).message}`);
    return { id };
  }
}

/**
 * Get all unread notifications for a user.
 */
export async function getUnreadNotifications(
  tenantId: string,
  userId: string
): Promise<any[]> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id, user_id, title, body, type, entity_id, module, created_at
       FROM "${schema}".activity_notifications
       WHERE user_id = $1 AND is_read = false AND dismissed = false
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to get unread notifications for user=${userId}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  tenantId: string,
  notificationId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to mark notification read: ${(err as Error).message}`);
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(
  tenantId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_notifications
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to mark all notifications read: ${(err as Error).message}`);
  }
}

/**
 * Dismiss (soft-delete) a notification.
 */
export async function dismissNotification(
  tenantId: string,
  notificationId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".activity_notifications
       SET dismissed = true, dismissed_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  } catch (err) {
    logger.error(`[ActivityLogging] Failed to dismiss notification: ${(err as Error).message}`);
  }
}
