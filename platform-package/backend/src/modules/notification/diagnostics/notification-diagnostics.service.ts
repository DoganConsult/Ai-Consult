import { safeQuery, tenantSchema } from '../../../config/database';

export interface NotificationDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  deliveryHealth: DeliveryHealthResult;
  queueHealth: QueueHealthResult;
  preferenceHealth: PreferenceHealthResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface DeliveryHealthResult {
  failedDeliveries24h: number;
  bounceRate: number;
  issues: string[];
}

export interface QueueHealthResult {
  backloggedQueues: number;
  totalPending: number;
  oldestPendingMinutes: number;
  issues: string[];
}

export interface PreferenceHealthResult {
  usersWithNoPreferences: number;
  disabledChannelCount: number;
  issues: string[];
}

export class NotificationDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<NotificationDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      failedResult, bouncedResult, totalSentResult,
      pendingResult, oldestPendingResult,
      noPrefResult, disabledResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".notifications WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".notification_deliveries WHERE status = 'bounced' AND last_attempt_at > NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".notifications WHERE created_at > NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".notifications WHERE status = 'queued'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::int / 60 AS minutes FROM "${schema}".notifications WHERE status = 'queued'`).catch(() => ({ rows: [{ minutes: 0 }] })),
      safeQuery(`SELECT COUNT(DISTINCT user_id)::int AS count FROM "${schema}".users u WHERE NOT EXISTS (SELECT 1 FROM "${schema}".notification_preferences WHERE user_id = u.user_id)`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".notification_preferences WHERE channel_preferences->>'email' = 'false' OR channel_preferences->>'in_app' = 'false'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const failed = failedResult.rows[0]?.count ?? 0;
    const bounced = bouncedResult.rows[0]?.count ?? 0;
    const totalSent = totalSentResult.rows[0]?.count ?? 1;
    const pending = pendingResult.rows[0]?.count ?? 0;
    const oldestMinutes = oldestPendingResult.rows[0]?.minutes ?? 0;
    const noPref = noPrefResult.rows[0]?.count ?? 0;
    const disabled = disabledResult.rows[0]?.count ?? 0;
    const bounceRate = totalSent > 0 ? bounced / totalSent : 0;

    const deliveryIssues: string[] = [];
    if (failed > 0) { deliveryIssues.push(`${failed} failed deliveries in last 24h`); warnings.push(`${failed} notification delivery failure(s) in 24h`); }
    if (bounceRate > 0.05) { deliveryIssues.push(`Bounce rate ${(bounceRate * 100).toFixed(1)}% exceeds 5% threshold`); errors.push(`Notification bounce rate critical: ${(bounceRate * 100).toFixed(1)}%`); }

    const queueIssues: string[] = [];
    if (pending > 100) { queueIssues.push(`${pending} notifications pending in queue`); warnings.push(`Notification queue backlog: ${pending} pending`); }
    if (oldestMinutes > 30) queueIssues.push(`Oldest pending notification is ${oldestMinutes} minutes old`);

    const prefIssues: string[] = [];
    if (noPref > 0) prefIssues.push(`${noPref} users have no notification preferences`);
    if (disabled > 0) prefIssues.push(`${disabled} users have critical channels disabled`);

    const criticalCount = (bounceRate > 0.05 ? 1 : 0) + (errors.length > 0 ? 1 : 0);
    const degradedCount = failed + (pending > 100 ? 1 : 0) + noPref;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'notification',
      tenantId,
      generatedAt: new Date().toISOString(),
      deliveryHealth: { failedDeliveries24h: failed, bounceRate, issues: deliveryIssues },
      queueHealth: { backloggedQueues: pending > 100 ? 1 : 0, totalPending: pending, oldestPendingMinutes: oldestMinutes, issues: queueIssues },
      preferenceHealth: { usersWithNoPreferences: noPref, disabledChannelCount: disabled, issues: prefIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}
