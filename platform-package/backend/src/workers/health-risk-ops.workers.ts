// ============================================
// Shahin GRC — Risk & Ops Health Workers
// Workers: riskScoreRecalculator, slaBreachDetector,
// auditScheduleMonitor, policyReviewDebtCalculator
// ============================================

import { safeQuery } from '../config/database/database';
import { forEachTenant, createNotification } from './worker-scheduler';
import type { TenantInfo, WorkerRunSummary } from './workspace-health-types';

// ===========================================================================
// Worker 3: Policy Review Debt Calculator (daily)
// ===========================================================================

export async function policyReviewDebtCalculator(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // Find policies past their review_cycle date
    const overduePolicies = await safeQuery(`
      SELECT policy_id, title, owner, status, next_review_date,
             EXTRACT(DAY FROM (NOW() - next_review_date)) AS days_overdue
      FROM "${tenant.schema}".policies
      WHERE status IN ('active', 'approved', 'published')
        AND next_review_date IS NOT NULL
        AND next_review_date < CURRENT_DATE
    `);

    processed = overduePolicies.rows.length;

    // Calculate review debt score:
    // Sum of days_overdue across all policies, normalized to 0-100 scale
    let totalDaysOverdue = 0;
    for (const p of overduePolicies.rows) {
      totalDaysOverdue += Math.max(0, Number(p.days_overdue) || 0);
    }

    // Get total policy count for normalization
    const totalPolicies = await safeQuery(`
      SELECT COUNT(*) AS cnt FROM "${tenant.schema}".policies
      WHERE status IN ('active', 'approved', 'published')
    `);
    const policyCount = Number(totalPolicies.rows[0]?.cnt) || 1;

    // Debt score: (overdue policies / total policies) * 100, capped at 100
    // Also weighted by average days overdue
    const overdueRatio = overduePolicies.rows.length / policyCount;
    const avgDaysOverdue = overduePolicies.rows.length > 0
      ? totalDaysOverdue / overduePolicies.rows.length
      : 0;
    // Weight: ratio (0-1) * 70 + min(avgDays/90, 1) * 30 => 0-100 scale
    const debtScore = Math.min(
      100,
      Math.round(overdueRatio * 70 + Math.min(avgDaysOverdue / 90, 1) * 30)
    );

    // Update workspace_profile.settings with latest debt score
    await safeQuery(
      `UPDATE "${tenant.schema}".workspace_profile
       SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = (SELECT id FROM "${tenant.schema}".workspace_profile LIMIT 1)`,
      [JSON.stringify({
        policy_review_debt_score: debtScore,
        policy_review_debt_overdue_count: overduePolicies.rows.length,
        policy_review_debt_total_policies: policyCount,
        policy_review_debt_avg_days_overdue: Math.round(avgDaysOverdue),
        policy_review_debt_updated_at: new Date().toISOString(),
      })]
    );
    fixed++;

    return {
      processed,
      fixed,
      errors,
    };
  });
}

// ===========================================================================
// Worker 4: Risk Score Recalculator (every 4 hours)
// ===========================================================================

export async function riskScoreRecalculator(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // Recalculate inherent risk scores: likelihood * impact
    const risks = await safeQuery(`
      SELECT risk_id, title, owner, likelihood, impact,
             inherent_risk_score, residual_risk_score,
             residual_likelihood, residual_impact
      FROM "${tenant.schema}".risks
      WHERE status = 'active'
    `);

    for (const risk of risks.rows) {
      processed++;

      const likelihood = Number(risk.likelihood) || 0;
      const impact = Number(risk.impact) || 0;
      const calculatedInherent = likelihood * impact;

      const residualLikelihood = Number(risk.residual_likelihood) || likelihood;
      const residualImpact = Number(risk.residual_impact) || impact;
      const calculatedResidual = residualLikelihood * residualImpact;

      const currentInherent = Number(risk.inherent_risk_score) || 0;
      const currentResidual = Number(risk.residual_risk_score) || 0;

      // Detect anomalies: sudden jump > 50% from previous value
      const inherentDrift = currentInherent > 0
        ? Math.abs(calculatedInherent - currentInherent) / currentInherent
        : 0;
      const residualDrift = currentResidual > 0
        ? Math.abs(calculatedResidual - currentResidual) / currentResidual
        : 0;

      // Update if scores differ
      if (calculatedInherent !== currentInherent || calculatedResidual !== currentResidual) {
        await safeQuery(
          `UPDATE "${tenant.schema}".risks
           SET inherent_risk_score = $2::int,
               residual_risk_score = $3::int,
               updated_at = NOW()
           WHERE risk_id = $1`,
          [risk.risk_id, calculatedInherent, calculatedResidual]
        );
        fixed++;
      }

      // Notify on anomalous jumps (>50% change)
      if ((inherentDrift > 0.5 || residualDrift > 0.5) && risk.owner) {
        await createNotification(
          tenant.schema, String(risk.owner), 'risk_score_anomaly',
          'Risk score anomaly detected',
          `Risk "${risk.title}" had a significant score change (inherent: ${currentInherent} -> ${calculatedInherent}, residual: ${currentResidual} -> ${calculatedResidual}).`,
          `/risk/${risk.risk_id}`
        );
      }
    }

    // Update risk heatmap data in workspace_profile
    const heatmapData = await safeQuery(`
      SELECT
        COALESCE(likelihood, 0) AS likelihood,
        COALESCE(impact, 0) AS impact,
        COUNT(*) AS count
      FROM "${tenant.schema}".risks
      WHERE status = 'active'
      GROUP BY likelihood, impact
    `);

    await safeQuery(
      `UPDATE "${tenant.schema}".workspace_profile
       SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = (SELECT id FROM "${tenant.schema}".workspace_profile LIMIT 1)`,
      [JSON.stringify({
        risk_heatmap_data: heatmapData.rows,
        risk_heatmap_updated_at: new Date().toISOString(),
      })]
    );

    return { processed, fixed, errors };
  });
}

// ===========================================================================
// Worker 6: SLA Breach Detector (every hour)
// ===========================================================================

export async function slaBreachDetector(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // GAP 1: Read business_days from workspace_profile.settings for SLA-aware breach detection
    let businessDaysOnly = false;
    let businessDays: string[] = [];
    try {
      const wpResult = await safeQuery(
        `SELECT settings->>'sla_business_days_only' AS bdo, settings->'business_days' AS bd
         FROM "${tenant.schema}".workspace_profile LIMIT 1`
      );
      if (wpResult.rows[0]) {
        businessDaysOnly = wpResult.rows[0].bdo === 'true';
        const bd = wpResult.rows[0].bd;
        if (bd && Array.isArray(bd)) {
          businessDays = bd;
        } else if (typeof bd === 'string') {
          try { businessDays = JSON.parse(bd); } catch { /* ignore */ }
        }
      }
    } catch { /* workspace_profile may not exist — proceed without business days filtering */ }

    // Helper: check if current day is a business day
    const dayMap: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
    const todayIsBusinessDay = !businessDaysOnly || businessDays.length === 0
      || businessDays.includes(dayMap[new Date().getDay()]);

    // If sla_business_days_only is true and today is NOT a business day, skip breach detection
    if (businessDaysOnly && businessDays.length > 0 && !todayIsBusinessDay) {
      return { processed: 0, fixed: 0, errors: [] };
    }

    // Check action_items with due dates that are breached
    const breachedItems = await safeQuery(`
      SELECT item_id, title, source_type, source_id, assigned_to, deadline, priority, type
      FROM "${tenant.schema}".action_items
      WHERE status IN ('open', 'in_progress')
        AND deadline IS NOT NULL
        AND deadline < NOW()
    `);

    for (const item of breachedItems.rows) {
      processed++;

      // Mark as SLA breached if not already escalated
      await safeQuery(
        `UPDATE "${tenant.schema}".action_items
         SET priority = CASE WHEN priority = 'critical' THEN 'critical' ELSE 'critical' END,
             status = CASE WHEN status = 'open' THEN 'escalated' ELSE status END,
             updated_at = NOW()
         WHERE item_id = $1 AND status != 'escalated'`,
        [item.item_id]
      );

      // Create notification for the assigned person
      if (item.assigned_to) {
        await createNotification(
          tenant.schema, String(item.assigned_to), 'sla_breach',
          'SLA breach: Action overdue',
          `Action "${item.title}" has breached its SLA deadline.`,
          `/actions/${item.item_id}`
        );
        fixed++;
      }
    }

    // Check evidence_tasks with due dates
    const breachedEvidence = await safeQuery(`
      SELECT et.task_id, et.control_id, et.due_at, et.assigned_role,
             c.title AS control_title, c.owner
      FROM "${tenant.schema}".evidence_tasks et
      LEFT JOIN "${tenant.schema}".controls c ON c.control_id = et.control_id
      WHERE et.status IN ('open', 'pending')
        AND et.due_at IS NOT NULL
        AND et.due_at < NOW() - interval '24 hours'
    `);

    for (const task of breachedEvidence.rows) {
      processed++;

      if (task.owner) {
        await createNotification(
          tenant.schema, String(task.owner), 'sla_breach_evidence',
          'SLA breach: Evidence collection overdue',
          `Evidence collection for control "${task.control_title ?? 'Unknown'}" has breached SLA.`,
          `/evidence/tasks/${task.task_id}`
        );
        fixed++;
      }
    }

    // Check remediation_tasks with due dates
    const breachedRemediation = await safeQuery(`
      SELECT task_id, title, assigned_to, due_date
      FROM "${tenant.schema}".remediation_tasks
      WHERE status IN ('open', 'in_progress')
        AND due_date IS NOT NULL
        AND due_date < NOW()
    `);

    for (const task of breachedRemediation.rows) {
      processed++;

      if (task.assigned_to) {
        await createNotification(
          tenant.schema, String(task.assigned_to), 'sla_breach_remediation',
          'SLA breach: Remediation overdue',
          `Remediation task "${task.title}" has breached its SLA deadline.`,
          `/remediation/${task.task_id}`
        );
        fixed++;
      }
    }

    return { processed, fixed, errors };
  });
}

// ===========================================================================
// Worker 9: Audit Schedule Monitor (daily)
// ===========================================================================

export async function auditScheduleMonitor(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // Check upcoming audit deadlines (30/14/7 days before)
    const reminderIntervals = [
      { days: 30, label: '30 days' },
      { days: 14, label: '14 days' },
      { days: 7, label: '7 days' },
    ];

    for (const interval of reminderIntervals) {
      const upcomingAudits = await safeQuery(`
        SELECT audit_id, title, audit_type, lead_auditor, start_date, end_date, status
        FROM "${tenant.schema}".audits
        WHERE status IN ('planned', 'scheduled', 'upcoming')
          AND start_date IS NOT NULL
          AND start_date::date = (CURRENT_DATE + ($1::text || ' days')::interval)::date
      `, [String(interval.days)]);

      for (const audit of upcomingAudits.rows) {
        processed++;

        // Send reminder to lead auditor
        if (audit.lead_auditor) {
          await createNotification(
            tenant.schema, String(audit.lead_auditor), 'audit_reminder',
            `Audit in ${interval.label}`,
            `Audit "${audit.title}" is scheduled to begin in ${interval.label} (${audit.start_date}).`,
            `/audit/${audit.audit_id}`
          );
          fixed++;
        }

        // Auto-create audit preparation tasks (only for 30-day reminder)
        if (interval.days === 30) {
          const prepTasks = [
            'Review audit scope and objectives',
            'Gather required documentation',
            'Schedule interviews with key stakeholders',
            'Verify control evidence is up to date',
          ];

          for (const taskTitle of prepTasks) {
            await safeQuery(
              `INSERT INTO "${tenant.schema}".action_items
               (item_id, title, source_type, source_id, assigned_to, deadline, reminder_schedule, status, priority, type)
               SELECT gen_random_uuid(), $1::text, 'audit', $2::text, $3::text,
                      ($4::date - interval '7 days'), '{}'::jsonb, 'open', 'medium', 'audit_preparation'
               WHERE NOT EXISTS (
                 SELECT 1 FROM "${tenant.schema}".action_items
                 WHERE source_type = 'audit' AND source_id = $2::text
                   AND title = $1::text AND status IN ('open', 'in_progress')
               )`,
              [taskTitle, audit.audit_id, audit.lead_auditor ?? null, audit.start_date]
            );
          }
          fixed++;
        }
      }
    }

    return { processed, fixed, errors };
  });
}
