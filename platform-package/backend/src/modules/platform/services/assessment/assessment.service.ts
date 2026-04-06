// @ts-nocheck
// ============================================
// Shahin — Assessment Service
// CRUD operations for assessments with
// auto-generation of assessment items from
// framework control structure
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../config/database";
import { recordActivity } from "./activity-stream.service";
import { eventBus } from '../event/event-bus.service';
import { getFirstRow } from '../../../../utils/db-utils';

// === Assessment CRUD ===

export async function createAssessment(
  tenantId: string,
  data: { frameworkId: string; title: string; createdBy: string }
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const assessmentId = uuid();

  // Insert the assessment
  const result = await safeQuery(
    `INSERT INTO "${schema}".assessments
      (assessment_id, framework_id, title, status, score, created_by)
     VALUES ($1, $2, $3, 'draft', 0, $4)
     RETURNING *`,
    [assessmentId, data.frameworkId, data.title, data.createdBy]
  );
  const assessment = getFirstRow(result);

  // Query framework's control nodes from instrument_structure
  const nodes = await safeQuery(
    `SELECT node_id, code, title_en FROM instrument_structure
     WHERE instrument_id = $1
     ORDER BY sort_order, node_id`,
    [data.frameworkId]
  );

  // Generate one assessment_item per control node
  for (const node of nodes.rows) {
    await safeQuery(
      `INSERT INTO "${schema}".assessment_items
        (item_id, assessment_id, control_node_id, status, notes, remediation_ids)
       VALUES ($1, $2, $3, 'not_assessed', NULL, '{}')`,
      [uuid(), assessmentId, node.node_id]
    );
  }

  // Record activity
  try { await recordActivity(tenantId, { userId: data.createdBy, module: 'assessment', action: 'create', entityType: 'assessment', entityId: assessmentId, summary: `Created assessment: ${data.title}`, changes: {} }); } catch { /* best-effort */ }

  return assessment;
}

export async function getAssessments(tenantId: string, scopeUser?: { userId: string; role: string; isSuperAdmin?: boolean; permissions?: string[] }): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const hasFullScope = scopeUser?.isSuperAdmin === true || (scopeUser?.permissions ?? []).includes('assessment.record.read_all');
  if (scopeUser && !hasFullScope) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".assessments WHERE created_by = $1 ORDER BY created_at DESC`,
      [scopeUser.userId]
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".assessments ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getAssessmentById(
  tenantId: string,
  assessmentId: string
): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".assessments WHERE assessment_id = $1`,
    [assessmentId]
  );
  return getFirstRow(result) || null;
}

export async function updateAssessment(
  tenantId: string,
  assessmentId: string,
  data: Partial<{ title: string; status: string; score: number }>
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT * FROM "${schema}".assessments WHERE assessment_id = $1`,
    [assessmentId]
  );
  if (current.rows.length === 0) throw new Error("Assessment not found");

  const result = await safeQuery(
    `UPDATE "${schema}".assessments SET
      title = COALESCE($1, title),
      status = COALESCE($2, status),
      score = COALESCE($3, score),
      updated_at = NOW()
     WHERE assessment_id = $4
     RETURNING *`,
    [
      data.title || null,
      data.status || null,
      data.score ?? null,
      assessmentId,
    ]
  );

  // EventBus: assessment status/score change
  try {
    const evtType = data.status === 'completed' ? 'compliance.assessment_completed' : 'compliance.status_changed';
    await eventBus.publish({ eventType: evtType, tenantId, sourceService: 'assessment', entityType: 'assessment', entityId: assessmentId, severity: 'info', payload: { title: getFirstRow(result)?.title, status: getFirstRow(result)?.status, score: getFirstRow(result)?.score, previousStatus: getFirstRow(current)?.status } });
  } catch { /* best-effort */ }

  return getFirstRow(result);
}

export async function deleteAssessment(
  tenantId: string,
  assessmentId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  // Unlink remediation tasks that reference items of this assessment
  // (set linked_entity_id to null where linked to assessment items being deleted)
  await safeQuery(
    `UPDATE "${schema}".remediation_tasks
     SET linked_entity_id = NULL
     WHERE linked_entity_type = 'assessment_item'
       AND linked_entity_id IN (
         SELECT item_id::text FROM "${schema}".assessment_items
         WHERE assessment_id = $1
       )`,
    [assessmentId]
  ).catch(() => {
    // remediation_tasks table may not exist yet (Phase 3)
    // silently ignore — cascade FK on assessment_items handles item deletion
  });

  // Delete the assessment (assessment_items cascade-deleted via FK)
  const result = await safeQuery(
    `DELETE FROM "${schema}".assessments WHERE assessment_id = $1 RETURNING assessment_id`,
    [assessmentId]
  );
  return result.rows.length > 0;
}

// === Assessment Score Calculation ===

/**
 * Pure function: calculates assessment score from an array of item objects.
 * Score = (count(compliant) * 1.0 + count(partially_compliant) * 0.5) / count(applicable) * 100
 * where applicable = all items except 'not_applicable'.
 * Returns 0 when there are no applicable items.
 */
export function calculateAssessmentScorePure(
  items: { status: string }[]
): number {
  const applicable = items.filter((i) => i.status !== "not_applicable");
  if (applicable.length === 0) return 0;

  const compliant = applicable.filter((i) => i.status === "compliant").length;
  const partiallyCompliant = applicable.filter(
    (i) => i.status === "partially_compliant"
  ).length;

  return ((compliant * 1.0 + partiallyCompliant * 0.5) / applicable.length) * 100;
}

/**
 * Queries all items for an assessment, computes the score,
 * updates the assessment's score field, and returns the score.
 */
export async function calculateAssessmentScore(
  tenantId: string,
  assessmentId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);

  const itemsResult = await safeQuery(
    `SELECT status FROM "${schema}".assessment_items WHERE assessment_id = $1`,
    [assessmentId]
  );

  const score = calculateAssessmentScorePure(itemsResult.rows);

  await safeQuery(
    `UPDATE "${schema}".assessments SET score = $1, updated_at = NOW() WHERE assessment_id = $2`,
    [score, assessmentId]
  );

  // EventBus: compliance score updated
  try { await eventBus.publish({ eventType: 'compliance.posture_changed', tenantId, sourceService: 'assessment', entityType: 'assessment', entityId: assessmentId, severity: score < 50 ? 'warning' : 'info', payload: { score, assessmentId } }); } catch { /* best-effort */ }

  return score;
}

/**
 * Updates an assessment item's status and triggers score recalculation.
 */
export async function updateAssessmentItemStatus(
  tenantId: string,
  itemId: string,
  status: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Update the item status
  const result = await safeQuery(
    `UPDATE "${schema}".assessment_items
     SET status = $1, updated_at = NOW()
     WHERE item_id = $2
     RETURNING *`,
    [status, itemId]
  );

  if (result.rows.length === 0) {
    throw new Error("Assessment item not found");
  }

  const item = getFirstRow(result);

  // Trigger score recalculation
  await calculateAssessmentScore(tenantId, item.assessment_id);

  return item;
}