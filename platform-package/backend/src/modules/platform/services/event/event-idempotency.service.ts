import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export async function isAlreadyProcessed(
  tenantId: string,
  eventId: string,
  handlerName: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT 1 FROM "${schema}".event_idempotency_log
       WHERE event_id = $1 AND handler_name = $2 LIMIT 1`,
      [eventId, handlerName],
    );
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function markProcessed(
  tenantId: string,
  eventId: string,
  handlerName: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".event_idempotency_log (event_id, handler_name)
       VALUES ($1, $2)
       ON CONFLICT (event_id, handler_name) DO NOTHING`,
      [eventId, handlerName],
    );
  } catch {
    logger.debug(`[Idempotency] Failed to mark ${eventId}/${handlerName} — table may not exist`);
  }
}

export async function cleanupOldEntries(tenantId: string, retentionDays: number = 7): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `DELETE FROM "${schema}".event_idempotency_log
       WHERE processed_at < NOW() - ($1 || ' days')::interval`,
      [retentionDays],
    );
    return result.rowCount ?? 0;
  } catch {
    return 0;
  }
}

export async function getIdempotencyStats(tenantId: string): Promise<{
  totalEntries: number;
  duplicatesBlocked: number;
}> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".event_idempotency_log`,
    );
    return { totalEntries: result.rows[0]?.total ?? 0, duplicatesBlocked: 0 };
  } catch {
    return { totalEntries: 0, duplicatesBlocked: 0 };
  }
}
