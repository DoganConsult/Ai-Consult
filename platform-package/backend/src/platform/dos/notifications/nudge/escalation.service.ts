// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../observability/services/logger.service';
import { safeQuery, safeQueryWithClient, tenantSchema } from "../../../../config/database";
import { withTransaction } from '../../../../config/db/transaction';
import { getProductUrl } from '../../branding/product-identity';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { SYSTEM_JOB_ACTOR } from '../../constants/system-actors';

async function getSlaForTransition(tenantId: string, transition: string): Promise<number | null> {
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT sla_hours FROM "${schema}".workflow_sla_config WHERE transition_code = $1 AND is_active = true LIMIT 1`,
      [transition],
    );
    if (rows.length > 0 && rows[0].sla_hours != null) return Number(rows[0].sla_hours);
  } catch { /* table may not exist */ }
  return null;
}

/** First matching transition wins; otherwise defaultHours. */
async function resolveSlaHours(
  tenantId: string,
  transitions: string[],
  defaultHours: number,
): Promise<number> {
  for (const tr of transitions) {
    const h = await getSlaForTransition(tenantId, tr);
    if (h != null && Number.isFinite(h) && h > 0) return h;
  }
  return defaultHours;
}

async function logPolicyDecision(tenantId: string, decision: Record<string, any>): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('policy_decision', $1, 'info', $2)`,
      [JSON.stringify(decision), decision.module_code || 'platform'],
    );
  } catch { /* non-blocking */ }
}

// === Types ===

export interface ApprovalForEscalation {
  approval_id: string;
  approver_id: string;
  status: string;
  sla_deadline: string | null;
  escalation_chain: string[];
}

export interface EscalationResult {
  approvalId: string;
  previousApprover: string;
  newApprover: string;
  escalatedAt: string;
}

// === Pure function for property testing ===

/**
 * Given an approval and its escalation chain, determines the escalation outcome.
 * Returns the new approver if escalation is possible, or null if the chain is exhausted.
 *
 * Rules:
 * - The approval must be 'pending' and past its SLA deadline
 * - The current approver is found in the chain; the next person in the chain becomes the new approver
 * - If the current approver is not in the chain, the first person in the chain is used
 * - If the chain is empty or exhausted, returns null (no escalation possible)
 */
export function escalateApproval(
  approval: { approver_id: string; status: string; sla_deadline: string | null },
  escalationChain: string[],
  now: Date = new Date()
): { shouldEscalate: boolean; newApprover: string | null } {
  // Only escalate pending approvals past SLA
  if (approval.status !== 'pending') {
    return { shouldEscalate: false, newApprover: null };
  }

  if (!approval.sla_deadline) {
    return { shouldEscalate: false, newApprover: null };
  }

  const deadline = new Date(approval.sla_deadline);
  if (now <= deadline) {
    return { shouldEscalate: false, newApprover: null };
  }

  // Past SLA — find next approver in chain
  if (escalationChain.length === 0) {
    return { shouldEscalate: false, newApprover: null };
  }

  const currentIndex = escalationChain.indexOf(approval.approver_id);

  if (currentIndex === -1) {
    // Current approver not in chain — escalate to first in chain
    return { shouldEscalate: true, newApprover: escalationChain[0] };
  }

  if (currentIndex < escalationChain.length - 1) {
    // Escalate to next in chain
    return { shouldEscalate: true, newApprover: escalationChain[currentIndex + 1] };
  }

  // End of chain — no further escalation possible
  return { shouldEscalate: false, newApprover: null };
}

// === Escalation Log ===

export interface EscalationLogInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  escalationLevel: number;
  escalationReason: string;
  escalatedFromUserId: string;
  escalatedToUserId: string | null;
  escalatedToRole: string;
  priority: string;
  tags: string[];
  autoEscalated: boolean;
}

/**
 * Persist an escalation log record and return its ID.
 */
export async function createEscalationLog(input: EscalationLogInput): Promise<string | null> {
  try {
    const schema = tenantSchema(input.tenantId);
    const result = await safeQuery(
      `INSERT INTO "${schema}".agrc_event_log
        (event_type, payload, severity, source_service)
       VALUES ('escalation_log', $1, 'high', 'escalation')
       RETURNING id`,
      [JSON.stringify(input)],
    );
    return result.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

// === DB-backed escalation check ===

export async function checkEscalations(tenantId: string): Promise<EscalationResult[]> {
  const schema = tenantSchema(tenantId);
  const results: EscalationResult[] = [];

  const pendingSlaHours = await resolveSlaHours(tenantId, ['approval_pending', 'default'], 72);

  // Find pending approval_requests past their SLA deadline (SLA hours from workflow_sla_config or default)
  const overdueResult = await safeQuery(
    `SELECT approval_id, current_approver_id, status, approver_chain, current_step, created_at,
            COALESCE(sla_deadline, created_at + ($1::numeric * INTERVAL '1 hour')) AS effective_deadline
     FROM "${schema}".approval_requests
     WHERE status = 'pending'
       AND COALESCE(sla_deadline, created_at + ($1::numeric * INTERVAL '1 hour')) < NOW()`,
    [pendingSlaHours],
  );

  const now = new Date();

  for (const row of overdueResult.rows) {
    // Build escalation chain from approver_chain
    const approverChain = row.approver_chain || [];
    const chain: string[] = approverChain
      .map((step: GenericRow) => step.resolvedUserId || step.userId || step.role)
      .filter(Boolean);

    const { shouldEscalate, newApprover } = escalateApproval(
      { approver_id: row.current_approver_id, status: 'pending', sla_deadline: row.effective_deadline },
      chain,
      now
    );

    if (shouldEscalate && newApprover) {
      const escalationSlaHours = await resolveSlaHours(
        tenantId,
        ['approval_escalation', 'escalation'],
        24,
      );
      const newStep = Math.min((row.current_step || 0) + 1, chain.length - 1);
      await withTransaction(tenantId, async (client) => {
        await safeQueryWithClient(
          `UPDATE "${schema}".approval_requests
           SET current_approver_id = $1, current_step = $2,
               sla_deadline = NOW() + ($4::numeric * INTERVAL '1 hour'),
               updated_at = NOW()
           WHERE approval_id = $3`,
          [newApprover, newStep, row.approval_id, escalationSlaHours], client,
        );

        await safeQueryWithClient(
          `INSERT INTO "${schema}".audit_trail
            (user_id, module, action, entity_type, entity_id, details)
           VALUES ('system', 'workflow', 'escalate', 'approval', $1, $2)`,
          [row.approval_id, JSON.stringify({
            previousApprover: row.current_approver_id,
            newApprover,
            slaDeadline: row.effective_deadline,
          })], client,
        );
      });

      // Dispatch in-app notification to the new approver
      try {
        const { createNotification } = await import('../../../../modules/notification/services/notification.service');
        await createNotification(tenantId, {
          userId: newApprover,
          type: 'escalation',
          title: `Approval escalated to you`,
          body: `Approval ${row.approval_id} was escalated from ${row.current_approver_id} due to SLA breach.`,
          link: `/approvals/${row.approval_id}`,
        });
      } catch {
        logger.warn(`[Escalation] Could not send notification to ${newApprover}`);
      }

      // Send escalation email (best-effort)
      try {
        const { sendTemplatedEmail } = await import('../email.service');
        const userResult = await safeQuery(
          `SELECT email, full_name FROM users WHERE user_id = $1 AND tenant_id = $2`,
          [newApprover, tenantId]
        );
        if (userResult.rows.length > 0) {
          const u = getFirstRow(userResult);
          await sendTemplatedEmail(u.email, 'escalation', {
            recipientName: u.full_name,
            title: 'Approval Escalated to You',
            body: `An approval has been escalated to you because the previous approver did not respond before the SLA deadline.`,
            ctaLabel: 'Review Approval',
            ctaUrl: `${getProductUrl()}/approvals/${row.approval_id}`,
          });
        }
      } catch {
        logger.warn(`[Escalation] Could not send email to ${newApprover}`);
      }

      // Phase 0: log escalation decision
      try {
        await logPolicyDecision(tenantId, {
          decision_type: 'approval_escalated',
          user_id: SYSTEM_JOB_ACTOR,
          module_code: row.entity_type || 'approval',
          input_context: { approvalId: row.approval_id, previousApprover: row.current_approver_id, newApprover, slaDeadline: row.effective_deadline },
          decision: 'escalated',
          reason: `SLA breach: approval ${row.approval_id} escalated from ${row.current_approver_id} to ${newApprover}`,
        });
      } catch { /* Phase 0 logging best-effort */ }

      try {
        const { emitWorkflowEvent } = await import('../../workflows');
        emitWorkflowEvent({
          tenantId, instanceId: row.approval_id,
          eventType: 'escalated', triggeredBy: SYSTEM_JOB_ACTOR,
          previousState: 'pending', newState: 'escalated',
          payload: { previousApprover: row.current_approver_id, newApprover, reason: 'SLA breach' },
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      } catch { /* best-effort */ }

      results.push({
        approvalId: row.approval_id,
        previousApprover: row.current_approver_id,
        newApprover,
        escalatedAt: now.toISOString(),
      });
    }
  }

  return results;
}
