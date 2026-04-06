// @ts-nocheck
// ============================================
// F12: Event Log Retention Service
// Archive + purge agrc_event_log to prevent
// unbounded table growth at scale.
// ============================================

import { emptyResult, query, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

export async function archiveOldEvents(tenantId: string, retentionDays: number = 90): Promise<{
  archived: number;
  deleted: number;
}> {
  const schema = tenantSchema(tenantId);
  const cutoff = `${retentionDays} days`;

  const archiveRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `WITH moved AS (
       DELETE FROM "${schema}".agrc_event_log
       WHERE created_at < NOW() - $1::INTERVAL
       RETURNING *
     )
     INSERT INTO "${schema}".agrc_event_log_archive
     SELECT * FROM moved`,
    [cutoff],
  ), { tenantId: tenantId, operation: 'query agrc_event_log' });

  return { archived: archiveRes.rowCount || 0, deleted: archiveRes.rowCount || 0 };
}

export async function purgeArchive(tenantId: string, archiveRetentionDays: number = 730): Promise<number> {
  const schema = tenantSchema(tenantId);
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `DELETE FROM "${schema}".agrc_event_log_archive
     WHERE created_at < NOW() - $1::INTERVAL`,
    [`${archiveRetentionDays} days`],
  ), { tenantId: tenantId, operation: 'query agrc_event_log_archive' });
  return res.rowCount || 0;
}

export async function getEventLogStats(tenantId: string): Promise<{
  totalEvents: number;
  archivedEvents: number;
  oldestEvent: string | null;
  eventsByType: Array<{ eventType: string; count: number }>;
}> {
  const schema = tenantSchema(tenantId);
  const [countRes, archiveRes, oldestRes, byTypeRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int as cnt FROM "${schema}".agrc_event_log`, []), { tenantId: tenantId, operation: 'query agrc_event_log' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int as cnt FROM "${schema}".agrc_event_log_archive`, []), { tenantId: tenantId, operation: 'query agrc_event_log' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ oldest: null }]), query(`SELECT MIN(created_at) as oldest FROM "${schema}".agrc_event_log`, []), { tenantId: tenantId, operation: 'query agrc_event_log' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT event_type, COUNT(*)::int as count FROM "${schema}".agrc_event_log
       GROUP BY event_type ORDER BY count DESC LIMIT 20`, [],
    ), { tenantId: tenantId, operation: 'query agrc_event_log' }),
  ]);

  return {
    totalEvents: getFirstRow(countRes)?.cnt || 0,
    archivedEvents: getFirstRow(archiveRes)?.cnt || 0,
    oldestEvent: getFirstRow(oldestRes)?.oldest || null,
    eventsByType: byTypeRes.rows,
  };
}
