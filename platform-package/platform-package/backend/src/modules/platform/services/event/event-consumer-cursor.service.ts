import { safeQuery, tenantSchema } from '../../../../config/database';

export async function getConsumerCursor(tenantId: string, consumerName: string): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT last_event_id FROM "${schema}".event_consumer_cursors WHERE consumer_name = $1`,
      [consumerName],
    );
    return result.rows[0]?.last_event_id ?? null;
  } catch {
    return null;
  }
}

export async function updateConsumerCursor(tenantId: string, consumerName: string, eventId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".event_consumer_cursors (consumer_name, last_event_id, events_processed, updated_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (consumer_name) DO UPDATE SET
       last_event_id = $2,
       last_processed_at = NOW(),
       events_processed = event_consumer_cursors.events_processed + 1,
       updated_at = NOW()`,
    [consumerName, eventId],
  );
}

export interface ReplayEvent {
  event_id: string;
  event_type: string;
  source_service: string;
  entity_type: string;
  entity_id: string;
  severity: string;
  payload: Record<string, any>;
  created_at: string;
}

export async function replayEventsFromCursor(
  tenantId: string,
  consumerName: string,
  opts?: { limit?: number; eventType?: string },
): Promise<ReplayEvent[]> {
  const schema = tenantSchema(tenantId);
  const limit = opts?.limit ?? 500;
  const cursor = await getConsumerCursor(tenantId, consumerName);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (cursor) {
    conditions.push(`created_at > (SELECT created_at FROM "${schema}".agrc_event_log WHERE event_id = $${idx++} LIMIT 1)`);
    params.push(cursor);
  }

  if (opts?.eventType) {
    conditions.push(`event_type = $${idx++}`);
    params.push(opts.eventType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT event_id, event_type, source_service, entity_type, entity_id, severity, payload, created_at
     FROM "${schema}".agrc_event_log
     ${where}
     ORDER BY created_at ASC
     LIMIT ${limit}`,
    params,
  );

  return result.rows as ReplayEvent[];
}

export async function getAllCursors(tenantId: string): Promise<Array<{
  consumerName: string;
  lastEventId: string;
  lastProcessedAt: string;
  eventsProcessed: number;
}>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT consumer_name, last_event_id, last_processed_at, events_processed
       FROM "${schema}".event_consumer_cursors
       ORDER BY consumer_name`,
    );
    return result.rows.map((r: any) => ({
      consumerName: r.consumer_name,
      lastEventId: r.last_event_id,
      lastProcessedAt: r.last_processed_at,
      eventsProcessed: Number(r.events_processed),
    }));
  } catch {
    return [];
  }
}

export async function getConsumerLag(tenantId: string, consumerName: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const cursor = await getConsumerCursor(tenantId, consumerName);
    if (!cursor) {
      const total = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".agrc_event_log`);
      return total.rows[0]?.c ?? 0;
    }
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS c FROM "${schema}".agrc_event_log
       WHERE created_at > (SELECT created_at FROM "${schema}".agrc_event_log WHERE event_id = $1 LIMIT 1)`,
      [cursor],
    );
    return result.rows[0]?.c ?? 0;
  } catch {
    return 0;
  }
}
