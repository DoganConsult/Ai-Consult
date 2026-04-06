// ============================================
// Shahin — Auto-Evaluation Service
// Evaluates evidence quality and recomputes
// risk scores on a schedule (every 2 hours).
// Triggers workflows on failures and escalates
// significant risk score changes.
//
// Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { enforceEvidencePolicy } from '../../../evidence/services/core/evidence.service';
import { validateEvidence } from '../../../evidence/services/analysis/evidence-catalog.service';
import { eventBus } from '../event/event-bus.service';
import { evaluateAndTrigger } from '../../../ai/services/workflow/ai-workflow-trigger.service';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { createNotification } from '../../../notification/services/notification.service';
import type { AutoEvalResult } from '../../../../types/engagement.types';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

// ── Constants ──────────────────────────────────────────────────────────────

const EVAL_COOLDOWN_HOURS = 24;
const RISK_SCORE_CHANGE_THRESHOLD = 10;

// ── Auto-Evaluation ────────────────────────────────────────────────────────

/**
 * Run auto-evaluation cycle:
 * 1. Evaluate evidence not evaluated in the last 24h
 * 2. Recompute risk scores not scored in the last 24h
 * 3. Trigger workflows on evidence failures
 * 4. Escalate significant risk score changes (> 10 points)
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */
export async function runAutoEvaluation(tenantId: string): Promise<AutoEvalResult> {
  const startMs = Date.now();
  const schema = tenantSchema(tenantId);
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - EVAL_COOLDOWN_HOURS);
  const cutoffISO = cutoff.toISOString();

  let evidenceEvaluated = 0;
  let evidenceFailed = 0;
  let risksRecomputed = 0;
  let risksEscalated = 0;

  // ── Step 1: Evaluate evidence not evaluated in last 24h ──
  try {
    const evidenceItems = await safeQuery(
      `SELECT evidence_id, control_id, title, vendor_id, owner,
              submitted_at, metadata
       FROM "${schema}".evidence
       WHERE (last_evaluated_at IS NULL OR last_evaluated_at < $1)`,
      [cutoffISO],
    );

    for (const item of evidenceItems.rows) {
      try {
        // Run evidence policy check
        const policyResult = await enforceEvidencePolicy(
          tenantId,
          item.control_id,
          ['document', 'screenshot', 'log'],
        );

        // Run evidence validation
        const metadata = item.metadata || {};
        const validationResult = validateEvidence({
          date: metadata.date || item.submitted_at,
          owner: metadata.owner || item.owner,
          systemReference: metadata.systemReference,
          ticketId: metadata.ticketId,
          approvalTrail: metadata.approvalTrail,
        });

        evidenceEvaluated++;

        // Mark as evaluated
        await safeQuery(
          `UPDATE "${schema}".evidence SET last_evaluated_at = NOW() WHERE evidence_id = $1`,
          [item.evidence_id],
        );

        // Check for failures
        const hasPolicyFailure = !policyResult.compliant;
        const hasValidationFailure = !validationResult.passed;

        if (hasPolicyFailure || hasValidationFailure) {
          evidenceFailed++;

          // Trigger workflow via ai-workflow-trigger
          try {
            await evaluateAndTrigger(tenantId, 'system', {
              type: 'compliance_gap',
              entityId: item.evidence_id,
              gapPercent: hasPolicyFailure ? (policyResult.missing?.length || 1) * 25 : 0,
              description: `Evidence ${item.title} failed evaluation`,
            });
          } catch {
            // Non-fatal: workflow trigger failure
          }

          // Publish vendor.evidence_rejected event
          await eventBus.publish({
            eventType: 'vendor.evidence_rejected' as any,
            tenantId,
            sourceService: 'auto-eval',
            entityType: 'evidence',
            entityId: item.evidence_id,
            severity: 'warning',
            payload: {
              evidenceId: item.evidence_id,
              controlId: item.control_id,
              vendorId: item.vendor_id,
              policyCompliant: policyResult.compliant,
              validationPassed: validationResult.passed,
              missingTypes: policyResult.missing || [],
            },
          });
        }
      } catch {
        // Non-fatal: skip individual evidence item on error
      }
    }
  } catch {
    // Non-fatal: evidence evaluation step failure
  }

  // ── Step 2: Recompute risk scores not scored in last 24h ──
  try {
    const risks = await safeQuery(
      `SELECT risk_id, title, likelihood, impact, risk_score, owner
       FROM "${schema}".risks
       WHERE (last_scored_at IS NULL OR last_scored_at < $1)`,
      [cutoffISO],
    );

    for (const risk of risks.rows) {
      try {
        const likelihood = Number(risk.likelihood) || 1;
        const impact = Number(risk.impact) || 1;
        const newScore = likelihood * impact;
        const previousScore = Number(risk.risk_score) || 0;

        // Update risk score and last_scored_at
        await safeQuery(
          `UPDATE "${schema}".risks
           SET risk_score = $1, last_scored_at = NOW()
           WHERE risk_id = $2`,
          [newScore, risk.risk_id],
        );

        risksRecomputed++;

        // Check for significant change (> 10 points)
        const delta = Math.abs(newScore - previousScore);
        if (delta > RISK_SCORE_CHANGE_THRESHOLD) {
          risksEscalated++;

          // Trigger escalation workflow
          try {
            await evaluateAndTrigger(tenantId, 'system', {
              type: 'risk',
              entityId: risk.risk_id,
              score: newScore,
              description: `Risk score changed by ${delta} points (${previousScore} → ${newScore})`,
            });
          } catch {
            // Non-fatal
          }

          // Publish risk.changed event
          await eventBus.publish({
            eventType: 'risk.changed' as any,
            tenantId,
            sourceService: 'auto-eval',
            entityType: 'risk',
            entityId: risk.risk_id,
            severity: delta > 15 ? 'critical' : 'warning',
            payload: {
              riskId: risk.risk_id,
              title: risk.title,
              previousScore,
              newScore,
              delta,
              owner: risk.owner,
            },
          });

          // Notify risk owner
          if (risk.owner) {
            try {
              await createNotification(tenantId, {
                userId: risk.owner,
                type: 'risk_score_change',
                title: `Risk score changed: ${risk.title}`,
                body: `Score changed from ${previousScore} to ${newScore} (Δ${delta})`,
                link: `/risks/${risk.risk_id}`,
              });
            } catch {
              // Non-fatal
            }
          }
        }
      } catch {
        // Non-fatal: skip individual risk on error
      }
    }
  } catch {
    // Non-fatal: risk recomputation step failure
  }

  // Record audit trail
  await recordAudit({
    tenantId,
    userId: SYSTEM_JOB_ACTOR,
    module: 'auto-eval',
    action: 'create',
    entityType: 'auto_eval_cycle',
    entityId: tenantId,
    afterState: { evidenceEvaluated, evidenceFailed, risksRecomputed, risksEscalated },
  });

  return {
    tenantId,
    evidenceEvaluated,
    evidenceFailed,
    risksRecomputed,
    risksEscalated,
    cycleMs: Date.now() - startMs,
  };
}
