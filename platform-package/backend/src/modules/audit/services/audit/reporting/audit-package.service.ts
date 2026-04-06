// @ts-nocheck
// ============================================
// Shahin — Audit Package Service
// Bundles assessment + evidence + remediation
// data into a downloadable audit package
// ============================================

import { safeQuery, tenantSchema } from '../../../../../config/database';
import { getFirstRow } from '../../../../../utils/db-utils';
import type { GenericRow } from '../../../../../types/db-rows.types';
import { getClearanceFilterHierarchy } from '../../../../remediation/services/clearance.service';

// === Pure bundle function (useful for testing) ===

export function bundleAuditPackage(
  assessment: GenericRow | null,
  items: GenericRow[],
  evidence: GenericRow[],
  remediationTasks: GenericRow[]
): {
  assessment: GenericRow | null;
  items: GenericRow[];
  evidence: GenericRow[];
  remediationTasks: GenericRow[];
  generatedAt: Date;
} {
  return {
    assessment,
    items,
    evidence,
    remediationTasks,
    generatedAt: new Date(),
  };
}

// === Database-backed audit package generation ===

export async function generateAssessmentAuditPackage(
  tenantId: string,
  assessmentId: string,
  userRole?: string
): Promise<{
  assessment: GenericRow | null;
  items: GenericRow[];
  evidence: GenericRow[];
  remediationTasks: GenericRow[];
  generatedAt: Date;
}> {
  const schema = tenantSchema(tenantId);

  // 1. Fetch the assessment record
  const assessmentResult = await safeQuery(
    `SELECT * FROM "${schema}".assessments WHERE assessment_id = $1`,
    [assessmentId]
  );
  if (assessmentResult.rows.length === 0) {
    throw new Error('Assessment not found');
  }
  const assessment = getFirstRow(assessmentResult);

  // 2. Fetch all assessment items for this assessment
  const itemsResult = await safeQuery(
    `SELECT * FROM "${schema}".assessment_items WHERE assessment_id = $1 ORDER BY control_node_id`,
    [assessmentId]
  );
  const items = itemsResult.rows;

  // 3. Fetch evidence linked to the assessment's framework controls (P5.5: filter by clearance)
  let evidenceSql = `SELECT e.* FROM "${schema}".evidence e
     WHERE e.control_id IN (
       SELECT control_node_id FROM "${schema}".assessment_items WHERE assessment_id = $1
     )`;
  let evidenceParams: any[] = [assessmentId];
  
  if (userRole) {
    const clearanceFilter = getClearanceFilterHierarchy(userRole, 'confidentiality_level', 2);
    evidenceSql += ` AND ${clearanceFilter.condition}`;
    evidenceParams.push(clearanceFilter.paramValue);
  }
  
  evidenceSql += ` ORDER BY e.created_at DESC`;
  
  const evidenceResult = await safeQuery(evidenceSql, evidenceParams);
  const evidence = evidenceResult.rows;

  // 4. Fetch remediation tasks linked to the assessment items
  const remediationResult = await safeQuery(
    `SELECT * FROM "${schema}".remediation_tasks
     WHERE linked_entity_type = 'assessment_item'
       AND linked_entity_id IN (
         SELECT item_id::text FROM "${schema}".assessment_items WHERE assessment_id = $1
       )
     ORDER BY created_at DESC`,
    [assessmentId]
  );
  const remediationTasks = remediationResult.rows;

  return bundleAuditPackage(assessment, items, evidence, remediationTasks);
}
