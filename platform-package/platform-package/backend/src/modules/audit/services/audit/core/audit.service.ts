// @ts-nocheck
// ============================================
// Shahin — Audit Module Service
// Uses real dedicated tables from migration 041:
//   audits, audit_scopes, findings,
//   finding_root_causes, finding_impacts,
//   remediation_plans, closure_reviews
// ============================================

import { v4 as uuid } from "uuid";
import { emptyResult, safeQuery, tenantSchema } from "../../../../../config/database";
import { eventBus } from "../../../../platform/services/event/event-bus.service";
import { getFirstRow } from '../../../../../utils/db-utils';
import type { GenericRow } from '../../../../../types/db-rows.types';
import { swallowDefault, EC , catchHandler } from '../../../../../utils/resilient-catch';
import { FINDING_STATUSES, AUDIT_FINDING_SEVERITIES, AUDIT_FINDING_TYPES } from '../../../data/audit-constants';

// ── Overview KPIs ───────────────────────────────────────────────────

export async function getAuditOverview(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);

  const [audits, findings, capa, closures, linkedRisks, complianceGaps, auditReadiness, overdueFindings] = await Promise.all([
    safeQuery(`SELECT status, COUNT(*)::int AS c FROM "${s}".audits WHERE deleted_at IS NULL GROUP BY status`),
    safeQuery(`SELECT status, severity, COUNT(*)::int AS c FROM "${s}".findings WHERE deleted_at IS NULL GROUP BY status, severity`),
    safeQuery(`SELECT status, COUNT(*)::int AS c FROM "${s}".remediation_plans WHERE deleted_at IS NULL GROUP BY status`),
    safeQuery(`SELECT outcome, COUNT(*)::int AS c FROM "${s}".closure_reviews WHERE deleted_at IS NULL GROUP BY outcome`),

    // Cross-module: risks linked to audit findings
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS c FROM "${s}".risks WHERE risk_source = 'audit_finding' AND deleted_at IS NULL`
    ), { tenantId: tenantId, operation: 'query remediation_plans' }),

    // Cross-module: findings linked to compliance violations
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS c FROM "${s}".findings WHERE linked_violation_id IS NOT NULL AND deleted_at IS NULL`
    ), { tenantId: tenantId, operation: 'query closure_reviews' }),

    // Cross-module: audit readiness — controls with evidence vs total controls
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total_controls: 0, ready_controls: 0 }]), safeQuery(
      `SELECT
         COUNT(*)::int AS total_controls,
         COUNT(DISTINCT e.control_id)::int AS ready_controls
       FROM "${s}".controls c
       LEFT JOIN "${s}".evidence e ON e.control_id = c.control_id AND e.deleted_at IS NULL
       WHERE c.deleted_at IS NULL`
    ), { tenantId: tenantId, operation: 'query findings' }),

    // Cross-module: overdue findings (open > 90 days)
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS c FROM "${s}".findings
       WHERE status != 'closed' AND deleted_at IS NULL
         AND created_at < NOW() - INTERVAL '90 days'`
    ), { tenantId: tenantId, operation: 'query controls' }),
  ]);

  const auditsByStatus: Record<string, number> = {};
  for (const r of audits.rows) auditsByStatus[r.status] = r.c;

  const findingsByStatus: Record<string, number> = {};
  const findingsBySeverity: Record<string, number> = {};
  let totalFindings = 0;
  for (const r of findings.rows) {
    findingsByStatus[r.status] = (findingsByStatus[r.status] || 0) + r.c;
    findingsBySeverity[r.severity] = (findingsBySeverity[r.severity] || 0) + r.c;
    totalFindings += r.c;
  }

  const capaByStatus: Record<string, number> = {};
  for (const r of capa.rows) capaByStatus[r.status] = r.c;

  const closuresByOutcome: Record<string, number> = {};
  for (const r of closures.rows) closuresByOutcome[r.outcome] = r.c;

  const closed = closuresByOutcome['closed'] || 0;
  const totalClosures = closures.rows.reduce((sum: number, r: any) => sum + r.c, 0);
  const closureRate = totalClosures > 0 ? Math.round((closed / totalClosures) * 100) : 0;

  // Cross-module aggregations
  const readyControls = getFirstRow(auditReadiness)?.ready_controls ?? 0;
  const totalControls = getFirstRow(auditReadiness)?.total_controls ?? 0;
  const readinessPct = totalControls > 0 ? Math.round((readyControls / totalControls) * 100) : 0;

  return {
    activeAudits: auditsByStatus['in_progress'] || 0,
    plannedAudits: auditsByStatus['planned'] || 0,
    completedAudits: auditsByStatus['completed'] || 0,
    totalFindings,
    openFindings: findingsByStatus['open'] || 0,
    inRemediationFindings: findingsByStatus['in_remediation'] || 0,
    closedFindings: findingsByStatus['closed'] || 0,
    findingsBySeverity,
    findingsByStatus,
    capaByStatus,
    closureRate,
    closuresByOutcome,
    crossModule: {
      findingsLinkedToRisks: getFirstRow(linkedRisks)?.c ?? 0,
      findingsLinkedToCompliance: getFirstRow(complianceGaps)?.c ?? 0,
      overdueFindings: getFirstRow(overdueFindings)?.c ?? 0,
      auditReadiness: { readyControls, totalControls, readinessPct },
    },
  };
}

// ── Engagements (audits table) ──────────────────────────────────────

export async function getEngagements(tenantId: string, scopeUser?: { userId: string; role: string; isSuperAdmin?: boolean; permissions?: string[] }): Promise<any> {
  const s = tenantSchema(tenantId);
  const hasFullScope = scopeUser?.isSuperAdmin === true || (scopeUser?.permissions ?? []).includes('audit.record.read_all');
  if (scopeUser && !hasFullScope) {
    const result = await safeQuery(
      `SELECT a.*,
         (SELECT COUNT(*)::int FROM "${s}".findings f WHERE f.source_type = 'audit' AND f.source_id = a.audit_id::text AND f.deleted_at IS NULL) AS finding_count
       FROM "${s}".audits a
       WHERE a.deleted_at IS NULL AND (a.created_by = $1 OR a.lead_auditor = $1)
       ORDER BY a.created_at DESC`,
      [scopeUser.userId]
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT a.*,
       (SELECT COUNT(*)::int FROM "${s}".findings f WHERE f.source_type = 'audit' AND f.source_id = a.audit_id::text AND f.deleted_at IS NULL) AS finding_count
     FROM "${s}".audits a
     WHERE a.deleted_at IS NULL
     ORDER BY a.created_at DESC`
  );
  return result.rows;
}

export async function getEngagementById(tenantId: string, auditId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const [audit, scopes, findingsRes] = await Promise.all([
    safeQuery(`SELECT * FROM "${s}".audits WHERE audit_id = $1 AND deleted_at IS NULL`, [auditId]),
    safeQuery(`SELECT * FROM "${s}".audit_scopes WHERE audit_id = $1 AND deleted_at IS NULL`, [auditId]),
    safeQuery(`SELECT * FROM "${s}".findings WHERE source_type = 'audit' AND source_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`, [auditId]),
  ]);
  if (!getFirstRow(audit)) return null;
  return { ...getFirstRow(audit), scopes: scopes.rows, findings: findingsRes.rows };
}

export async function createEngagement(tenantId: string, data: {
  title: string; description?: string; audit_type: string; scope?: string;
  lead_auditor_id?: string; planned_start?: string; planned_end?: string; methodology?: string;
}) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${s}".audits (title, description, audit_type, scope, lead_auditor_id, planned_start, planned_end, methodology)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.title, data.description || null, data.audit_type, data.scope || null,
     data.lead_auditor_id || null, data.planned_start || null, data.planned_end || null, data.methodology || null]
  );
  return getFirstRow(result);
}

export async function updateEngagement(tenantId: string, auditId: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);
  const allowed = ['title', 'description', 'audit_type', 'scope', 'lead_auditor_id',
    'planned_start', 'planned_end', 'actual_start', 'actual_end', 'methodology', 'conclusion'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => data[c]);
  const result = await safeQuery(
    `UPDATE "${s}".audits SET ${sets.join(', ')}, updated_at = NOW() WHERE audit_id = $1 AND deleted_at IS NULL RETURNING *`,
    [auditId, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("Engagement not found");
  return getFirstRow(result);
}

export async function updateEngagementStatus(tenantId: string, auditId: string, status: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const valid = ['planned', 'in_progress', 'completed', 'cancelled'];
  if (!valid.includes(status)) throw new Error(`Invalid status. Must be: ${valid.join(', ')}`);
  const extras: string[] = [];
  if (status === 'in_progress') extras.push(`, actual_start = COALESCE(actual_start, CURRENT_DATE)`);
  if (status === 'completed') extras.push(`, actual_end = COALESCE(actual_end, CURRENT_DATE)`);
  const result = await safeQuery(
    `UPDATE "${s}".audits SET status = $1${extras.join('')}, updated_at = NOW() WHERE audit_id = $2 AND deleted_at IS NULL RETURNING *`,
    [status, auditId]
  );
  if (!getFirstRow(result)) throw new Error("Engagement not found");

  // EventBus: audit.status_changed / audit.completed
  try {
    const evtType = status === 'completed' ? 'audit.completed' : 'audit.status_changed';
    await eventBus.publish({ eventType: evtType, tenantId, sourceService: 'audit', entityType: 'audit', entityId: auditId, severity: status === 'completed' ? 'info' : 'info', payload: { title: getFirstRow(result)?.title, status, auditType: getFirstRow(result)?.audit_type } });
  } catch { /* best-effort */ }

  return getFirstRow(result);
}

export async function deleteEngagement(tenantId: string, auditId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".audits SET deleted_at = NOW(), updated_at = NOW() WHERE audit_id = $1 AND deleted_at IS NULL RETURNING audit_id`,
    [auditId]
  );
  return result.rows.length > 0;
}

// ── Audit Plans (subset of audits with status='planned') ────────────

export async function getAuditPlans(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audits WHERE deleted_at IS NULL ORDER BY planned_start ASC NULLS LAST, created_at DESC`
  );
  return result.rows;
}

export async function getAuditPlanById(tenantId: string, planId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audits WHERE audit_id = $1 AND deleted_at IS NULL`, [planId]
  );
  return getFirstRow(result) || null;
}

export async function createAuditPlan(tenantId: string, data: {
  title: string; audit_type?: string; scope?: string;
  lead_auditor_id?: string; planned_start?: string; planned_end?: string;
  createdBy?: string;
}) {
  return createEngagement(tenantId, {
    title: data.title,
    audit_type: data.audit_type || 'internal',
    scope: data.scope,
    lead_auditor_id: data.lead_auditor_id,
    planned_start: data.planned_start,
    planned_end: data.planned_end,
  });
}

export async function updateAuditPlanStatus(tenantId: string, planId: string, status: string): Promise<any> {
  return updateEngagementStatus(tenantId, planId, status);
}

export async function updateAuditPlan(tenantId: string, planId: string, data: Record<string, any>): Promise<any> {
  return updateEngagement(tenantId, planId, data);
}

export async function deleteAuditPlan(tenantId: string, planId: string): Promise<any> {
  return deleteEngagement(tenantId, planId);
}

// ── Findings ────────────────────────────────────────────────────────

export async function getFindings(tenantId: string, auditId?: string): Promise<any> {
  const s = tenantSchema(tenantId);
  if (auditId) {
    const result = await safeQuery(
      `SELECT * FROM "${s}".findings WHERE source_type = 'audit' AND source_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
      [auditId]
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT * FROM "${s}".findings WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getFindingById(tenantId: string, findingId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const [finding, rootCauses, impacts, capaPlans, closures] = await Promise.all([
    safeQuery(`SELECT * FROM "${s}".findings WHERE finding_id = $1 AND deleted_at IS NULL`, [findingId]),
    safeQuery(`SELECT * FROM "${s}".finding_root_causes WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`, [findingId]),
    safeQuery(`SELECT * FROM "${s}".finding_impacts WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`, [findingId]),
    safeQuery(`SELECT * FROM "${s}".remediation_plans WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`, [findingId]),
    safeQuery(`SELECT * FROM "${s}".closure_reviews WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY review_date DESC`, [findingId]),
  ]);
  if (!getFirstRow(finding)) return null;
  return {
    ...getFirstRow(finding),
    root_causes: rootCauses.rows,
    impacts: impacts.rows,
    capa_plans: capaPlans.rows,
    closure_reviews: closures.rows,
  };
}

export async function createFinding(tenantId: string, data: {
  title: string; description?: string; severity?: string;
  source_type?: string; source_id?: string; status?: string;
  finding_type?: string; workspace_id?: string;
}, actorUserId?: string) {
  const s = tenantSchema(tenantId);

  // Validate severity and status against canonical enums
  const severity = data.severity || 'medium';
  if (!(AUDIT_FINDING_SEVERITIES as readonly string[]).includes(severity)) {
    throw new Error(`Invalid severity "${severity}". Must be: ${AUDIT_FINDING_SEVERITIES.join(', ')}`);
  }
  const status = data.status || 'open';
  if (!(FINDING_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Invalid status "${status}". Must be: ${FINDING_STATUSES.join(', ')}`);
  }
  const findingType = data.finding_type || null;
  if (findingType && !(AUDIT_FINDING_TYPES as readonly string[]).includes(findingType)) {
    throw new Error(`Invalid finding_type "${findingType}". Must be: ${AUDIT_FINDING_TYPES.join(', ')}`);
  }

  const result = await safeQuery(
    `INSERT INTO "${s}".findings (title, description, severity, source_type, source_id, status, finding_type, workspace_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.title, data.description || '', severity,
     data.source_type || 'audit', data.source_id || '', status,
     findingType, data.workspace_id || null]
  );

  const row = getFirstRow(result);
  const findingId = row?.finding_id;

  // EventBus: audit.finding_created
  try {
    await eventBus.publish({
      eventType: 'audit.finding_created',
      tenantId,
      sourceService: 'audit',
      entityType: 'finding',
      entityId: findingId,
      severity: (data.severity === 'critical' || data.severity === 'high') ? 'warning' : 'info',
      payload: {
        title: data.title,
        severity: data.severity || 'medium',
        sourceType: data.source_type,
        sourceId: data.source_id,
        findingId,
        userId: actorUserId ?? null,
      },
    });
  } catch { /* best-effort */ }

  // Chain trigger: formal audit engagement finding (cross-module handler)
  if (findingId && data.source_type === 'audit' && data.source_id) {
    try {
      await eventBus.publish({
        eventType: 'audit.finding.issued',
        tenantId,
        sourceService: 'audit',
        entityType: 'finding',
        entityId: findingId,
        severity: (data.severity === 'critical' || data.severity === 'high') ? 'warning' : 'info',
        payload: {
          findingId,
          engagementId: data.source_id,
          severity: data.severity || 'medium',
          userId: actorUserId ?? null,
        },
      });
    } catch { /* best-effort */ }
  }

  return row;
}

export async function updateFinding(tenantId: string, findingId: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);

  // Validate status and severity against canonical enums
  if (data.status && !(FINDING_STATUSES as readonly string[]).includes(data.status)) {
    throw new Error(`Invalid status "${data.status}". Must be: ${FINDING_STATUSES.join(', ')}`);
  }
  if (data.severity && !(AUDIT_FINDING_SEVERITIES as readonly string[]).includes(data.severity)) {
    throw new Error(`Invalid severity "${data.severity}". Must be: ${AUDIT_FINDING_SEVERITIES.join(', ')}`);
  }
  if (data.finding_type && !(AUDIT_FINDING_TYPES as readonly string[]).includes(data.finding_type)) {
    throw new Error(`Invalid finding_type "${data.finding_type}". Must be: ${AUDIT_FINDING_TYPES.join(', ')}`);
  }

  const allowed = ['title', 'description', 'severity', 'status', 'source_type', 'source_id', 'finding_type'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => data[c]);
  const result = await safeQuery(
    `UPDATE "${s}".findings SET ${sets.join(', ')} WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`,
    [findingId, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("Finding not found");

  // EventBus: finding status change
  if (data.status) {
    try { await eventBus.publish({ eventType: 'audit.status_changed', tenantId, sourceService: 'audit', entityType: 'finding', entityId: findingId, severity: 'info', payload: { title: getFirstRow(result)?.title, status: data.status, severity: getFirstRow(result)?.severity } }); } catch { /* best-effort */ }
  }

  return getFirstRow(result);
}

export async function deleteFinding(tenantId: string, findingId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".findings SET deleted_at = NOW() WHERE finding_id = $1 AND deleted_at IS NULL RETURNING finding_id`,
    [findingId]
  );
  return result.rows.length > 0;
}

// ── Root Causes ─────────────────────────────────────────────────────

export async function getRootCauses(tenantId: string, findingId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".finding_root_causes WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`,
    [findingId]
  );
  return result.rows;
}

export async function addRootCause(tenantId: string, findingId: string, data: {
  cause_type: string; description?: string; analysis_method?: string; contributing_factors?: string[];
}) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${s}".finding_root_causes (finding_id, cause_type, description, analysis_method, contributing_factors)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [findingId, data.cause_type, data.description || null, data.analysis_method || null, data.contributing_factors || []]
  );
  return getFirstRow(result);
}

// ── Impacts ─────────────────────────────────────────────────────────

export async function getImpacts(tenantId: string, findingId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".finding_impacts WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`,
    [findingId]
  );
  return result.rows;
}

export async function addImpact(tenantId: string, findingId: string, data: {
  impact_type: string; severity?: string; affected_area?: string; financial_impact?: number; description?: string;
}) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${s}".finding_impacts (finding_id, impact_type, severity, affected_area, financial_impact, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [findingId, data.impact_type, data.severity || null, data.affected_area || null, data.financial_impact || null, data.description || null]
  );
  return getFirstRow(result);
}

// ── CAPA (remediation_plans) ────────────────────────────────────────

export async function getCapaPlans(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rp.*, f.title AS finding_title, f.severity AS finding_severity
     FROM "${s}".remediation_plans rp
     LEFT JOIN "${s}".findings f ON f.finding_id = rp.finding_id
     WHERE rp.deleted_at IS NULL
     ORDER BY rp.created_at DESC`
  );
  return result.rows;
}

export async function getCapaPlanById(tenantId: string, planId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rp.*, f.title AS finding_title, f.severity AS finding_severity, f.status AS finding_status
     FROM "${s}".remediation_plans rp
     LEFT JOIN "${s}".findings f ON f.finding_id = rp.finding_id
     WHERE rp.plan_id = $1 AND rp.deleted_at IS NULL`,
    [planId]
  );
  return getFirstRow(result) || null;
}

export async function createCapaPlan(tenantId: string, data: {
  finding_id: string; title: string; description?: string;
  owner_id?: string; target_date?: string; priority?: string; approach?: string;
}) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${s}".remediation_plans (finding_id, title, description, owner_id, target_date, priority, approach, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'open') RETURNING *`,
    [data.finding_id, data.title, data.description || null, data.owner_id || null,
     data.target_date || null, data.priority || 'medium', data.approach || null]
  );
  return getFirstRow(result);
}

export async function updateCapaPlan(tenantId: string, planId: string, data: Record<string, any>): Promise<any> {
  const s = tenantSchema(tenantId);
  const allowed = ['title', 'description', 'owner_id', 'target_date', 'status', 'priority', 'approach', 'risk_treatment_id'];
  const cols = Object.keys(data).filter(k => allowed.includes(k));
  if (!cols.length) throw new Error("No valid fields to update");
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => data[c]);
  const result = await safeQuery(
    `UPDATE "${s}".remediation_plans SET ${sets.join(', ')}, updated_at = NOW() WHERE plan_id = $1 AND deleted_at IS NULL RETURNING *`,
    [planId, ...vals]
  );
  if (!getFirstRow(result)) throw new Error("CAPA plan not found");

  // Cross-module: If CAPA completed, update linked risk's residual score
  if (data.status === 'completed' || data.status === 'closed') {
    try {
      const plan = getFirstRow(result);
      if (plan.finding_id) {
        // Find the risk linked to this finding
        const riskRes = await safeQuery(
          `SELECT risk_id, likelihood, impact FROM "${s}".risks
           WHERE source_id = $1 AND risk_source = 'audit_finding' AND deleted_at IS NULL`,
          [plan.finding_id]
        );
        if (getFirstRow(riskRes)) {
          const risk = getFirstRow(riskRes);
          // Reduce residual risk by 1 level when CAPA is completed
          const newLikelihood = Math.max(1, (risk.likelihood || 3) - 1);
          const newImpact = Math.max(1, (risk.impact || 3) - 1);
          const newLevel = (newLikelihood * newImpact) > 15 ? 'critical' : (newLikelihood * newImpact) > 9 ? 'high' : (newLikelihood * newImpact) > 4 ? 'medium' : 'low';
          await safeQuery(
            `UPDATE "${s}".risks SET residual_likelihood = $2, residual_impact = $3, risk_level = $4, updated_at = NOW()
             WHERE risk_id = $1 AND deleted_at IS NULL`,
            [risk.risk_id, newLikelihood, newImpact, newLevel]
          );
        }
      }
      // Sync to risk_treatments if linked
      if (plan.risk_treatment_id) {
        await safeQuery(
          `UPDATE "${s}".risk_treatments SET status = 'completed', updated_at = NOW()
           WHERE treatment_id = $1 AND deleted_at IS NULL`,
          [plan.risk_treatment_id]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    } catch { /* best-effort cross-module sync */ }
  }

  return getFirstRow(result);
}

// ── Link CAPA to Risk Treatment ──────────────────────────────────────

export async function linkCapaToRiskTreatment(tenantId: string, planId: string, treatmentId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${s}".remediation_plans SET risk_treatment_id = $2, updated_at = NOW()
     WHERE plan_id = $1 AND deleted_at IS NULL RETURNING *`,
    [planId, treatmentId]
  );
  if (!getFirstRow(result)) throw new Error("CAPA plan not found");
  return getFirstRow(result);
}

// ── Get available risk treatments for linking ────────────────────────

export async function getAvailableRiskTreatments(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT treatment_id, title, status, risk_id FROM "${s}".risk_treatments
       WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
    return result.rows;
  } catch {
    return [];
  }
}

// ── Closure Reviews (Validation) ────────────────────────────────────

export async function getClosureReviews(tenantId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT cr.*, f.title AS finding_title, f.severity AS finding_severity, f.status AS finding_status
     FROM "${s}".closure_reviews cr
     LEFT JOIN "${s}".findings f ON f.finding_id = cr.finding_id
     WHERE cr.deleted_at IS NULL
     ORDER BY cr.review_date DESC`
  );
  return result.rows;
}

export async function createClosureReview(tenantId: string, data: {
  finding_id: string; reviewer_id: string; outcome: string;
  evidence_ids?: string[]; comments?: string; verified_effective?: boolean;
}) {
  const s = tenantSchema(tenantId);
  const validOutcomes = ['closed', 'reopened', 'deferred'];
  if (!validOutcomes.includes(data.outcome)) throw new Error(`Invalid outcome. Must be: ${validOutcomes.join(', ')}`);

  const result = await safeQuery(
    `INSERT INTO "${s}".closure_reviews (finding_id, reviewer_id, outcome, evidence_ids, comments, verified_effective)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.finding_id, data.reviewer_id, data.outcome, data.evidence_ids || [], data.comments || null, data.verified_effective || false]
  );

  // Update finding status based on outcome
  const newStatus = data.outcome === 'closed' ? 'closed' : data.outcome === 'reopened' ? 'open' : 'deferred';
  await safeQuery(
    `UPDATE "${s}".findings SET status = $1 WHERE finding_id = $2 AND deleted_at IS NULL`,
    [newStatus, data.finding_id]
  );

  // EventBus: closure review outcome
  try { await eventBus.publish({ eventType: 'audit.status_changed', tenantId, sourceService: 'audit', entityType: 'finding', entityId: data.finding_id, severity: 'info', payload: { outcome: data.outcome, newStatus, reviewerId: data.reviewer_id, verifiedEffective: data.verified_effective } }); } catch { /* best-effort */ }

  return getFirstRow(result);
}

// ── Evidence Collection (for audit) — kept for backward compat ──────

export async function collectEvidence(tenantId: string, data: {
  controlId: string; title: string; description?: string; filePath?: string; submittedBy: string;
}) {
  const s = tenantSchema(tenantId);
  const lastEvidence = await safeQuery(
    `SELECT content_hash, chain_position FROM "${s}".evidence ORDER BY chain_position DESC LIMIT 1`
  );
  const previousHash = lastEvidence.rows.length > 0 ? getFirstRow(lastEvidence)?.content_hash : null;
  const chainPosition = lastEvidence.rows.length > 0 ? getFirstRow(lastEvidence)?.chain_position + 1 : 1;
  const contentHash = Buffer.from(
    `${data.title}|${data.description || ''}|${data.filePath || ''}|${Date.now()}`
  ).toString('base64').slice(0, 64);

  const result = await safeQuery(
    `INSERT INTO "${s}".evidence (control_id, title, description, file_path, content_hash, previous_hash, chain_position, submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.controlId, data.title, data.description || null, data.filePath || null,
     contentHash, previousHash, chainPosition, data.submittedBy]
  );
  return getFirstRow(result);
}

// ── Report Generation ───────────────────────────────────────────────

export async function generateReport(tenantId: string, auditId: string): Promise<any> {
  const s = tenantSchema(tenantId);
  const audit = await getEngagementById(tenantId, auditId);
  if (!audit) throw new Error("Audit not found");

  const capaRes = await safeQuery(
    `SELECT rp.* FROM "${s}".remediation_plans rp
     JOIN "${s}".findings f ON f.finding_id = rp.finding_id
     WHERE f.source_type = 'audit' AND f.source_id = $1 AND rp.deleted_at IS NULL`,
    [auditId]
  );

  return {
    reportId: uuid().slice(0, 8),
    generatedAt: new Date().toISOString(),
    audit: {
      auditId: audit.audit_id,
      title: audit.title,
      type: audit.audit_type,
      scope: audit.scope,
      status: audit.status,
      plannedStart: audit.planned_start,
      plannedEnd: audit.planned_end,
      actualStart: audit.actual_start,
      actualEnd: audit.actual_end,
      leadAuditor: audit.lead_auditor_id,
      methodology: audit.methodology,
      conclusion: audit.conclusion,
    },
    summary: {
      totalFindings: audit.findings.length,
      bySeverity: {
        critical: audit.findings.filter((f: GenericRow) => f.severity === 'critical').length,
        high: audit.findings.filter((f: GenericRow) => f.severity === 'high').length,
        medium: audit.findings.filter((f: GenericRow) => f.severity === 'medium').length,
        low: audit.findings.filter((f: GenericRow) => f.severity === 'low').length,
      },
      totalCapa: capaRes.rows.length,
    },
    findings: audit.findings.map((f: GenericRow) => ({
      id: f.finding_id,
      title: f.title,
      description: f.description,
      severity: f.severity,
      status: f.status,
      createdAt: f.created_at,
    })),
    capaPlans: capaRes.rows.map((r: GenericRow) => ({
      id: r.plan_id,
      title: r.title,
      status: r.status,
      priority: r.priority,
      targetDate: r.target_date,
    })),
  };
}
