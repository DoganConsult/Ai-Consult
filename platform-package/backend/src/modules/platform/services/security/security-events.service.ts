// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';
import { eventBus } from '../event/event-bus.service';

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  actorUserId: string | null;
  targetUserId: string | null;
  moduleCode: string | null;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  correlationId: string | null;
  processed: boolean;
  createdAt: string;
}

export interface SecurityEventInput {
  eventType: string;
  severity?: string;
  actorUserId?: string;
  targetUserId?: string;
  moduleCode?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  correlationId?: string;
}

export async function emitSecurityEvent(tenantId: string, input: SecurityEventInput): Promise<string> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".security_events
     (event_type, severity, actor_user_id, target_user_id, module_code,
      resource_type, resource_id, details, ip_address, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::inet, $10)
     RETURNING id`,
    [
      input.eventType, input.severity || 'info',
      input.actorUserId || null, input.targetUserId || null,
      input.moduleCode || null, input.resourceType || null,
      input.resourceId || null, JSON.stringify(input.details || {}),
      input.ipAddress || null, input.correlationId || null,
    ],
  );

  try {
    (eventBus as any).emit?.('security.event', { tenantId, ...input });
  } catch {}

  return rows[0].id;
}

export async function getSecurityEvents(
  tenantId: string,
  filters?: {
    eventType?: string;
    severity?: string;
    actorUserId?: string;
    moduleCode?: string;
    since?: string;
    limit?: number;
  },
): Promise<SecurityEvent[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.eventType) { conditions.push(`event_type = $${idx++}`); params.push(filters.eventType); }
  if (filters?.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
  if (filters?.actorUserId) { conditions.push(`actor_user_id = $${idx++}`); params.push(filters.actorUserId); }
  if (filters?.moduleCode) { conditions.push(`module_code = $${idx++}`); params.push(filters.moduleCode); }
  if (filters?.since) { conditions.push(`created_at > $${idx++}::timestamptz`); params.push(filters.since); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit || 100;

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".security_events ${where} ORDER BY created_at DESC LIMIT ${limit}`,
    params,
  );

  return rows.map(mapEvent);
}

export async function getSecurityEventStats(tenantId: string, hours = 24): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const { rows: byType } = await safeQuery(
    `SELECT event_type, severity, COUNT(*) AS cnt
     FROM "${schema}".security_events
     WHERE created_at > NOW() - $1 * INTERVAL '1 hour'
     GROUP BY event_type, severity
     ORDER BY cnt DESC`,
    [hours],
  );

  const { rows: total } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".security_events
     WHERE created_at > NOW() - $1 * INTERVAL '1 hour'`,
    [hours],
  );

  return {
    totalEvents: parseInt(total[0]?.cnt || '0', 10),
    byType: byType.map((r: GenericRow) => ({ type: r.event_type, severity: r.severity, count: parseInt(r.cnt, 10) })),
    period: `${hours}h`,
  };
}

export async function markEventsProcessed(tenantId: string, eventIds: string[]): Promise<number> {
  if (eventIds.length === 0) return 0;
  const schema = tenantSchema(tenantId);
  const { rowCount } = await safeQuery(
    `UPDATE "${schema}".security_events
     SET processed = true, processed_at = NOW()
     WHERE id = ANY($1) AND processed = false`,
    [eventIds],
  );
  return rowCount || 0;
}

function mapEvent(r: GenericRow): SecurityEvent {
  return {
    id: r.id,
    eventType: r.event_type,
    severity: r.severity,
    actorUserId: r.actor_user_id,
    targetUserId: r.target_user_id,
    moduleCode: r.module_code,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    details: r.details || {},
    ipAddress: r.ip_address,
    correlationId: r.correlation_id,
    processed: r.processed,
    createdAt: r.created_at,
  };
}
