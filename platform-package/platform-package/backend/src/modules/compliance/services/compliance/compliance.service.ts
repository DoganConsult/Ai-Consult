// @ts-nocheck
// ============================================
// Shahin — Compliance Service
// Framework mapping, control testing,
// gap analysis, remediation tracking
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../config/database";
import { recordActivity } from "../../../platform/services/activity/activity-stream.service";
import { eventBus } from "../../../platform/services/event/event-bus.service";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// === Map Framework: link tenant controls to registry instrument_structure nodes ===

export async function mapFramework(tenantId: string, frameworkId: string): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);

  // Get all registry controls for this framework
  const registryControls = await safeQuery(
    `SELECT node_id, code, title_en, title_ar, level, priority, evidence_types
     FROM instrument_structure
     WHERE instrument_id = $1 AND level >= 4
     ORDER BY sort_order, code`,
    [frameworkId]
  );

  // Get tenant controls mapped to this framework
  const tenantControls = await safeQuery(
    `SELECT control_id, title, status, test_status, mapped_registry_nodes, evidence_ids
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) OR mapped_registry_nodes && $2`,
    [frameworkId, registryControls.rows.map((r: GenericRow) => r.node_id)]
  );

  // Build mapping: which registry controls are covered by tenant controls
  const mappedNodeIds = new Set<string>();
  for (const tc of tenantControls.rows) {
    for (const nodeId of (tc.mapped_registry_nodes || [])) {
      mappedNodeIds.add(nodeId);
    }
  }

  const mapping = registryControls.rows.map((rc: GenericRow) => ({
    nodeId: rc.node_id,
    code: rc.code,
    titleEn: rc.title_en,
    titleAr: rc.title_ar,
    priority: rc.priority,
    evidenceTypes: rc.evidence_types,
    mapped: mappedNodeIds.has(rc.node_id),
    tenantControls: tenantControls.rows
      .filter((tc: GenericRow) => (tc.mapped_registry_nodes || []).includes(rc.node_id))
      .map((tc: GenericRow) => ({
        controlId: tc.control_id,
        title: tc.title,
        status: tc.status,
        testStatus: tc.test_status,
      })),
  }));

  return {
    frameworkId,
    totalRegistryControls: registryControls.rows.length,
    mappedControls: mappedNodeIds.size,
    unmappedControls: registryControls.rows.length - mappedNodeIds.size,
    coveragePercent: registryControls.rows.length > 0
      ? Math.round((mappedNodeIds.size / registryControls.rows.length) * 100)
      : 0,
    mapping,
  };
}

// === Map a specific tenant control to registry nodes ===

export async function mapControlToNodes(tenantId: string, controlId: string, nodeIds: string[]): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".controls SET mapped_registry_nodes = $1 WHERE control_id = $2 RETURNING *`,
    [nodeIds, controlId]
  );
  if (result.rows.length === 0) throw new Error("Control not found");
  eventBus.publish({ eventType: 'compliance.control_mapped', tenantId, sourceService: 'ComplianceService', severity: 'info', payload: { controlId, nodeIds } });
  return getFirstRow(result);
}

// === Test Control: record test result with evidence reference ===

export async function testControl(tenantId: string, controlId: string, data: {
  testResult: 'pass' | 'fail' | 'partial';
  evidenceId?: string;
  notes?: string;
  testedBy: string;
}): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);

  const control = await safeQuery(
    `SELECT * FROM "${schema}".controls WHERE control_id = $1`, [controlId]
  );
  if (control.rows.length === 0) throw new Error("Control not found");

  // Update control test status
  const evidenceIds = getFirstRow(control)?.evidence_ids || [];
  if (data.evidenceId && !evidenceIds.includes(data.evidenceId)) {
    evidenceIds.push(data.evidenceId);
  }

  const testStatus = data.testResult === 'pass' ? 'passed'
    : data.testResult === 'fail' ? 'failed' : 'partial';

  const result = await safeQuery(
    `UPDATE "${schema}".controls SET
      test_status = $1,
      last_tested_at = NOW(),
      evidence_ids = $2,
      status = CASE WHEN $1 = 'passed' THEN 'implemented' ELSE status END
     WHERE control_id = $3
     RETURNING *`,
    [testStatus, evidenceIds, controlId]
  );

  return {
    control: getFirstRow(result),
    testResult: data.testResult,
    testedAt: new Date().toISOString(),
    testedBy: data.testedBy,
  };
}

// === Gap Analysis: compute implemented vs total controls per framework ===

export async function getGapAnalysis(tenantId: string, frameworkId: string): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);

  // Get registry controls for this framework
  const registryControls = await safeQuery(
    `SELECT node_id, code, title_en, title_ar, priority, level
     FROM instrument_structure
     WHERE instrument_id = $1 AND level >= 4
     ORDER BY sort_order, code`,
    [frameworkId]
  );

  // Get tenant controls mapped to this framework
  const tenantControls = await safeQuery(
    `SELECT control_id, title, status, test_status, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) OR mapped_registry_nodes && $2`,
    [frameworkId, registryControls.rows.map((r: GenericRow) => r.node_id)]
  );

  // Compute coverage
  const implementedNodeIds = new Set<string>();
  const partialNodeIds = new Set<string>();
  for (const tc of tenantControls.rows) {
    for (const nodeId of (tc.mapped_registry_nodes || [])) {
      if (tc.status === 'implemented' || tc.test_status === 'passed') {
        implementedNodeIds.add(nodeId);
      } else {
        partialNodeIds.add(nodeId);
      }
    }
  }

  const gaps = registryControls.rows
    .filter((rc: GenericRow) => !implementedNodeIds.has(rc.node_id))
    .map((rc: GenericRow) => ({
      nodeId: rc.node_id,
      code: rc.code,
      titleEn: rc.title_en,
      titleAr: rc.title_ar,
      priority: rc.priority,
      status: partialNodeIds.has(rc.node_id) ? 'partial' : 'not_addressed',
    }));

  const total = registryControls.rows.length;
  const implemented = implementedNodeIds.size;

  let cisoAssistantData: Record<string, any> | null = null;
  try {
    const { resolveCisoAssistantConfig } = await import('../../../integrations/services/integration-config-resolver.service');
    const cisoCfg = await resolveCisoAssistantConfig(tenantId);
    if (cisoCfg) {
      const { cisoAssistantApi } = await import('../../../../config/external-services');
      const [caControls, caMetrics] = await Promise.all([
        cisoAssistantApi.getControls(),
        cisoAssistantApi.getMetrics(),
      ]);
      if ((caControls as any[]).length > 0 || Object.keys(caMetrics as any).length > 0) {
        cisoAssistantData = { controlCount: (caControls as any[]).length, metrics: caMetrics };
      }
    }
  } catch { /* CISO Assistant unavailable — skip enrichment */ }

  return {
    frameworkId,
    totalControls: total,
    implementedControls: implemented,
    partialControls: partialNodeIds.size,
    gapCount: gaps.length,
    compliancePercent: total > 0 ? Math.round((implemented / total) * 100) : 0,
    gaps,
    byPriority: {
      high: gaps.filter((g: { priority: string; nodeId: string; code: string; titleEn: string; titleAr: string; status: string }) => g.priority === 'high').length,
      medium: gaps.filter((g: { priority: string; nodeId: string; code: string; titleEn: string; titleAr: string; status: string }) => g.priority === 'medium').length,
      low: gaps.filter((g: { priority: string; nodeId: string; code: string; titleEn: string; titleAr: string; status: string }) => g.priority === 'low' || !g.priority).length,
    },
    ...(cisoAssistantData ? { cisoAssistant: cisoAssistantData } : {}),
  };
}

// === Remediation Tracking ===

export async function createRemediation(tenantId: string, data: {
  frameworkId: string;
  nodeId: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
}): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);
  const remId = uuid().slice(0, 8);

  // Store remediation as a control with special status
  const result = await safeQuery(
    `INSERT INTO "${schema}".controls
      (control_id, title, description, frameworks, status, owner, mapped_registry_nodes)
     VALUES ($1, $2, $3, $4, 'remediation_planned', $5, $6)
     RETURNING *`,
    [
      remId,
      data.title,
      data.description || `Remediation for gap: ${data.nodeId}`,
      [data.frameworkId],
      data.assignee || '',
      [data.nodeId],
    ]
  );
  // Record activity
  try { await recordActivity(tenantId, { userId: data.assignee || 'system', module: 'compliance', action: 'create', entityType: 'remediation', entityId: remId, summary: `Created remediation: ${data.title}`, changes: {} }); } catch { /* best-effort */ }

  try {
    const { resolveOpenProjectConfig } = await import('../../../integrations/services/integration-config-resolver.service');
    const opCfg = await resolveOpenProjectConfig(tenantId);
    if (opCfg) {
      const { openProjectApi } = await import('../../../../config/external-services');
      const projectId = opCfg.projectId || process.env.OPENPROJECT_GRC_PROJECT_ID;
      if (projectId) {
        await openProjectApi.createWorkPackage(projectId, { subject: `[GRC] ${data.title}`, description: data.description || `Remediation for gap: ${data.nodeId}` });
      }
    }
  } catch { /* best-effort OpenProject sync */ }

  return getFirstRow(result);
}

export async function getRemediations(tenantId: string, frameworkId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".controls WHERE status = 'remediation_planned'`;
  const params: unknown[] = [];
  if (frameworkId) {
    sql += ` AND $1 = ANY(frameworks)`;
    params.push(frameworkId);
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function updateRemediationStatus(tenantId: string, controlId: string, status: string): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);
  const validStatuses = ['remediation_planned', 'in_progress', 'implemented', 'verified'];
  if (!validStatuses.includes(status)) throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);

  const result = await safeQuery(
    `UPDATE "${schema}".controls SET status = $1 WHERE control_id = $2 RETURNING *`,
    [status, controlId]
  );
  if (result.rows.length === 0) throw new Error("Remediation not found");
  return getFirstRow(result);
}
