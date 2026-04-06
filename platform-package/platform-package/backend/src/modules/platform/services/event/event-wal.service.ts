import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export async function markDispatched(tenantId: string, eventId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".agrc_event_log
     SET dispatch_status = 'dispatched', dispatched_at = NOW(), dispatch_attempts = dispatch_attempts + 1
     WHERE event_id = $1 AND dispatch_status = 'pending'`,
    [eventId],
  );
}

export async function markDispatchFailed(tenantId: string, eventId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".agrc_event_log
     SET dispatch_status = CASE WHEN dispatch_attempts >= 5 THEN 'abandoned' ELSE 'pending' END,
         dispatch_attempts = dispatch_attempts + 1
     WHERE event_id = $1`,
    [eventId],
  );
}

export interface UndeliveredEvent {
  event_id: string;
  event_type: string;
  source_service: string;
  entity_type: string;
  entity_id: string;
  severity: string;
  payload: Record<string, any>;
  created_at: string;
  dispatch_attempts: number;
}

export async function recoverUndeliveredEvents(
  tenantId: string,
  limit: number = 100,
): Promise<UndeliveredEvent[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT event_id, event_type, source_service, entity_type, entity_id,
              severity, payload, created_at, dispatch_attempts
       FROM "${schema}".agrc_event_log
       WHERE dispatch_status = 'pending'
         AND dispatch_attempts < 5
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows as UndeliveredEvent[];
  } catch {
    return [];
  }
}

export async function getWalStats(tenantId: string): Promise<{
  pending: number;
  dispatched: number;
  abandoned: number;
}> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT dispatch_status, COUNT(*)::int AS count
       FROM "${schema}".agrc_event_log
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY dispatch_status`,
    );
    const stats = { pending: 0, dispatched: 0, abandoned: 0 };
    for (const row of result.rows) {
      const status = (row.dispatch_status || 'dispatched') as keyof typeof stats;
      if (status in stats) stats[status] = row.count;
    }
    return stats;
  } catch {
    return { pending: 0, dispatched: 0, abandoned: 0 };
  }
}

let _recoveryRunning = false;

export async function runWalRecovery(
  tenantId: string,
  emitFn: (event: UndeliveredEvent) => Promise<void>,
): Promise<{ recovered: number; failed: number }> {
  if (_recoveryRunning) return { recovered: 0, failed: 0 };
  _recoveryRunning = true;

  let recovered = 0;
  let failed = 0;

  try {
    const events = await recoverUndeliveredEvents(tenantId);
    for (const evt of events) {
      try {
        await emitFn(evt);
        await markDispatched(tenantId, evt.event_id);
        recovered++;
      } catch {
        await markDispatchFailed(tenantId, evt.event_id);
        failed++;
      }
    }

    if (recovered > 0) {
      logger.info(`[WAL Recovery] Recovered ${recovered} events for tenant ${tenantId} (${failed} failed)`);
    }
  } finally {
    _recoveryRunning = false;
  }

  return { recovered, failed };
}
