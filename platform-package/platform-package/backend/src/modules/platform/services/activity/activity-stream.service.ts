// @ts-nocheck
// ============================================
// Shahin — Activity Stream Service
// Dedicated activity feed with recording and query
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import type { GenericRow } from '../../../../types/db-rows.types';

// === Types ===

export interface ActivityRecord {
  activityId: string;
  userId: string;
  module?: string;
  action: string;
  entityType: string;
  entityId: string;
  summary?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TimelineFilters {
  module?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// === Pure Functions ===

export function serializeActivityRecord(record: ActivityRecord): string {
  return JSON.stringify(record);
}

export function deserializeActivityRecord(json: string): ActivityRecord {
  const parsed = JSON.parse(json);
  if (!parsed.userId || !parsed.module || !parsed.action) {
    throw new Error('Invalid activity record: missing required fields');
  }
  return {
    activityId: parsed.activityId || '',
    userId: parsed.userId,
    module: parsed.module,
    action: parsed.action,
    entityType: parsed.entityType || '',
    entityId: parsed.entityId || '',
    summary: parsed.summary || '',
    changes: parsed.changes || {},
    timestamp: parsed.timestamp || new Date().toISOString(),
  };
}

// === API Functions ===

export async function recordActivity(
  tenantId: string,
  activity: Omit<ActivityRecord, 'activityId' | 'timestamp'>
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".activity_stream (user_id, module, action, entity_type, entity_id, summary, changes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [activity.userId, activity.module || '', activity.action, activity.entityType, activity.entityId, activity.summary || '', JSON.stringify(activity.changes || {})]
  );
}

export async function getTimeline(tenantId: string, filters: TimelineFilters): Promise<ActivityRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.module) { conditions.push(`module = $${idx++}`); params.push(filters.module); }
  if (filters.entityType) { conditions.push(`entity_type = $${idx++}`); params.push(filters.entityType); }
  if (filters.userId) { conditions.push(`user_id = $${idx++}`); params.push(filters.userId); }
  if (filters.startDate) { conditions.push(`created_at >= $${idx++}`); params.push(filters.startDate); }
  if (filters.endDate) { conditions.push(`created_at <= $${idx++}`); params.push(filters.endDate); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const result = await safeQuery(
    `SELECT activity_id, user_id, module, action, entity_type, entity_id, summary, changes, created_at
     FROM "${schema}".activity_stream ${where}
     ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return result.rows.map((r: GenericRow) => ({
    activityId: r.activity_id,
    userId: r.user_id,
    module: r.module,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    summary: r.summary || '',
    changes: r.changes || {},
    timestamp: r.created_at?.toISOString?.() || r.created_at,
  }));
}

export async function getEntityTimeline(tenantId: string, entityType: string, entityId: string): Promise<ActivityRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT activity_id, user_id, module, action, entity_type, entity_id, summary, changes, created_at
     FROM "${schema}".activity_stream
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC LIMIT 100`,
    [entityType, entityId]
  );
  return result.rows.map((r: GenericRow) => ({
    activityId: r.activity_id,
    userId: r.user_id,
    module: r.module,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    summary: r.summary || '',
    changes: r.changes || {},
    timestamp: r.created_at?.toISOString?.() || r.created_at,
  }));
}
