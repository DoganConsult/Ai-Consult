// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/logger.service';
// ============================================
// Process Orchestration — Task Completion & Auto-Scoring
// Marks tasks completed and triggers closed-loop
// re-scoring of linked entities (controls, risks,
// evidence, compliance gaps).
// @owner DOS
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { eventBus } from '../../../../platform/dos/events/event-bus';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { swallow, EC , catchHandler } from '../../../../platform/dos/resilience/resilient-catch';

/**
 * Mark a process task as completed with optional evidence.
 * After completion, auto-re-scores the linked entity (control effectiveness,
 * residual risk, compliance posture) for full closed-loop autonomy.
 */
export async function completeProcessTask(
  tenantId: string,
  taskId: string,
  completionEvidence?: Record<string, any>,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Fetch task metadata before completing (needed for auto-scoring)
  let taskMeta: { entity_type?: string; entity_id?: string; task_type?: string } = {};
  try {
    const metaRes = await safeQuery(
      `SELECT entity_type, entity_id, task_type FROM "${schema}".process_tasks WHERE task_id = $1 LIMIT 1`,
      [taskId],
    );
    taskMeta = getFirstRow(metaRes) ?? {};
  } catch { /* non-fatal */ }

  await safeQuery(
    `UPDATE "${schema}".process_tasks
     SET status = 'completed', completed_at = NOW(),
         completion_evidence = $2
     WHERE task_id = $1 AND status != 'completed'`,
    [taskId, completionEvidence ? JSON.stringify(completionEvidence) : null],
  );

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'process_task.completed',
    tenantId,
    sourceService: 'orchestrator',
    severity: 'info',
    entityType: taskMeta.entity_type ?? 'process_task',
    entityId: taskMeta.entity_id ?? taskId,
    payload: {
      taskId,
      entityType: taskMeta.entity_type,
      entityId: taskMeta.entity_id,
      taskType: taskMeta.task_type,
      triggerSource: completionEvidence?.source ?? 'orchestrator',
    },
  }), { tenantId, operation: 'eventBus:process_task.completed' });

  // ── Auto-Scoring on Completion (closed-loop) ─────────────────────────
  // Fire-and-forget: re-score the linked entity after task completion
  autoScoreOnCompletion(tenantId, schema, taskMeta).catch((e) => {
    logger.warn(`[ProcessOrchestration] Auto-scoring failed for task ${taskId}: ${toErrorMessage(e)}`);
  });

  // ── Workflow Feedback: notify workflow engine when a workflow-linked task completes ──
  try {
    const linkRes = await safeQuery(
      `SELECT workflow_execution_id, workflow_step_id FROM "${schema}".process_tasks WHERE task_id = $1 AND workflow_execution_id IS NOT NULL`,
      [taskId],
    );
    if (linkRes.rows.length > 0 && getFirstRow(linkRes)?.workflow_execution_id) {
      await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'workflow.step_task_completed' as any,
        tenantId,
        sourceService: 'orchestrator',
        severity: 'info',
        entityType: 'workflow_execution',
        entityId: getFirstRow(linkRes)?.workflow_execution_id,
        payload: {
          taskId,
          executionId: getFirstRow(linkRes)?.workflow_execution_id,
          stepId: getFirstRow(linkRes)?.workflow_step_id,
          taskType: taskMeta.task_type,
        },
      }), { tenantId, operation: 'eventBus:workflow.step_task_completed' });
    }
  } catch { /* workflow feedback non-fatal */ }
}

/**
 * Auto-re-score the linked entity when a task completes.
 * - control → re-calculate effectiveness from linked evidence
 * - evidence → mark validated, update linked control score
 * - risk → re-calculate residual risk score
 * - compliance_gap → update compliance posture
 */
async function autoScoreOnCompletion(
  tenantId: string,
  schema: string,
  taskMeta: { entity_type?: string; entity_id?: string; task_type?: string },
): Promise<void> {
  const { entity_type, entity_id, task_type } = taskMeta;
  if (!entity_type || !entity_id) return;

  switch (entity_type) {
    case 'control': {
      // Re-score control effectiveness based on linked evidence validation status
      try {
        const evidenceRes = await safeQuery(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'validated')::int AS validated,
                  COUNT(*) FILTER (WHERE status = 'expired' OR expiry_date < NOW())::int AS expired
           FROM "${schema}".evidence
           WHERE control_id = $1`,
          [entity_id],
        );
        const { total, validated, expired } = getFirstRow(evidenceRes) ?? { total: 0, validated: 0, expired: 0 };
        const effectiveness = total > 0 ? Math.round((validated / total) * 100) : 0;

        await safeQuery(
          `UPDATE "${schema}".controls
           SET effectiveness_score = $2, last_assessed_at = NOW()
           WHERE control_id = $1`,
          [entity_id, effectiveness],
        ).catch(catchHandler(EC.EVENT_BUS, {}));

        await swallow(EC.EVENT_BUS, eventBus.publish({
          eventType: 'control.effectiveness_updated' as any,
          tenantId, sourceService: 'orchestrator', severity: 'info',
          entityType: 'control', entityId: entity_id,
          payload: { controlId: entity_id, effectiveness, total, validated, expired },
        }), { tenantId, operation: 'eventBus:control.effectiveness_updated' });
      } catch { /* non-fatal */ }
      break;
    }

    case 'evidence': {
      // Mark evidence validated if task was a review/verification, then update parent control
      if (task_type === 'control_review' || task_type === 'verification') {
        try {
          await safeQuery(
            `UPDATE "${schema}".evidence SET status = 'validated', validated_at = NOW() WHERE evidence_id = $1 AND status != 'validated'`,
            [entity_id],
          ).catch(catchHandler(EC.EVENT_BUS, {}));

          // Find linked control and trigger its re-score
          const controlRes = await safeQuery(
            `SELECT control_id FROM "${schema}".evidence WHERE evidence_id = $1 LIMIT 1`,
            [entity_id],
          );
          const controlId = getFirstRow(controlRes)?.control_id;
          if (controlId) {
            await autoScoreOnCompletion(tenantId, schema, { entity_type: 'control', entity_id: controlId });
          }

          await swallow(EC.EVENT_BUS, eventBus.publish({
            eventType: 'evidence.validated' as any,
            tenantId, sourceService: 'orchestrator', severity: 'info',
            entityType: 'evidence', entityId: entity_id,
            payload: { evidenceId: entity_id, controlId },
          }), { tenantId, operation: 'eventBus:evidence.validated' });
        } catch { /* non-fatal */ }
      }
      break;
    }

    case 'risk': {
      // Re-calculate residual risk: inherent x (1 - avg mitigation effectiveness / 100)
      try {
        const riskRes = await safeQuery(
          `SELECT r.risk_score AS inherent_score,
                  COALESCE(AVG(c.effectiveness_score), 0)::int AS avg_control_eff
           FROM "${schema}".risks r
           LEFT JOIN "${schema}".risk_control_mappings rcm ON rcm.risk_id = r.risk_id
           LEFT JOIN "${schema}".controls c ON c.control_id = rcm.control_id
           WHERE r.risk_id = $1
           GROUP BY r.risk_score`,
          [entity_id],
        );
        if (riskRes.rows.length > 0) {
          const { inherent_score, avg_control_eff } = getFirstRow(riskRes);
          const residualScore = Math.max(1, Math.round(inherent_score * (1 - avg_control_eff / 100)));

          await safeQuery(
            `UPDATE "${schema}".risks SET residual_score = $2, last_assessed_at = NOW() WHERE risk_id = $1`,
            [entity_id, residualScore],
          ).catch(catchHandler(EC.EVENT_BUS, {}));

          await swallow(EC.EVENT_BUS, eventBus.publish({
            eventType: 'risk.score_changed' as any,
            tenantId, sourceService: 'orchestrator', severity: residualScore > 15 ? 'warning' : 'info',
            entityType: 'risk', entityId: entity_id,
            payload: { riskId: entity_id, inherentScore: inherent_score, residualScore, avgControlEffectiveness: avg_control_eff },
          }), { tenantId, operation: 'eventBus:risk.score_changed' });
        }
      } catch { /* non-fatal */ }
      break;
    }

    case 'compliance_gap':
    case 'finding': {
      // Update compliance posture: count open vs total gaps/findings
      try {
        const table = entity_type === 'compliance_gap' ? 'compliance_gaps' : 'findings';
        const postureRes = await safeQuery(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status IN ('closed','resolved','remediated'))::int AS closed
           FROM "${schema}".${table}`,
          [],
        );
        const { total, closed } = getFirstRow(postureRes) ?? { total: 0, closed: 0 };
        const closureRate = total > 0 ? Math.round((closed / total) * 100) : 100;

        await swallow(EC.EVENT_BUS, eventBus.publish({
          eventType: 'compliance.posture_updated' as any,
          tenantId, sourceService: 'orchestrator', severity: 'info',
          entityType: entity_type, entityId: entity_id,
          payload: { entityType: entity_type, total, closed, closureRate },
        }), { tenantId, operation: 'eventBus:compliance.posture_updated' });
      } catch { /* non-fatal */ }
      break;
    }
  }
}
