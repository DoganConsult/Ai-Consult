// @ts-nocheck
// ============================================================================
// Shahin — SLA Performance Report Service
// Provides SLA compliance metrics, team-level breakdowns, priority analysis,
// breach trend data, and team workload heatmap.
// ============================================================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

// ── Types ──

export interface SlaPerformanceReport {
  tenant_id: string;
  period: { from: string; to: string };
  overall_metrics: OverallSlaMetrics;
  by_team: TeamSlaMetrics[];
  by_priority: PrioritySlaMetrics[];
  breach_trend: DailyBreachCount[];
}

export interface OverallSlaMetrics {
  total_tasks: number;
  completed_on_time: number;
  completed_late: number;
  still_open: number;
  breached: number;
  avg_resolution_hours: number;
  sla_compliance_rate: number;      // % completed on time
}

export interface TeamSlaMetrics {
  team_id: string;
  team_name: string;
  total_tasks: number;
  completed_on_time: number;
  breached: number;
  avg_resolution_hours: number;
  sla_compliance_rate: number;
  current_workload: number;         // open tasks right now
  busiest_member: string | null;
}

export interface PrioritySlaMetrics {
  priority: string;
  total: number;
  on_time: number;
  breached: number;
  avg_hours: number;
}

export interface DailyBreachCount {
  date: string;
  breach_count: number;
  warning_count: number;
}

export interface TeamWorkloadEntry {
  team_id: string;
  team_name: string;
  open_tasks: number;
  overdue_tasks: number;
  avg_age_hours: number;
  busiest_member: string | null;
  busiest_member_tasks: number;
  idle_members: string[];
}

// ── Public API ──

/**
 * Generate a comprehensive SLA performance report for the given tenant.
 * Default period is the last 30 days.
 */
export async function getSlaPerformanceReport(
  tenantId: string,
  opts?: { from?: string; to?: string; teamId?: string },
): Promise<SlaPerformanceReport> {
  const schema = tenantSchema(tenantId);

  // Resolve period defaults (last 30 days)
  const toDate = opts?.to || new Date().toISOString().slice(0, 10);
  const fromDate = opts?.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const teamFilter = opts?.teamId ? 'AND pt.team_id = $3' : '';
  const params: unknown[] = [fromDate, toDate];
  if (opts?.teamId) params.push(opts.teamId);

  // 1. Overall metrics
  const overallResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total_tasks: 0, completed_on_time: 0, completed_late: 0, still_open: 0, breached: 0, avg_resolution_hours: 0 }]), safeQuery(
    `SELECT
       COUNT(*)::int AS total_tasks,
       COUNT(*) FILTER (WHERE pt.status IN ('completed','done','closed') AND pt.breached_at IS NULL)::int AS completed_on_time,
       COUNT(*) FILTER (WHERE pt.status IN ('completed','done','closed') AND pt.breached_at IS NOT NULL)::int AS completed_late,
       COUNT(*) FILTER (WHERE pt.status NOT IN ('completed','done','closed','cancelled'))::int AS still_open,
       COUNT(*) FILTER (WHERE pt.breached_at IS NOT NULL)::int AS breached,
       COALESCE(AVG(
         CASE WHEN pt.completed_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (pt.completed_at - pt.created_at)) / 3600
         END
       ), 0)::float AS avg_resolution_hours
     FROM "${schema}".process_tasks pt
     WHERE pt.created_at >= $1::date AND pt.created_at <= ($2::date + INTERVAL '1 day')
       ${teamFilter}`,
    params,
  ), { tenantId: tenantId, operation: 'query process_tasks' });

  const ov = overallResult.rows[0] || {};
  const totalTasks = Number(ov.total_tasks) || 0;
  const completedOnTime = Number(ov.completed_on_time) || 0;
  const completedLate = Number(ov.completed_late) || 0;
  const totalCompleted = completedOnTime + completedLate;

  const overallMetrics: OverallSlaMetrics = {
    total_tasks: totalTasks,
    completed_on_time: completedOnTime,
    completed_late: completedLate,
    still_open: Number(ov.still_open) || 0,
    breached: Number(ov.breached) || 0,
    avg_resolution_hours: Math.round((Number(ov.avg_resolution_hours) || 0) * 100) / 100,
    sla_compliance_rate: totalCompleted > 0
      ? Math.round((completedOnTime / totalCompleted) * 100)
      : 100,
  };

  // 2. By team
  const teamResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       pt.team_id,
       COALESCE(t.team_name, t.name, pt.team_id) AS team_name,
       COUNT(*)::int AS total_tasks,
       COUNT(*) FILTER (WHERE pt.status IN ('completed','done','closed') AND pt.breached_at IS NULL)::int AS completed_on_time,
       COUNT(*) FILTER (WHERE pt.breached_at IS NOT NULL)::int AS breached,
       COALESCE(AVG(
         CASE WHEN pt.completed_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (pt.completed_at - pt.created_at)) / 3600
         END
       ), 0)::float AS avg_resolution_hours,
       COUNT(*) FILTER (WHERE pt.status NOT IN ('completed','done','closed','cancelled'))::int AS current_workload
     FROM "${schema}".process_tasks pt
     LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
     WHERE pt.created_at >= $1::date AND pt.created_at <= ($2::date + INTERVAL '1 day')
       AND pt.team_id IS NOT NULL
       ${teamFilter}
     GROUP BY pt.team_id, t.team_name, t.name
     ORDER BY breached DESC, total_tasks DESC`,
    params,
  ), { tenantId: tenantId, operation: 'query process_tasks' });

  const byTeam: TeamSlaMetrics[] = [];
  for (const r of teamResult.rows) {
    const tTotal = Number(r.total_tasks) || 0;
    const tOnTime = Number(r.completed_on_time) || 0;
    const tBreached = Number(r.breached) || 0;
    const tCompleted = tOnTime + tBreached;

    // Find busiest member for this team
    const busiestResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT assigned_to, COUNT(*)::int AS task_count
       FROM "${schema}".process_tasks
       WHERE team_id = $1 AND status NOT IN ('completed','done','closed','cancelled')
       GROUP BY assigned_to
       ORDER BY task_count DESC
       LIMIT 1`,
      [r.team_id],
    ), { tenantId: tenantId, operation: 'query process_tasks' });

    const busiest = busiestResult.rows[0];

    byTeam.push({
      team_id: r.team_id,
      team_name: r.team_name || r.team_id,
      total_tasks: tTotal,
      completed_on_time: tOnTime,
      breached: tBreached,
      avg_resolution_hours: Math.round((Number(r.avg_resolution_hours) || 0) * 100) / 100,
      sla_compliance_rate: tCompleted > 0
        ? Math.round((tOnTime / tCompleted) * 100)
        : 100,
      current_workload: Number(r.current_workload) || 0,
      busiest_member: busiest?.assigned_to || null,
    });
  }

  // 3. By priority
  const priorityResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       COALESCE(pt.priority, 'unset') AS priority,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE pt.status IN ('completed','done','closed') AND pt.breached_at IS NULL)::int AS on_time,
       COUNT(*) FILTER (WHERE pt.breached_at IS NOT NULL)::int AS breached,
       COALESCE(AVG(
         CASE WHEN pt.completed_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (pt.completed_at - pt.created_at)) / 3600
         END
       ), 0)::float AS avg_hours
     FROM "${schema}".process_tasks pt
     WHERE pt.created_at >= $1::date AND pt.created_at <= ($2::date + INTERVAL '1 day')
       ${teamFilter}
     GROUP BY COALESCE(pt.priority, 'unset')
     ORDER BY breached DESC`,
    params,
  ), { tenantId: tenantId, operation: 'query process_tasks' });

  const byPriority: PrioritySlaMetrics[] = priorityResult.rows.map((r: GenericRow) => ({
    priority: r.priority,
    total: Number(r.total) || 0,
    on_time: Number(r.on_time) || 0,
    breached: Number(r.breached) || 0,
    avg_hours: Math.round((Number(r.avg_hours) || 0) * 100) / 100,
  }));

  // 4. Breach trend (last 30 days grouped by date)
  const trendResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       d.day::date AS date,
       COUNT(pt.task_id) FILTER (WHERE pt.breached_at IS NOT NULL)::int AS breach_count,
       COUNT(pt.task_id) FILTER (WHERE pt.escalation_level >= 1 AND pt.breached_at IS NULL)::int AS warning_count
     FROM generate_series($1::date, $2::date, '1 day') AS d(day)
     LEFT JOIN "${schema}".process_tasks pt
       ON DATE(pt.breached_at) = d.day OR (pt.escalation_level >= 1 AND DATE(pt.updated_at) = d.day)
     GROUP BY d.day
     ORDER BY d.day ASC`,
    [fromDate, toDate],
  ), { tenantId: tenantId, operation: 'fallback query' });

  const breachTrend: DailyBreachCount[] = trendResult.rows.map((r: GenericRow) => ({
    date: r.date ? new Date(r.date).toISOString().slice(0, 10) : '',
    breach_count: Number(r.breach_count) || 0,
    warning_count: Number(r.warning_count) || 0,
  }));

  return {
    tenant_id: tenantId,
    period: { from: fromDate, to: toDate },
    overall_metrics: overallMetrics,
    by_team: byTeam,
    by_priority: byPriority,
    breach_trend: breachTrend,
  };
}

/**
 * Get a workload heatmap for all teams showing open/overdue tasks,
 * average age, busiest and idle members.
 */
export async function getTeamWorkloadHeatmap(
  tenantId: string,
): Promise<TeamWorkloadEntry[]> {
  const schema = tenantSchema(tenantId);

  // Get teams with open task stats
  const teamsResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       t.team_id,
       COALESCE(t.team_name, t.name) AS team_name,
       COUNT(pt.task_id) FILTER (WHERE pt.status NOT IN ('completed','done','closed','cancelled'))::int AS open_tasks,
       COUNT(pt.task_id) FILTER (WHERE pt.status NOT IN ('completed','done','closed','cancelled') AND (pt.breached_at IS NOT NULL OR pt.due_date < NOW()))::int AS overdue_tasks,
       COALESCE(AVG(
         CASE WHEN pt.status NOT IN ('completed','done','closed','cancelled')
           THEN EXTRACT(EPOCH FROM (NOW() - pt.created_at)) / 3600
         END
       ), 0)::float AS avg_age_hours
     FROM "${schema}".teams t
     LEFT JOIN "${schema}".process_tasks pt ON pt.team_id = t.team_id
     GROUP BY t.team_id, t.team_name, t.name
     ORDER BY open_tasks DESC`,
  ), { tenantId: tenantId, operation: 'query teams' });

  const entries: TeamWorkloadEntry[] = [];

  for (const r of teamsResult.rows) {
    const teamId = r.team_id;

    // Get member-level task counts for this team
    const memberResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT
         COALESCE(pt.assigned_to, tm.user_id) AS member_id,
         COUNT(pt.task_id) FILTER (WHERE pt.status NOT IN ('completed','done','closed','cancelled'))::int AS open_count
       FROM "${schema}".team_members tm
       LEFT JOIN "${schema}".process_tasks pt ON pt.assigned_to = tm.user_id AND pt.team_id = $1
         AND pt.status NOT IN ('completed','done','closed','cancelled')
       WHERE tm.team_id = $1
       GROUP BY COALESCE(pt.assigned_to, tm.user_id)
       ORDER BY open_count DESC`,
      [teamId],
    ), { tenantId: tenantId, operation: 'query team_members' });

    const busiestRow = memberResult.rows[0];
    const idleMembers = memberResult.rows
      .filter((m: any) => (Number(m.open_count) || 0) === 0 && m.member_id)
      .map((m: GenericRow) => m.member_id);

    entries.push({
      team_id: teamId,
      team_name: r.team_name || teamId,
      open_tasks: Number(r.open_tasks) || 0,
      overdue_tasks: Number(r.overdue_tasks) || 0,
      avg_age_hours: Math.round((Number(r.avg_age_hours) || 0) * 100) / 100,
      busiest_member: busiestRow?.member_id || null,
      busiest_member_tasks: Number(busiestRow?.open_count) || 0,
      idle_members: idleMembers,
    });
  }

  return entries;
}
