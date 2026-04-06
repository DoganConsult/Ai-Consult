// @ts-nocheck
/**
 * Compliance Audit Package — audit package assembly, traceability matrix,
 * and multi-format export (PDF / XLSX / ZIP).
 *
 * Split from compliance-audit-export.service.ts for modularity.
 */

import { safeQuery } from "../../../../config/database";
import { ctx } from "../misc/compliance.utils";
import { getFile } from "../../../../platform/dos/storage/file-storage.service";
import { getComplianceOverview } from "./compliance-workspace-overview.service";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import archiver from "archiver";
import type { GenericRow } from '../../../../types/db-rows.types';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

// ═══════════════════════════════════════════════════════════════════
// 13. EXPORT COMPLIANCE REPORT
// ═══════════════════════════════════════════════════════════════════

export async function exportComplianceReport(tenantId: string): Promise<any> {
  const { getFrameworksRegister } = await import("./compliance-frameworks-obligations.service");
  const { getGapsRegister, getComplianceRoadmap } = await import("./compliance-gaps-roadmap.service");
  const { getAuditReadiness } = await import("./compliance-workspace-overview.service");
  const overview = await getComplianceOverview(tenantId);
  const frameworks = await getFrameworksRegister(tenantId);
  const { items: gaps } = await getGapsRegister(tenantId, undefined, undefined, { limit: 10000, offset: 0 });
  const roadmap = await getComplianceRoadmap(tenantId);
  const auditReadiness = await getAuditReadiness(tenantId);

  return {
    exportedAt: new Date().toISOString(),
    tenantId,
    overview: overview.summary,
    frameworks,
    gaps,
    roadmap,
    auditReadiness,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 13b. AUDIT PACKAGE (control → test → evidence → result + manifest)
// ═══════════════════════════════════════════════════════════════════

export interface AuditPackageOptions {
  frameworkId?: string;
  frameworkIds?: string[];
}

export interface AuditPackageResult {
  generatedAt: string;
  tenantId: string;
  frameworkIds: string[];
  controlList: Array<{
    controlId: string;
    title: string;
    testProcedure: { testId: string; method: string; result: string };
    evidenceIds: string[];
    result: string;
  }>;
  evidenceManifest: Array<{
    evidenceId: string;
    controlId: string;
    type: string;
    hash?: string;
    collectedAt: string | null;
    validUntil: string | null;
  }>;
  traceabilityMatrix: Array<{
    controlId: string;
    testId: string;
    evidenceId: string;
    result: string;
  }>;
  hashManifest: Array<{
    evidenceId: string;
    hash: string;
    algorithm: string;
    computedAt: string;
  }>;
  custodyEvents: Array<{
    evidenceId: string;
    eventType: string;
    actorUserId?: string;
    actorRole?: string;
    timestamp: string;
    notes?: string;
  }>;
}

export async function getAuditPackage(tenantId: string, options?: AuditPackageOptions): Promise<AuditPackageResult> {
  const { schema } = ctx(tenantId);

  let frameworkIds: string[];
  if (options?.frameworkId) {
    frameworkIds = [options.frameworkId];
  } else if (options?.frameworkIds && options.frameworkIds.length > 0) {
    frameworkIds = options.frameworkIds;
  } else {
    const fwRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".frameworks
       WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE) AND deleted_at IS NULL`
    );
    frameworkIds = fwRes.rows.map((r: GenericRow) => r.framework_id);
  }
  if (frameworkIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      tenantId,
      frameworkIds: [],
      controlList: [],
      evidenceManifest: [],
      traceabilityMatrix: [],
      hashManifest: [],
      custodyEvents: [],
    };
  }

  // Get controls with their test procedures (real test procedures from test_procedures table)
  const ctrlRes = await safeQuery(
    `SELECT c.control_id, c.title, c.test_status, c.evidence_ids,
            COALESCE(
              (SELECT json_agg(json_build_object('test_id', test_id, 'method', test_method))
               FROM "${schema}".test_procedures tp
               WHERE tp.control_id = c.control_id AND tp.deleted_at IS NULL),
              json_build_array(json_build_object('test_id', c.control_id || '-test', 'method', 'test'))
            ) as test_procedures
     FROM "${schema}".controls c
     WHERE c.deleted_at IS NULL AND (c.frameworks && $1::text[])
     ORDER BY c.title`,
    [frameworkIds]
  );
  const controls = ctrlRes.rows as Array<{
    control_id: string;
    title: string;
    test_status: string;
    evidence_ids: string[];
    test_procedures: Array<{ test_id: string; method: string }>;
  }>;

  const controlIds = controls.map((c) => c.control_id);
  const allEvidenceIds = new Set<string>();
  controls.forEach((c) => ((c.evidence_ids || []) as string[]).forEach((id) => allEvidenceIds.add(id)));

  // Get evidence details with hash information
  let evidenceRows: unknown[] = [];
  if (controlIds.length > 0 && allEvidenceIds.size > 0) {
    const evRes = await safeQuery(
      `SELECT evidence_id, control_id, title, content_hash, submitted_at, expiry_date,
              artifact_type, source_type, quality_tier, version, previous_hash
       FROM "${schema}".evidence
       WHERE evidence_id = ANY($1) AND deleted_at IS NULL`,
      [Array.from(allEvidenceIds)]
    );
    evidenceRows = evRes.rows;
  }

  const evidenceMap = new Map(evidenceRows.map((e: GenericRow) => [e.evidence_id, e]));

  // Build control list with real test procedures
  const controlList = controls.map((c) => {
    const evidenceIds = (c.evidence_ids || []).filter((id) => evidenceMap.has(id));
    const result = (c.test_status || "not_tested").toLowerCase();
    const normalizedResult = result === "passed" || result === "partial" || result === "failed" || result === "na" ? result : "not_tested";
    const testProcedures = (c.test_procedures || []) as Array<{ test_id: string; method: string }>;
    const primaryTest = testProcedures.length > 0 ? testProcedures[0] : { test_id: `${c.control_id}-test`, method: "test" };

    return {
      controlId: c.control_id,
      title: c.title,
      testProcedure: {
        testId: primaryTest.test_id,
        method: primaryTest.method,
        result: normalizedResult,
      },
      evidenceIds,
      result: normalizedResult,
    };
  });

  // Build evidence manifest
  const evidenceManifest = evidenceRows.map((e: GenericRow) => ({
    evidenceId: e.evidence_id,
    controlId: e.control_id,
    type: e.artifact_type || "document",
    hash: e.content_hash || undefined,
    collectedAt: e.submitted_at ? new Date(e.submitted_at).toISOString() : null,
    validUntil: e.expiry_date ? new Date(e.expiry_date).toISOString().slice(0, 10) : null,
  }));

  // Build hash manifest (structured hash list for all evidence)
  const hashManifest = evidenceRows
    .filter((e: GenericRow) => e.content_hash)
    .map((e: GenericRow) => ({
      evidenceId: e.evidence_id,
      hash: e.content_hash,
      algorithm: "sha256", // Assuming SHA-256 based on evidence.service.ts patterns
      computedAt: e.submitted_at ? new Date(e.submitted_at).toISOString() : new Date().toISOString(),
    }));

  // Build traceability matrix with real test procedures
  const traceabilityMatrix: Array<{ controlId: string; testId: string; evidenceId: string; result: string }> = [];
  for (const ctrl of controls) {
    const result = (ctrl.test_status || "not_tested").toLowerCase();
    const normalizedResult = result === "passed" || result === "partial" || result === "failed" || result === "na" ? result : "not_tested";
    const evidenceIds = (ctrl.evidence_ids || []).filter((id) => evidenceMap.has(id));
    const testProcedures = (ctrl.test_procedures || []) as Array<{ test_id: string; method: string }>;

    if (testProcedures.length > 0) {
      // Use actual test procedures if available
      for (const testProc of testProcedures) {
        if (evidenceIds.length > 0) {
          for (const evidenceId of evidenceIds) {
            traceabilityMatrix.push({
              controlId: ctrl.control_id,
              testId: testProc.test_id,
              evidenceId,
              result: normalizedResult,
            });
          }
        } else {
          // Control has test but no evidence
          traceabilityMatrix.push({
            controlId: ctrl.control_id,
            testId: testProc.test_id,
            evidenceId: "",
            result: normalizedResult,
          });
        }
      }
    } else {
      // Fallback: use default test ID
      if (evidenceIds.length > 0) {
        for (const evidenceId of evidenceIds) {
          traceabilityMatrix.push({
            controlId: ctrl.control_id,
            testId: `${ctrl.control_id}-test`,
            evidenceId,
            result: normalizedResult,
          });
        }
      } else {
        traceabilityMatrix.push({
          controlId: ctrl.control_id,
          testId: `${ctrl.control_id}-test`,
          evidenceId: "",
          result: normalizedResult,
        });
      }
    }
  }

  // Build chain-of-custody events from audit_trail
  const custodyEvents: Array<{
    evidenceId: string;
    eventType: string;
    actorUserId?: string;
    actorRole?: string;
    timestamp: string;
    notes?: string;
  }> = [];

  if (allEvidenceIds.size > 0) {
    const custodyRes = await safeQuery(
      `SELECT entity_id as evidence_id, action, user_id, created_at,
              (after_state->>'reviewer_user_id')::text as reviewer_user_id,
              (after_state->>'status')::text as status,
              (after_state->>'notes')::text as notes
       FROM "${schema}".audit_trail
       WHERE entity_type = 'evidence'
         AND entity_id = ANY($1)
         AND action IN ('create', 'update', 'approve', 'reject', 'review', 'submit')
       ORDER BY created_at ASC`,
      [Array.from(allEvidenceIds)]
    );

    for (const event of custodyRes.rows) {
      let eventType = event.action;
      // Map audit_trail actions to custody event types
      if (event.action === 'create' || event.action === 'submit') {
        eventType = 'upload';
      } else if (event.action === 'approve') {
        eventType = 'approve';
      } else if (event.action === 'reject') {
        eventType = 'reject';
      } else if (event.action === 'review') {
        eventType = 'review';
      } else if (event.action === 'update') {
        // Determine if it's a supersede based on version change
        eventType = 'supersede'; // Could be enhanced to check version field
      }

      custodyEvents.push({
        evidenceId: event.evidence_id,
        eventType,
        actorUserId: event.user_id || event.reviewer_user_id || undefined,
        actorRole: undefined, // Could be enhanced to look up user role
        timestamp: new Date(event.created_at).toISOString(),
        notes: event.notes || undefined,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    frameworkIds,
    controlList,
    evidenceManifest,
    traceabilityMatrix,
    hashManifest,
    custodyEvents,
  };
}

// ============================================
// P3.3: Traceability Matrix (dedicated endpoint)
// ============================================

export interface TraceabilityMatrixResult {
  generatedAt: string;
  tenantId: string;
  frameworkIds: string[];
  matrix: Array<{
    controlId: string;
    controlTitle: string;
    testId: string;
    testMethod: string;
    evidenceId: string;
    evidenceTitle: string;
    result: string;
  }>;
}

/**
 * Get traceability matrix -- control -> test -> evidence -> result mapping.
 * Dedicated endpoint for traceability matrix only.
 */

// ============================================
// P4.2: Auditor Dashboard
// ============================================

export interface AuditorDashboardData {
  overview: {
    totalFrameworks: number;
    totalControls: number;
    totalFindings: number;
    openFindings: number;
    overdueFindings: number;
    evidenceItems: number;
    expiringEvidence: number;
    complianceScore: number;
    auditReadiness: number;
  };
  frameworks: Array<{
    frameworkId: string;
    frameworkCode: string;
    frameworkName: string;
    controlCount: number;
    implementedCount: number;
    gapCount: number;
    lastAssessmentDate: string | null;
  }>;
  topGaps: Array<{
    gapId: string;
    controlId: string;
    controlTitle: string;
    frameworkCode: string;
    severity: string;
    status: string;
    dueDate: string | null;
    daysOverdue: number | null;
  }>;
  evidenceStatus: {
    total: number;
    approved: number;
    pendingReview: number;
    expired: number;
    expiringSoon: number;
  };
  recentActivities: Array<{
    activityId: string;
    type: string;
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    timestamp: string;
  }>;
}

export async function getAuditorDashboard(tenantId: string): Promise<AuditorDashboardData> {
  const { schema } = ctx(tenantId);
  const { getFirstRow } = await import("../../../../utils/db-utils");

  // Overview metrics
  const overviewRes = await safeQuery(
    `SELECT
      (SELECT COUNT(DISTINCT framework_code) FROM ${schema}.frameworks WHERE deleted_at IS NULL)::int AS total_frameworks,
      (SELECT COUNT(*) FROM ${schema}.controls WHERE deleted_at IS NULL)::int AS total_controls,
      (SELECT COUNT(*) FROM ${schema}.findings WHERE deleted_at IS NULL)::int AS total_findings,
      (SELECT COUNT(*) FROM ${schema}.findings WHERE deleted_at IS NULL AND status NOT IN ('Closed', 'Resolved'))::int AS open_findings,
      (SELECT COUNT(*) FROM ${schema}.findings WHERE deleted_at IS NULL AND status NOT IN ('Closed', 'Resolved') AND due_date < NOW())::int AS overdue_findings,
      (SELECT COUNT(*) FROM ${schema}.evidence WHERE deleted_at IS NULL)::int AS evidence_items,
      (SELECT COUNT(*) FROM ${schema}.evidence WHERE deleted_at IS NULL AND valid_until IS NOT NULL AND valid_until BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS expiring_evidence
    `
  );
  const ov = getFirstRow(overviewRes) || {};

  // Compliance score (from latest snapshot or compute)
  const scoreRes = await safeQuery(
    `SELECT compliance_score
     FROM ${schema}.compliance_overview_snapshots
     WHERE tenant_id = $1
     ORDER BY captured_at DESC
     LIMIT 1`,
    [tenantId]
  );
  const complianceScore = getFirstRow(scoreRes)?.compliance_score || 0;

  // Audit readiness (simplified: based on evidence coverage and gap closure)
  const readinessRes = await safeQuery(
    `SELECT
      CASE
        WHEN (SELECT COUNT(*) FROM ${schema}.controls WHERE deleted_at IS NULL) = 0 THEN 0
        ELSE ROUND(
          (SELECT COUNT(DISTINCT c.control_id)
           FROM ${schema}.control_evidence_requirements cer
           JOIN ${schema}.controls c ON c.control_id = cer.control_id
           WHERE c.deleted_at IS NULL
           AND EXISTS (
             SELECT 1 FROM ${schema}.evidence e
             WHERE e.control_id = c.control_id
             AND e.deleted_at IS NULL
             AND e.status = 'Approved'
           )
          )::numeric /
          NULLIF((SELECT COUNT(*) FROM ${schema}.controls WHERE deleted_at IS NULL), 0)::numeric * 100,
          2
        )
      END AS audit_readiness
    `
  );
  const auditReadinessVal = getFirstRow(readinessRes)?.audit_readiness || 0;

  // Frameworks summary
  const frameworksRes = await safeQuery(
    `SELECT
      f.framework_id,
      f.framework_code,
      f.framework_name,
      COUNT(DISTINCT c.control_id)::int AS control_count,
      COUNT(DISTINCT CASE WHEN c.status = 'Implemented' THEN c.control_id END)::int AS implemented_count,
      COUNT(DISTINCT g.gap_id)::int AS gap_count,
      MAX(a.assessment_date)::text AS last_assessment_date
    FROM ${schema}.frameworks f
    LEFT JOIN ${schema}.controls c ON c.framework_code = f.framework_code AND c.deleted_at IS NULL
    LEFT JOIN ${schema}.gaps g ON g.control_id = c.control_id AND g.deleted_at IS NULL AND g.status != 'Closed'
    LEFT JOIN ${schema}.assessments a ON a.framework_code = f.framework_code AND a.deleted_at IS NULL
    WHERE f.deleted_at IS NULL
    GROUP BY f.framework_id, f.framework_code, f.framework_name
    ORDER BY f.framework_name
    `
  );

  // Top gaps (overdue or high severity)
  const gapsRes = await safeQuery(
    `SELECT
      g.gap_id,
      g.control_id,
      c.control_title,
      c.framework_code,
      g.severity,
      g.status,
      g.due_date::text,
      CASE
        WHEN g.due_date < NOW() AND g.status NOT IN ('Closed', 'Resolved')
        THEN EXTRACT(DAY FROM NOW() - g.due_date)::int
        ELSE NULL
      END AS days_overdue
    FROM ${schema}.gaps g
    JOIN ${schema}.controls c ON c.control_id = g.control_id
    WHERE g.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND g.status NOT IN ('Closed', 'Resolved')
    ORDER BY
      CASE g.severity
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        ELSE 4
      END,
      g.due_date NULLS LAST
    LIMIT 20
    `
  );

  // Evidence status
  const evidenceRes = await safeQuery(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved,
      COUNT(*) FILTER (WHERE status IN ('Submitted', 'Under Review'))::int AS pending_review,
      COUNT(*) FILTER (WHERE valid_until IS NOT NULL AND valid_until < NOW())::int AS expired,
      COUNT(*) FILTER (WHERE valid_until IS NOT NULL AND valid_until BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS expiring_soon
    FROM ${schema}.evidence
    WHERE deleted_at IS NULL
    `
  );
  const ev = getFirstRow(evidenceRes) || {};

  // Recent activities (from audit log)
  const activitiesRes = await safeQuery(
    `SELECT
      audit_log_id AS activity_id,
      'audit_log' AS type,
      entity_type,
      entity_id,
      action,
      user_id AS actor,
      created_at::text AS timestamp
    FROM ${schema}.audit_log
    WHERE tenant_id = $1
      AND entity_type IN ('control', 'finding', 'evidence', 'gap', 'assessment', 'framework')
    ORDER BY created_at DESC
    LIMIT 50
    `,
    [tenantId]
  );

  return {
    overview: {
      totalFrameworks: ov.total_frameworks || 0,
      totalControls: ov.total_controls || 0,
      totalFindings: ov.total_findings || 0,
      openFindings: ov.open_findings || 0,
      overdueFindings: ov.overdue_findings || 0,
      evidenceItems: ov.evidence_items || 0,
      expiringEvidence: ov.expiring_evidence || 0,
      complianceScore: Number(complianceScore),
      auditReadiness: Number(auditReadinessVal),
    },
    frameworks: frameworksRes.rows.map((r) => ({
      frameworkId: r.framework_id,
      frameworkCode: r.framework_code,
      frameworkName: r.framework_name,
      controlCount: r.control_count || 0,
      implementedCount: r.implemented_count || 0,
      gapCount: r.gap_count || 0,
      lastAssessmentDate: r.last_assessment_date || null,
    })),
    topGaps: gapsRes.rows.map((r) => ({
      gapId: r.gap_id,
      controlId: r.control_id,
      controlTitle: r.control_title,
      frameworkCode: r.framework_code,
      severity: r.severity,
      status: r.status,
      dueDate: r.due_date || null,
      daysOverdue: r.days_overdue || null,
    })),
    evidenceStatus: {
      total: ev.total || 0,
      approved: ev.approved || 0,
      pendingReview: ev.pending_review || 0,
      expired: ev.expired || 0,
      expiringSoon: ev.expiring_soon || 0,
    },
    recentActivities: activitiesRes.rows.map((r) => ({
      activityId: r.activity_id,
      type: r.type,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      actor: r.actor,
      timestamp: r.timestamp,
    })),
  };
}

export async function getTraceabilityMatrix(tenantId: string, options?: AuditPackageOptions): Promise<TraceabilityMatrixResult> {
  const { schema } = ctx(tenantId);

  let frameworkIds: string[];
  if (options?.frameworkId) {
    frameworkIds = [options.frameworkId];
  } else if (options?.frameworkIds && options.frameworkIds.length > 0) {
    frameworkIds = options.frameworkIds;
  } else {
    const fwRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".frameworks
       WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE) AND deleted_at IS NULL`
    );
    frameworkIds = fwRes.rows.map((r: GenericRow) => r.framework_id);
  }

  if (frameworkIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      tenantId,
      frameworkIds: [],
      matrix: [],
    };
  }

  // Get controls with their test status and evidence
  const ctrlRes = await safeQuery(
    `SELECT c.control_id, c.title, c.test_status, c.evidence_ids,
            COALESCE(
              (SELECT json_agg(json_build_object('test_id', test_id, 'method', test_method))
               FROM "${schema}".test_procedures tp
               WHERE tp.control_id = c.control_id AND tp.deleted_at IS NULL),
              json_build_array(json_build_object('test_id', c.control_id || '-test', 'method', 'test'))
            ) as test_procedures
     FROM "${schema}".controls c
     WHERE c.deleted_at IS NULL AND (c.frameworks && $1::text[])
     ORDER BY c.title`,
    [frameworkIds]
  );

  const controlIds = ctrlRes.rows.map((r: GenericRow) => r.control_id);
  const allEvidenceIds = new Set<string>();
  ctrlRes.rows.forEach((r: GenericRow) => {
    ((r.evidence_ids || []) as string[]).forEach((id: string) => allEvidenceIds.add(id));
  });

  // Get evidence details
  let evidenceMap = new Map();
  if (controlIds.length > 0 && allEvidenceIds.size > 0) {
    const evRes = await safeQuery(
      `SELECT evidence_id, control_id, title, file_path, content_hash, submitted_at
       FROM "${schema}".evidence
       WHERE evidence_id = ANY($1) AND deleted_at IS NULL`,
      [Array.from(allEvidenceIds)]
    );
    evidenceMap = new Map(evRes.rows.map((e: GenericRow) => [e.evidence_id, e]));
  }

  // Build traceability matrix
  const matrix: TraceabilityMatrixResult['matrix'] = [];
  for (const ctrl of ctrlRes.rows) {
    const controlId = ctrl.control_id;
    const controlTitle = ctrl.title;
    const testStatus = (ctrl.test_status || "not_tested").toLowerCase();
    const normalizedResult = testStatus === "passed" || testStatus === "partial" || testStatus === "failed" || testStatus === "na" ? testStatus : "not_tested";
    const evidenceIds = ((ctrl.evidence_ids || []) as string[]).filter((id) => evidenceMap.has(id));
    const testProcedures = (ctrl.test_procedures || []) as Array<{ test_id: string; method: string }>;

    if (testProcedures.length > 0) {
      // Use actual test procedures if available
      for (const testProc of testProcedures) {
        if (evidenceIds.length > 0) {
          for (const evidenceId of evidenceIds) {
            const evidence = evidenceMap.get(evidenceId);
            matrix.push({
              controlId,
              controlTitle,
              testId: testProc.test_id,
              testMethod: testProc.method,
              evidenceId,
              evidenceTitle: evidence?.title || `Evidence ${evidenceId.slice(0, 8)}`,
              result: normalizedResult,
            });
          }
        } else {
          // Control has test but no evidence
          matrix.push({
            controlId,
            controlTitle,
            testId: testProc.test_id,
            testMethod: testProc.method,
            evidenceId: "",
            evidenceTitle: "",
            result: normalizedResult,
          });
        }
      }
    } else {
      // Fallback: use default test ID
      if (evidenceIds.length > 0) {
        for (const evidenceId of evidenceIds) {
          const evidence = evidenceMap.get(evidenceId);
          matrix.push({
            controlId,
            controlTitle,
            testId: `${controlId}-test`,
            testMethod: "test",
            evidenceId,
            evidenceTitle: evidence?.title || `Evidence ${evidenceId.slice(0, 8)}`,
            result: normalizedResult,
          });
        }
      } else {
        matrix.push({
          controlId,
          controlTitle,
          testId: `${controlId}-test`,
          testMethod: "test",
          evidenceId: "",
          evidenceTitle: "",
          result: normalizedResult,
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    frameworkIds,
    matrix,
  };
}

export type ExportAuditPackFormat = "pdf" | "xlsx" | "zip";

export interface ExportAuditPackResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/** Generate audit pack in PDF, XLSX, or ZIP format for download. */
export async function exportAuditPack(
  tenantId: string,
  format: ExportAuditPackFormat,
  options?: AuditPackageOptions,
): Promise<ExportAuditPackResult> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const baseName = `compliance-audit-pack-${stamp}`;

  if (format === "zip") {
    const pkg = await getAuditPackage(tenantId, options);
    const { schema } = ctx(tenantId);
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    const endPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
    });

    // Add JSON metadata files
    archive.append(JSON.stringify(pkg, null, 2), { name: "audit-package.json" });
    const overview = await getComplianceOverview(tenantId, { light: true });
    const summary = {
      generatedAt: pkg.generatedAt,
      tenantId: pkg.tenantId,
      frameworkIds: pkg.frameworkIds,
      controlCount: pkg.controlList.length,
      evidenceCount: pkg.evidenceManifest.length,
      overviewSummary: overview.summary,
    };
    archive.append(JSON.stringify(summary, null, 2), { name: "summary.json" });

    // Add traceability matrix as separate JSON
    archive.append(JSON.stringify(pkg.traceabilityMatrix, null, 2), { name: "traceability-matrix.json" });

    // Add hash manifest
    archive.append(JSON.stringify(pkg.hashManifest, null, 2), { name: "hash-manifest.json" });

    // Add chain-of-custody events
    archive.append(JSON.stringify(pkg.custodyEvents, null, 2), { name: "custody-events.json" });

    // P3.3: Add actual evidence files to ZIP
    const evidenceFileErrors: string[] = [];
    if (pkg.evidenceManifest.length > 0) {
      // Get file paths for evidence
      const evidenceIds = pkg.evidenceManifest.map((e) => e.evidenceId).filter((id) => id);
      if (evidenceIds.length > 0) {
        const evRes = await safeQuery(
          `SELECT evidence_id, title, file_path, content_hash
           FROM "${schema}".evidence
           WHERE evidence_id = ANY($1) AND deleted_at IS NULL AND file_path IS NOT NULL`,
          [evidenceIds]
        );

        // Add evidence files to ZIP
        for (const evItem of evRes.rows) {
          try {
            const fileBuffer = await getFile(evItem.file_path, tenantId);
            const fileName = evItem.file_path.split("/").pop() || evItem.file_path;
            const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
            archive.append(fileBuffer, { name: `evidence/${evItem.evidence_id.slice(0, 8)}_${safeFileName}` });
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            evidenceFileErrors.push(`Evidence ${evItem.evidence_id.slice(0, 8)}: ${errMsg}`);
            // Continue with other files even if one fails
          }
        }
      }
    }

    // Add errors log if any files failed
    if (evidenceFileErrors.length > 0) {
      archive.append(JSON.stringify({ errors: evidenceFileErrors }, null, 2), { name: "evidence-errors.json" });
    }

    archive.finalize();
    const buffer = await endPromise;
    return {
      buffer,
      filename: `${baseName}.zip`,
      contentType: "application/zip",
    };
  }

  if (format === "pdf") {
    const pkg = await getAuditPackage(tenantId, options);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () =>
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `${baseName}.pdf`,
          contentType: "application/pdf",
        }),
      );
      doc.on("error", reject);
      doc.fontSize(18).text("Compliance Audit Pack", { continued: false });
      doc.fontSize(10).text(`Generated: ${pkg.generatedAt}`, { continued: false });
      doc.text(`Tenant: ${pkg.tenantId}`, { continued: false });
      doc.text(`Frameworks: ${(pkg.frameworkIds || []).join(", ") || "all"}`, { continued: false });
      doc.moveDown();
      doc.fontSize(12).text("Control List", { continued: false });
      doc.fontSize(9);
      pkg.controlList.slice(0, 200).forEach((c: unknown, i: number) => {
        doc.text(
          `${i + 1}. ${(c.controlCode || c.controlId || "").toString().slice(0, 30)} – ${(c.titleEn || c.title || "").toString().slice(0, 40)}`,
          { continued: false },
        );
      });
      if (pkg.controlList.length > 200) {
        doc.text(`... and ${pkg.controlList.length - 200} more controls.`, { continued: false });
      }
      doc.addPage();
      doc.fontSize(12).text("Evidence Manifest (sample)", { continued: false });
      doc.fontSize(9);
      pkg.evidenceManifest.slice(0, 100).forEach((e: unknown, i: number) => {
        doc.text(
          `${i + 1}. ${(e.evidenceId || "").toString().slice(0, 20)} – ${(e.artifactType || "").toString().slice(0, 25)}`,
          { continued: false },
        );
      });
      if (pkg.evidenceManifest.length > 100) {
        doc.text(`... and ${pkg.evidenceManifest.length - 100} more.`, { continued: false });
      }
      doc.addPage();
      doc.fontSize(12).text("Hash Manifest", { continued: false });
      doc.fontSize(9);
      pkg.hashManifest.slice(0, 100).forEach((h: unknown, i: number) => {
        doc.text(
          `${i + 1}. ${(h.evidenceId || "").toString().slice(0, 20)} – ${(h.hash || "").toString().slice(0, 40)} (${h.algorithm || "sha256"})`,
          { continued: false },
        );
      });
      if (pkg.hashManifest.length > 100) {
        doc.text(`... and ${pkg.hashManifest.length - 100} more.`, { continued: false });
      }
      doc.addPage();
      doc.fontSize(12).text("Chain-of-Custody Events", { continued: false });
      doc.fontSize(9);
      pkg.custodyEvents.slice(0, 100).forEach((e: unknown, i: number) => {
        doc.text(
          `${i + 1}. ${(e.evidenceId || "").toString().slice(0, 20)} – ${e.eventType || ""} by ${e.actorUserId || SYSTEM_JOB_ACTOR} at ${e.timestamp || ""}`,
          { continued: false },
        );
      });
      if (pkg.custodyEvents.length > 100) {
        doc.text(`... and ${pkg.custodyEvents.length - 100} more.`, { continued: false });
      }
      doc.end();
    });
  }

  if (format === "xlsx") {
    const pkg = await getAuditPackage(tenantId, options);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AGRC-OS Compliance";
    workbook.created = new Date();

    const controlsSheet = workbook.addWorksheet("Controls", {});
    controlsSheet.columns = [
      { header: "Control ID", key: "controlId", width: 22 },
      { header: "Code", key: "controlCode", width: 18 },
      { header: "Title (EN)", key: "titleEn", width: 40 },
      { header: "Result", key: "result", width: 12 },
    ];
    pkg.controlList.forEach((c: GenericRow) => {
      controlsSheet.addRow({
        controlId: c.controlId,
        controlCode: c.controlCode ?? "",
        titleEn: (c.titleEn || c.title || "").toString().slice(0, 255),
        result: c.result ?? "",
      });
    });

    const evidenceSheet = workbook.addWorksheet("Evidence Manifest", {});
    evidenceSheet.columns = [
      { header: "Evidence ID", key: "evidenceId", width: 22 },
      { header: "Artifact Type", key: "artifactType", width: 20 },
      { header: "Collected At", key: "collectedAt", width: 22 },
      { header: "Quality", key: "qualityTier", width: 10 },
    ];
    pkg.evidenceManifest.forEach((e: GenericRow) => {
      evidenceSheet.addRow({
        evidenceId: e.evidenceId ?? "",
        artifactType: e.artifactType ?? "",
        collectedAt: e.collectedAt ?? "",
        qualityTier: e.qualityTier ?? "",
      });
    });

    const traceSheet = workbook.addWorksheet("Traceability Matrix", {});
    traceSheet.columns = [
      { header: "Control ID", key: "controlId", width: 22 },
      { header: "Test ID", key: "testId", width: 22 },
      { header: "Evidence ID", key: "evidenceId", width: 22 },
      { header: "Result", key: "result", width: 14 },
    ];
    pkg.traceabilityMatrix.forEach((r: GenericRow) => {
      traceSheet.addRow({
        controlId: r.controlId ?? "",
        testId: r.testId ?? "",
        evidenceId: r.evidenceId ?? "",
        result: r.result ?? "",
      });
    });

    const hashSheet = workbook.addWorksheet("Hash Manifest", {});
    hashSheet.columns = [
      { header: "Evidence ID", key: "evidenceId", width: 22 },
      { header: "Hash", key: "hash", width: 70 },
      { header: "Algorithm", key: "algorithm", width: 15 },
      { header: "Computed At", key: "computedAt", width: 22 },
    ];
    pkg.hashManifest.forEach((h: unknown) => {
      hashSheet.addRow({
        evidenceId: h.evidenceId ?? "",
        hash: h.hash ?? "",
        algorithm: h.algorithm ?? "sha256",
        computedAt: h.computedAt ?? "",
      });
    });

    const custodySheet = workbook.addWorksheet("Chain-of-Custody", {});
    custodySheet.columns = [
      { header: "Evidence ID", key: "evidenceId", width: 22 },
      { header: "Event Type", key: "eventType", width: 18 },
      { header: "Actor User ID", key: "actorUserId", width: 22 },
      { header: "Actor Role", key: "actorRole", width: 18 },
      { header: "Timestamp", key: "timestamp", width: 22 },
      { header: "Notes", key: "notes", width: 40 },
    ];
    pkg.custodyEvents.forEach((e: GenericRow) => {
      custodySheet.addRow({
        evidenceId: e.evidenceId ?? "",
        eventType: e.eventType ?? "",
        actorUserId: e.actorUserId ?? "",
        actorRole: e.actorRole ?? "",
        timestamp: e.timestamp ?? "",
        notes: e.notes ?? "",
      });
    });

    const buffer = (await workbook.xlsx.writeBuffer()) as any as Buffer;
    return {
      buffer,
      filename: `${baseName}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  throw new Error(`Unsupported export format: ${format}`);
}
