// @ts-nocheck
// ============================================================
// Cooperative Workflow #7 — Smart Nudge Negotiation
// When user snoozes/dismisses a nudge, agent asks why and adapts.
// "Blocked" → auto-creates dependency task.
// "Need more info" → agent fetches context and re-nudges.
// ============================================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { createProcessTask } from '../../workflows/index';
import type { NudgeFeedback } from '../../../../types/cooperative-workflows.types';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC , catchHandler } from '../../../../utils/resilient-catch';

// ── Submit Nudge Feedback ──────────────────────────────────────────────────

export async function submitNudgeFeedback(tenantId: string, input: {
  nudgeId: string; userId: string;
  action: 'snoozed' | 'dismissed';
  reason: 'blocked_by_dependency' | 'need_more_info' | 'reprioritized' | 'not_relevant' | 'other';
  freeText?: string;
}): Promise<NudgeFeedback> {
  const schema = tenantSchema(tenantId);

  let agentFollowUp: string | undefined;
  let followUpTaskId: string | undefined;

  // Agent reacts based on reason
  switch (input.reason) {
    case 'blocked_by_dependency': {
      const taskRes = await createProcessTask(tenantId, {
        title: `Resolve blocker for nudge: ${input.nudgeId}`,
        description: `User reported being blocked. ${input.freeText || 'No additional details provided.'}`,
        taskType: 'remediation',
        priority: 'medium',
        dueInHours: 72,
        triggerSource: 'nudge-negotiation',
        createdBy: input.userId,
      });
      followUpTaskId = taskRes?.taskId;
      agentFollowUp = `Created dependency resolution task. I'll re-nudge once the blocker is resolved.`;
      break;
    }
    case 'need_more_info': {
      // Fetch context and prepare a richer nudge
      agentFollowUp = await gatherAdditionalContext(schema, input.nudgeId);
      break;
    }
    case 'reprioritized': {
      agentFollowUp = `Understood. I'll lower the priority of this item and check back in 7 days.`;
      // Snooze the nudge for 7 days by updating its priority
      await safeQuery(
        `UPDATE "${schema}".nudges SET priority = 'low' WHERE nudge_id = $1`, [input.nudgeId],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      break;
    }
    case 'not_relevant': {
      agentFollowUp = `Noted. I won't nudge about this item again.`;
      await safeQuery(
        `UPDATE "${schema}".nudges SET dismissed = TRUE WHERE nudge_id = $1`, [input.nudgeId],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
      break;
    }
    default: {
      agentFollowUp = input.freeText ? `Thanks for the feedback. I'll adjust accordingly.` : undefined;
    }
  }

  const res = await safeQuery(
    `INSERT INTO "${schema}".nudge_feedback
       (nudge_id, user_id, action, reason, free_text, agent_follow_up, follow_up_task_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING feedback_id, created_at`,
    [input.nudgeId, input.userId, input.action, input.reason,
     input.freeText || null, agentFollowUp || null, followUpTaskId || null],
  );

  await eventBus.publish({
    tenantId, eventType: 'nudge.feedback_received', severity: 'info',
    entityId: input.nudgeId,
    payload: { reason: input.reason, action: input.action, hasFollowUp: !!agentFollowUp },
  });

  return {
    feedbackId: getFirstRow(res)?.feedback_id,
    nudgeId: input.nudgeId, userId: input.userId,
    action: input.action, reason: input.reason,
    freeText: input.freeText, agentFollowUp, followUpTaskId,
    createdAt: getFirstRow(res)?.created_at,
  };
}

// ── Get Feedback History ───────────────────────────────────────────────────

export async function getNudgeFeedbackHistory(tenantId: string, userId?: string): Promise<NudgeFeedback[]> {
  const schema = tenantSchema(tenantId);
  const where = userId ? `WHERE user_id = $1` : '';
  const params = userId ? [userId] : [];
  const res = await safeQuery(
    `SELECT * FROM "${schema}".nudge_feedback ${where} ORDER BY created_at DESC LIMIT 100`, params,
  );
  return res.rows.map(mapFeedback);
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function gatherAdditionalContext(schema: string, nudgeId: string): Promise<string> {
  // Look up the nudge to understand what it's about
  const nudgeRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT target_module, target_action, body_en FROM "${schema}".nudges WHERE nudge_id = $1`, [nudgeId],
  ), { operation: 'query nudge_feedback' });

  if (!nudgeRes.rows.length) return 'I could not find additional context for this item.';

  const nudge = getFirstRow(nudgeRes);
  const parts: string[] = [`Here's more context about "${nudge.target_action}":`];

  // Try to find related documentation or guidance
  if (nudge.target_module?.includes('evidence')) {
    parts.push('Evidence collection requires uploading proof that controls are operating effectively. Check the Evidence Library for templates.');
  } else if (nudge.target_module?.includes('risk')) {
    parts.push('Risk reviews ensure your risk register stays current. Focus on risks with the highest inherent scores first.');
  } else if (nudge.target_module?.includes('policy')) {
    parts.push('Policy reviews keep your governance framework aligned with regulatory changes. Start with policies approaching their review date.');
  } else {
    parts.push('Please review the relevant module documentation for detailed guidance.');
  }

  return parts.join(' ');
}

function mapFeedback(r: any): NudgeFeedback {
  return {
    feedbackId: r.feedback_id, nudgeId: r.nudge_id, userId: r.user_id,
    action: r.action, reason: r.reason, freeText: r.free_text,
    agentFollowUp: r.agent_follow_up, followUpTaskId: r.follow_up_task_id,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}
