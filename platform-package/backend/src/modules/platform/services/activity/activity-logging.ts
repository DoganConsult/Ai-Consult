// Activity Feed - Activity Logging & Feed Queries
// Database operations for logging activities and querying the feed

import { safeQuery, tenantSchema } from '../../../../config/database';
import { assertValidTenantId } from '../tenant/tenant-isolation';
import {
  LegacyActivityEntry,
  LegacyActivityFilter,
  ActivityNotification,
} from './activity-feed.types';

export async function logActivity(tenantId: string, data: {
  user_id: string; action: string; module: string;
  entity_type: string; entity_id: string; entity_title?: string; metadata?: Record<string, any>;
}): Promise<LegacyActivityEntry> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `INSERT INTO "${schema}".activity_feed (user_id, action, module, entity_type, entity_id, entity_title, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *`,
    [data.user_id, data.action, data.module, data.entity_type, data.entity_id, data.entity_title || '', JSON.stringify(data.metadata || {})]
  );
  return res.rows[0];
}

export async function getActivityFeed(tenantId: string, filters?: LegacyActivityFilter): Promise<LegacyActivityEntry[]> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.module) { conditions.push(`module = $${idx}`); idx++; params.push(filters.module); }
  if (filters?.action) { conditions.push(`action = $${idx}`); idx++; params.push(filters.action); }
  if (filters?.entity_type) { conditions.push(`entity_type = $${idx}`); idx++; params.push(filters.entity_type); }
  if (filters?.user_id) { conditions.push(`user_id = $${idx}`); idx++; params.push(filters.user_id); }
  if (filters?.from_date) { conditions.push(`created_at >= $${idx}`); idx++; params.push(filters.from_date); }
  if (filters?.to_date) { conditions.push(`created_at <= $${idx}`); idx++; params.push(filters.to_date); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  params.push(limit, offset);
  const limitIdx = idx; idx++;
  const offsetIdx = idx;
  const sql = `SELECT * FROM "${schema}".activity_feed ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const res = await safeQuery(sql, params);
  return res.rows;
}

export async function getUserActivity(tenantId: string, userId: string): Promise<LegacyActivityEntry[]> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".activity_feed WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return res.rows;
}

export async function createNotification(tenantId: string, activityId: string, userId: string): Promise<ActivityNotification> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `INSERT INTO "${schema}".activity_notifications (activity_id, user_id)
     VALUES ($1, $2) RETURNING *`,
    [activityId, userId]
  );
  return res.rows[0];
}

export async function getUnreadNotifications(tenantId: string, userId: string): Promise<ActivityNotification[]> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".activity_notifications
     WHERE user_id = $1 AND read = FALSE AND dismissed = FALSE
     ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return res.rows;
}

export async function markNotificationRead(tenantId: string, notificationId: string): Promise<void> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".activity_notifications SET read = TRUE, read_at = NOW() WHERE notification_id = $1`,
    [notificationId]
  );
}

export async function markAllRead(tenantId: string, userId: string): Promise<number> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".activity_notifications SET read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND read = FALSE`,
    [userId]
  );
  return res.rowCount ?? 0;
}

export async function dismissNotification(tenantId: string, notificationId: string): Promise<void> {
  // Validate tenant ID before executing query
  assertValidTenantId(tenantId);

  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".activity_notifications SET dismissed = TRUE WHERE notification_id = $1`,
    [notificationId]
  );
}
