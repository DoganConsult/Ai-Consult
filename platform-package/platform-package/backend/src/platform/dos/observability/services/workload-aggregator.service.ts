import { safeQuery, tenantSchema, emptyResult } from '../../../../config/database';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';
import { logger } from './logger.service';
import type { WorkloadSnapshot, WorkloadRecommendation } from '../../../../types/actor-identity.types';

const BATCH_CONCURRENCY = 10;

export async function computeWorkload(tenantId: string, userId: string): Promise<WorkloadSnapshot> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  let assignedTasks = 0;
  let pendingApprovals = 0;
  let overdueItems = 0;
  let slaAtRisk = 0;
  let activeWorkflows = 0;

  const taskRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS assigned,
       COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending,
       COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done','closed','cancelled')) AS overdue
     FROM "${schema}".tasks WHERE assignee_id = $1`,
    [userId],
  ), { tenantId, operation: 'workload_tasks' });

  if (taskRes.rows.length > 0) {
    assignedTasks = Number(taskRes.rows[0].assigned) || 0;
    pendingApprovals = Number(taskRes.rows[0].pending) || 0;
    overdueItems = Number(taskRes.rows[0].overdue) || 0;
  }

  const slaRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".sla_timers
     WHERE owner_user_id = $1 AND status = 'running'
       AND deadline_at < NOW() + INTERVAL '24 hours'
       AND deadline_at > NOW()`,
    [userId],
  ), { tenantId, operation: 'workload_sla' });
  slaAtRisk = Number(slaRes.rows[0]?.cnt) || 0;

  const wfRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".workflow_instances
     WHERE initiated_by = $1 AND status IN ('running','waiting')`,
    [userId],
  ), { tenantId, operation: 'workload_workflows' });
  activeWorkflows = Number(wfRes.rows[0]?.cnt) || 0;

  const totalLoad = assignedTasks + pendingApprovals + (overdueItems * 2) + (slaAtRisk * 3);
  const capacityScore = Math.max(0, 100 - totalLoad * 5);
  const utilizationPct = Math.min(100, totalLoad * 5);

  let recommendation: WorkloadRecommendation = 'available';
  if (utilizationPct > 90) recommendation = 'overloaded';
  else if (utilizationPct > 75) recommendation = 'redistribute';
  else if (utilizationPct > 50) recommendation = 'at_capacity';

  const snapshot: WorkloadSnapshot = {
    userId,
    snapshotAt: now,
    assignedTasks,
    pendingApprovals,
    overdueItems,
    slaAtRisk,
    activeWorkflows,
    capacityScore,
    utilizationPct,
    recommendation,
  };

  await swallowDefault(EC.FALLBACK_QUERY, undefined, safeQuery(
    `INSERT INTO "${schema}".workload_snapshots
       (user_id, assigned_tasks, pending_approvals, overdue_items, sla_at_risk,
        active_workflows, capacity_score, utilization_pct, recommendation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, assignedTasks, pendingApprovals, overdueItems, slaAtRisk,
     activeWorkflows, capacityScore, utilizationPct, recommendation],
  ), { tenantId, operation: 'store_workload_snapshot' });

  return snapshot;
}

export async function getLatestWorkload(tenantId: string, userId: string): Promise<WorkloadSnapshot | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".workload_snapshots
     WHERE user_id = $1 ORDER BY snapshot_at DESC LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    userId: r.user_id,
    snapshotAt: r.snapshot_at,
    assignedTasks: Number(r.assigned_tasks),
    pendingApprovals: Number(r.pending_approvals),
    overdueItems: Number(r.overdue_items),
    slaAtRisk: Number(r.sla_at_risk),
    activeWorkflows: Number(r.active_workflows),
    capacityScore: Number(r.capacity_score),
    utilizationPct: Number(r.utilization_pct),
    recommendation: r.recommendation,
  };
}

export async function computeBatchWorkloads(tenantId: string, userIds: string[]): Promise<WorkloadSnapshot[]> {
  const results: WorkloadSnapshot[] = [];
  for (let i = 0; i < userIds.length; i += BATCH_CONCURRENCY) {
    const batch = userIds.slice(i, i + BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(uid => computeWorkload(tenantId, uid)),
    );
    for (let j = 0; j < settled.length; j++) {
      const outcome = settled[j];
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        logger.warn(`[Workload] computeWorkload failed for user ${batch[j]} in tenant ${tenantId}: ${outcome.reason}`);
      }
    }
  }
  return results;
}
