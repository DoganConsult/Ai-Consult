/**
 * Dogan Operating System — aggregates metrics from guardians for learning / dashboards.
 */
import { safeQuery } from "../../../config/db/query";
import { logger } from '../../../platform/dos/observability/logger.service';

export async function recordLearningMetric(
  guardianName: string,
  metricKey: string,
  metricValue: number,
  dimensions: Record<string, any> = {}
): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.dogan_learning_metrics (guardian_name, metric_key, metric_value, dimensions)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [guardianName, metricKey, metricValue, JSON.stringify(dimensions)]
    );
  } catch (e) {
    logger.warn("[DoganLearning] recordLearningMetric failed", { guardianName, metricKey, error: String(e) });
  }
}

export async function getRecentMetricsBySource(
  guardianName: string,
  limit = 100
): Promise<Array<{ metric_key: string; metric_value: number; dimensions: unknown; created_at: string }>> {
  const r = await safeQuery(
    `SELECT metric_key, metric_value, dimensions, created_at
     FROM public.dogan_learning_metrics
     WHERE guardian_name = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [guardianName, limit]
  );
  return r.rows as Array<{ metric_key: string; metric_value: number; dimensions: unknown; created_at: string }>;
}
