// ============================================
// Shahin GRC — Compliance Health Workers
// Workers: controlHealthMonitor, evidenceFreshnessMonitor,
// compliancePostureCalculator, ccmEngineCycle
// ============================================

import { randomUUID } from 'crypto';
import { safeQuery } from '../config/database/database';
import { forEachTenant, createNotification } from './worker-scheduler';
import type { TenantInfo, WorkerRunSummary } from './workspace-health-types';

// ===========================================================================
// Worker 1: Control Health Monitor (every 6 hours)
// ===========================================================================

export async function controlHealthMonitor(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // 1. Controls without test results older than their test_frequency
    const overdueControls = await safeQuery(`
      SELECT c.control_id, c.title, c.owner, c.test_frequency, c.test_status,
             MAX(tr.tested_at) AS last_tested
      FROM "${tenant.schema}".controls c
      LEFT JOIN "${tenant.schema}".control_test_results tr
        ON tr.control_id = c.control_id
      WHERE c.status = 'active'
        AND c.test_frequency IS NOT NULL
      GROUP BY c.control_id, c.title, c.owner, c.test_frequency, c.test_status
      HAVING MAX(tr.tested_at) IS NULL
         OR MAX(tr.tested_at) < NOW() - (c.test_frequency || ' days')::interval
    `);

    for (const ctrl of overdueControls.rows) {
      processed++;

      // Update test_status to overdue
      if (ctrl.test_status !== 'overdue') {
        await safeQuery(
          `UPDATE "${tenant.schema}".controls SET test_status = 'overdue', updated_at = NOW() WHERE control_id = $1`,
          [ctrl.control_id]
        );
        fixed++;
      }

      // Auto-create control_action for overdue controls
      await safeQuery(
        `INSERT INTO "${tenant.schema}".action_items
         (item_id, title, source_type, source_id, assigned_to, deadline, reminder_schedule, status, priority, type)
         SELECT gen_random_uuid(), $1::text, 'control', $2::text, $3::text,
                NOW() + interval '7 days', '{}'::jsonb, 'open', 'high', 'control_test_overdue'
         WHERE NOT EXISTS (
           SELECT 1 FROM "${tenant.schema}".action_items
           WHERE source_type = 'control' AND source_id = $2::text
             AND type = 'control_test_overdue' AND status IN ('open', 'in_progress')
         )`,
        [`Control test overdue: ${ctrl.title}`, ctrl.control_id, ctrl.owner ?? null]
      );
    }

    // 2. Controls with failed tests that have no remediation actions
    const failedNoRemediation = await safeQuery(`
      SELECT DISTINCT c.control_id, c.title, c.owner
      FROM "${tenant.schema}".controls c
      JOIN "${tenant.schema}".control_test_results tr ON tr.control_id = c.control_id
      WHERE c.status = 'active'
        AND tr.result = 'fail'
        AND tr.tested_at = (
          SELECT MAX(tr2.tested_at) FROM "${tenant.schema}".control_test_results tr2
          WHERE tr2.control_id = c.control_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM "${tenant.schema}".action_items ai
          WHERE ai.source_type = 'control' AND ai.source_id = c.control_id::text
            AND ai.type IN ('remediation', 'control_remediation')
            AND ai.status IN ('open', 'in_progress')
        )
    `);

    for (const ctrl of failedNoRemediation.rows) {
      processed++;
      await safeQuery(
        `INSERT INTO "${tenant.schema}".action_items
         (item_id, title, source_type, source_id, assigned_to, deadline, reminder_schedule, status, priority, type)
         VALUES (gen_random_uuid(), $1::text, 'control', $2::text, $3::text,
                 NOW() + interval '14 days', '{}'::jsonb, 'open', 'high', 'control_remediation')`,
        [`Remediation needed: ${ctrl.title} (failed test)`, ctrl.control_id, ctrl.owner ?? null]
      );
      fixed++;
    }

    // 3. Controls approaching SLA deadlines (within 3 days)
    const approachingSla = await safeQuery(`
      SELECT c.control_id, c.title, c.owner, c.sla_deadline
      FROM "${tenant.schema}".controls c
      WHERE c.status = 'active'
        AND c.sla_deadline IS NOT NULL
        AND c.sla_deadline BETWEEN NOW() AND NOW() + interval '3 days'
    `);

    for (const ctrl of approachingSla.rows) {
      processed++;
      if (ctrl.owner) {
        await createNotification(
          tenant.schema, String(ctrl.owner), 'control_sla_approaching',
          'Control SLA deadline approaching',
          `Control "${ctrl.title}" SLA deadline is within 3 days.`,
          `/controls/${ctrl.control_id}`
        );
      }
    }

    return { processed, fixed, errors };
  });
}

// ===========================================================================
// Worker 2: Evidence Freshness Monitor (every 12 hours)
// ===========================================================================

export async function evidenceFreshnessMonitor(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // Evidence tasks past their collection deadline
    const overdueTasks = await safeQuery(`
      SELECT et.task_id, et.control_id, et.assigned_role, et.due_at, et.status,
             c.title AS control_title, c.owner
      FROM "${tenant.schema}".evidence_tasks et
      LEFT JOIN "${tenant.schema}".controls c ON c.control_id = et.control_id
      WHERE et.status IN ('open', 'pending')
        AND et.due_at IS NOT NULL
        AND et.due_at < NOW()
    `);

    for (const task of overdueTasks.rows) {
      processed++;

      // Update status to overdue
      await safeQuery(
        `UPDATE "${tenant.schema}".evidence_tasks SET status = 'overdue', updated_at = NOW() WHERE task_id = $1 AND status != 'overdue'`,
        [task.task_id]
      );

      // Auto-escalate to assigned owner via notification
      if (task.owner) {
        await createNotification(
          tenant.schema, String(task.owner), 'evidence_overdue',
          'Evidence collection overdue',
          `Evidence task for control "${task.control_title ?? 'Unknown'}" is past its collection deadline.`,
          `/evidence/tasks/${task.task_id}`
        );
        fixed++;
      }
    }

    // Stale evidence — not refreshed within cadence period
    const staleEvidence = await safeQuery(`
      SELECT e.evidence_id, e.control_id, e.title, e.expiry_date, e.uploaded_by,
             c.title AS control_title, c.owner
      FROM "${tenant.schema}".evidence e
      LEFT JOIN "${tenant.schema}".controls c ON c.control_id = e.control_id
      WHERE e.expiry_date IS NOT NULL
        AND e.expiry_date < NOW()
        AND e.status != 'expired'
    `);

    for (const ev of staleEvidence.rows) {
      processed++;

      // Mark as expired
      await safeQuery(
        `UPDATE "${tenant.schema}".evidence SET status = 'expired', updated_at = NOW() WHERE evidence_id = $1 AND status != 'expired'`,
        [ev.evidence_id]
      );

      if (ev.owner) {
        await createNotification(
          tenant.schema, String(ev.owner), 'evidence_stale',
          'Evidence has expired',
          `Evidence "${ev.title ?? 'Untitled'}" for control "${ev.control_title ?? 'Unknown'}" has expired and needs refreshing.`,
          `/evidence/${ev.evidence_id}`
        );
        fixed++;
      }
    }

    return { processed, fixed, errors };
  });
}

// ===========================================================================
// Worker 5: Compliance Posture Calculator (every 6 hours)
// ===========================================================================

export async function compliancePostureCalculator(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // Calculate compliance percentage per framework
    const frameworks = await safeQuery(`
      SELECT framework_id, name, status
      FROM "${tenant.schema}".frameworks
      WHERE status IN ('active', 'in_progress')
    `);

    const frameworkScores: Array<{
      frameworkId: string;
      name: string;
      totalControls: number;
      compliantControls: number;
      compliancePercent: number;
    }> = [];

    for (const fw of frameworks.rows) {
      processed++;

      const controlStats = await safeQuery(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE test_status IN ('passed', 'compliant', 'effective')) AS compliant
        FROM "${tenant.schema}".controls
        WHERE framework_id = $1 AND status = 'active'
      `, [fw.framework_id]);

      const total = Number(controlStats.rows[0]?.total) || 0;
      const compliant = Number(controlStats.rows[0]?.compliant) || 0;
      const percent = total > 0 ? Math.round((compliant / total) * 100) : 0;

      frameworkScores.push({
        frameworkId: fw.framework_id,
        name: fw.name,
        totalControls: total,
        compliantControls: compliant,
        compliancePercent: percent,
      });
    }

    // Calculate overall compliance across all frameworks
    const totalControls = frameworkScores.reduce((sum, f) => sum + f.totalControls, 0);
    const totalCompliant = frameworkScores.reduce((sum, f) => sum + f.compliantControls, 0);
    const overallPercent = totalControls > 0
      ? Math.round((totalCompliant / totalControls) * 100)
      : 0;

    // Detect compliance drift — compare against stored previous value
    const previousSettings = await safeQuery(`
      SELECT settings FROM "${tenant.schema}".workspace_profile LIMIT 1
    `);
    const prevScore = Number(previousSettings.rows[0]?.settings?.compliance_overall_percent) || 0;
    const drift = prevScore > 0 ? overallPercent - prevScore : 0;

    // Update dashboard KPIs in workspace_profile
    await safeQuery(
      `UPDATE "${tenant.schema}".workspace_profile
       SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = (SELECT id FROM "${tenant.schema}".workspace_profile LIMIT 1)`,
      [JSON.stringify({
        compliance_overall_percent: overallPercent,
        compliance_framework_scores: frameworkScores,
        compliance_total_controls: totalControls,
        compliance_compliant_controls: totalCompliant,
        compliance_drift: drift,
        compliance_posture_updated_at: new Date().toISOString(),
      })]
    );
    fixed++;

    // Notify on significant drift (>5% drop)
    if (drift < -5) {
      // Get workspace admins to notify
      const admins = await safeQuery(`
        SELECT user_id FROM "${tenant.schema}".team_members
        WHERE role IN ('admin', 'owner', 'grc_manager')
          AND status = 'active'
        LIMIT 5
      `);

      for (const admin of admins.rows) {
        await createNotification(
          tenant.schema, String(admin.user_id), 'compliance_drift',
          'Compliance posture declining',
          `Overall compliance dropped from ${prevScore}% to ${overallPercent}% (${drift}% change).`,
          '/dashboard'
        );
      }
    }

    return { processed, fixed, errors };
  });
}

// ===========================================================================
// Worker 10: CCM Engine Cycle (every 4 hours)
// ===========================================================================

export async function ccmEngineCycle(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // Continuous Compliance Monitoring — run automated checks for active controls
    const activeControls = await safeQuery(`
      SELECT c.control_id, c.title, c.owner, c.test_status, c.test_frequency,
             c.monitoring_status, c.automation_level,
             MAX(tr.tested_at) AS last_tested
      FROM "${tenant.schema}".controls c
      LEFT JOIN "${tenant.schema}".control_test_results tr
        ON tr.control_id = c.control_id
      WHERE c.status = 'active'
      GROUP BY c.control_id, c.title, c.owner, c.test_status, c.test_frequency,
               c.monitoring_status, c.automation_level
    `);

    const cycleId = randomUUID();
    let controlsEvaluated = 0;
    let staleControls = 0;
    let escalations = 0;

    for (const ctrl of activeControls.rows) {
      processed++;
      controlsEvaluated++;

      // Determine if control needs attention
      const lastTested = ctrl.last_tested ? new Date(ctrl.last_tested) : null;
      const frequency = Number(ctrl.test_frequency) || 90; // Default 90 days
      const now = new Date();

      let needsAttention = false;

      if (!lastTested) {
        needsAttention = true;
        staleControls++;
      } else {
        const daysSinceTest = (now.getTime() - lastTested.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceTest > frequency) {
          needsAttention = true;
          staleControls++;
        }
      }

      // Update monitoring_status
      const newStatus = needsAttention ? 'attention_needed' : 'monitored';
      if (ctrl.monitoring_status !== newStatus) {
        await safeQuery(
          `UPDATE "${tenant.schema}".controls
           SET monitoring_status = $2, updated_at = NOW()
           WHERE control_id = $1`,
          [ctrl.control_id, newStatus]
        );
        fixed++;
      }

      // Check for evidence coverage
      const evidenceCoverage = await safeQuery(`
        SELECT COUNT(*) AS cnt,
               COUNT(*) FILTER (WHERE expiry_date IS NULL OR expiry_date >= CURRENT_DATE) AS valid_cnt
        FROM "${tenant.schema}".evidence
        WHERE control_id = $1
      `, [ctrl.control_id]);

      const totalEvidence = Number(evidenceCoverage.rows[0]?.cnt) || 0;
      const validEvidence = Number(evidenceCoverage.rows[0]?.valid_cnt) || 0;

      if (totalEvidence > 0 && validEvidence === 0 && ctrl.owner) {
        // All evidence expired — escalate
        await createNotification(
          tenant.schema, String(ctrl.owner), 'ccm_all_evidence_expired',
          'All evidence expired for control',
          `Control "${ctrl.title}" has no valid evidence. All ${totalEvidence} evidence items have expired.`,
          `/controls/${ctrl.control_id}`
        );
        escalations++;
      }
    }

    // Log CCM cycle results
    await safeQuery(
      `INSERT INTO "${tenant.schema}".ccm_cycle_log
       (cycle_id, controls_evaluated, stale_controls, escalations_triggered, risk_recalculated, cycle_ms)
       VALUES ($1::uuid, $2::int, $3::int, $4::int, 0, 0)`,
      [cycleId, controlsEvaluated, staleControls, escalations]
    );

    return { processed, fixed, errors };
  });
}
