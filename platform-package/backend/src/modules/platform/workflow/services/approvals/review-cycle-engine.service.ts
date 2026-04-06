/**
 * Review Cycle Engine — SLA monitoring, reminders, and escalation for
 * workflow instances in approval/review states.
 *
 * Runs on a scheduled cadence (typically every 15 minutes) across all
 * provisioned tenants. Checks SLA timers, creates reminder records,
 * and escalates breached items by advancing them or notifying escalation targets.
 *
 * @owner DOS
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../../../../config/database';
import { emitEvent } from '../../../../../platform/dos/events/event-bus';
import { logger } from '../../../../../platform/dos/observability/services/logger.service';
import { SYSTEM_JOB_ACTOR } from '../../../../../platform/dos/constants/system-actors';

export interface ReviewCycleResult {
  cyclesChecked: number;
  remindersCreated: number;
  escalated: number;
}

/** States considered "in review/approval" for SLA tracking */
const REVIEW_STATES = [
  'pending_review',
  'pending_approval',
  'in_review',
  'awaiting_approval',
  'under_review',
  'review',
  'approval',
];

/**
 * Check all workflow instances in review/approval states for SLA compliance.
 *
 * For each instance:
 *   1. Determine how long it has been in the current state
 *   2. Look up the SLA definition for that workflow + state
 *   3. If approaching deadline (within reminder_threshold), create a reminder
 *   4. If SLA is breached, escalate the item
 */
export async function checkReviewCycles(
  tenantId: string,
): Promise<ReviewCycleResult> {
  const schema = tenantSchema(tenantId);
  let cyclesChecked = 0;
  let remindersCreated = 0;
  let escalated = 0;

  // ── 1. Query instances in review/approval states ──
  const placeholders = REVIEW_STATES.map((_, i) => `$${i + 1}`).join(', ');
  const instancesResult = await safeQuery(
    `SELECT wi.id AS instance_id,
            wi.workflow_code,
            wi.current_state,
            wi.entity_type,
            wi.entity_id,
            wi.updated_at,
            wi.created_by
     FROM ${schema}.workflow_instances wi
     WHERE wi.current_state IN (${placeholders})
     ORDER BY wi.updated_at ASC`,
    REVIEW_STATES,
  );

  if (!instancesResult.rows.length) {
    return { cyclesChecked: 0, remindersCreated: 0, escalated: 0 };
  }

  // ── 2. Load all SLA definitions for the relevant workflows ──
  const workflowCodes = [...new Set(instancesResult.rows.map((r: any) => r.workflow_code))];
  const slaPlaceholders = workflowCodes.map((_, i) => `$${i + 1}`).join(', ');
  const slaResult = await safeQuery(
    `SELECT workflow_code, state, sla_hours, reminder_threshold_hours,
            escalation_target, escalation_action, max_reminders
     FROM ${schema}.workflow_sla_definitions
     WHERE workflow_code IN (${slaPlaceholders}) AND is_active = true`,
    workflowCodes,
  );

  // Build lookup: workflow_code:state -> SLA definition
  const slaMap = new Map<string, any>();
  for (const sla of slaResult.rows) {
    slaMap.set(`${sla.workflow_code}:${sla.state}`, sla);
  }

  const now = Date.now();

  // ── 3. Process each instance ──
  for (const instance of instancesResult.rows) {
    cyclesChecked++;

    const slaKey = `${instance.workflow_code}:${instance.current_state}`;
    const sla = slaMap.get(slaKey);

    if (!sla) {
      // No SLA defined for this workflow+state — skip
      continue;
    }

    const stateEnteredAt = new Date(instance.updated_at).getTime();
    const elapsedHours = (now - stateEnteredAt) / (1000 * 60 * 60);
    const slaHours = parseFloat(sla.sla_hours);
    const reminderThreshold = parseFloat(sla.reminder_threshold_hours ?? String(slaHours * 0.75));
    const maxReminders = parseInt(sla.max_reminders ?? '3', 10);

    // ── Check SLA breach ──
    if (elapsedHours >= slaHours) {
      const wasEscalated = await escalateInstance(
        tenantId,
        schema,
        instance,
        sla,
        elapsedHours,
        slaHours,
      );
      if (wasEscalated) escalated++;
      continue;
    }

    // ── Check reminder threshold ──
    if (elapsedHours >= reminderThreshold) {
      const reminderCreated = await createReminderIfNeeded(
        tenantId,
        schema,
        instance,
        sla,
        elapsedHours,
        slaHours,
        maxReminders,
      );
      if (reminderCreated) remindersCreated++;
    }
  }

  if (cyclesChecked > 0) {
    logger.info(
      `[REVIEW_CYCLE] tenant=${tenantId} checked=${cyclesChecked} ` +
      `reminders=${remindersCreated} escalated=${escalated}`,
    );
  }

  return { cyclesChecked, remindersCreated, escalated };
}

/**
 * Escalate a workflow instance that has breached its SLA.
 */
async function escalateInstance(
  tenantId: string,
  schema: string,
  instance: any,
  sla: any,
  elapsedHours: number,
  slaHours: number,
): Promise<boolean> {
  // Check if already escalated to prevent duplicate escalations
  const existingEscalation = await safeQuery(
    `SELECT id FROM ${schema}.workflow_escalations
     WHERE instance_id = $1 AND current_state = $2 AND resolved_at IS NULL
     LIMIT 1`,
    [instance.instance_id, instance.current_state],
  );

  if (existingEscalation.rows.length) {
    return false; // Already escalated for this state
  }

  const escalationId = uuid();

  try {
    // Record escalation
    await safeQuery(
      `INSERT INTO ${schema}.workflow_escalations
         (id, instance_id, workflow_code, current_state, sla_hours,
          elapsed_hours, escalation_target, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        escalationId,
        instance.instance_id,
        instance.workflow_code,
        instance.current_state,
        slaHours,
        Math.round(elapsedHours * 100) / 100,
        sla.escalation_target ?? null,
      ],
    );

    // Emit escalation event through DOS bus
    await emitEvent({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'workflow',
      event: 'sla.breached',
      entityType: instance.entity_type ?? 'workflow_instance',
      entityId: instance.entity_id ?? instance.instance_id,
      data: {
        escalationId,
        instanceId: instance.instance_id,
        workflowCode: instance.workflow_code,
        currentState: instance.current_state,
        slaHours,
        elapsedHours: Math.round(elapsedHours * 100) / 100,
        escalationTarget: sla.escalation_target,
        escalationAction: sla.escalation_action,
      },
    });

    logger.warn(
      `[REVIEW_CYCLE] SLA breached: instance=${instance.instance_id} ` +
      `workflow=${instance.workflow_code} state=${instance.current_state} ` +
      `elapsed=${elapsedHours.toFixed(1)}h sla=${slaHours}h tenant=${tenantId}`,
    );

    return true;
  } catch (err) {
    logger.error(
      `[REVIEW_CYCLE] Escalation failed for instance=${instance.instance_id}: ${(err as Error).message}`,
    );
    return false;
  }
}

/**
 * Create a reminder for approaching SLA deadline, if max reminders not yet reached.
 */
async function createReminderIfNeeded(
  tenantId: string,
  schema: string,
  instance: any,
  _sla: any,
  elapsedHours: number,
  slaHours: number,
  maxReminders: number,
): Promise<boolean> {
  // Count existing reminders for this instance+state
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM ${schema}.workflow_reminders
     WHERE instance_id = $1 AND current_state = $2`,
    [instance.instance_id, instance.current_state],
  );
  const existingCount = countResult.rows[0]?.cnt ?? 0;

  if (existingCount >= maxReminders) {
    return false; // Max reminders already sent
  }

  // Check cooldown: don't create reminders within 1 hour of each other
  const lastReminder = await safeQuery(
    `SELECT created_at FROM ${schema}.workflow_reminders
     WHERE instance_id = $1 AND current_state = $2
     ORDER BY created_at DESC LIMIT 1`,
    [instance.instance_id, instance.current_state],
  );
  if (lastReminder.rows.length) {
    const lastSentAt = new Date(lastReminder.rows[0].created_at).getTime();
    const hoursSinceLastReminder = (Date.now() - lastSentAt) / (1000 * 60 * 60);
    if (hoursSinceLastReminder < 1) {
      return false; // Cooldown period
    }
  }

  const reminderId = uuid();
  const remainingHours = Math.max(0, slaHours - elapsedHours);

  try {
    await safeQuery(
      `INSERT INTO ${schema}.workflow_reminders
         (id, instance_id, workflow_code, current_state, reminder_number,
          remaining_hours, target_actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        reminderId,
        instance.instance_id,
        instance.workflow_code,
        instance.current_state,
        existingCount + 1,
        Math.round(remainingHours * 100) / 100,
        instance.created_by ?? null,
      ],
    );

    // Emit reminder event
    await emitEvent({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'workflow',
      event: 'sla.reminder',
      entityType: instance.entity_type ?? 'workflow_instance',
      entityId: instance.entity_id ?? instance.instance_id,
      data: {
        reminderId,
        instanceId: instance.instance_id,
        workflowCode: instance.workflow_code,
        currentState: instance.current_state,
        reminderNumber: existingCount + 1,
        remainingHours: Math.round(remainingHours * 100) / 100,
        slaHours,
      },
    });

    return true;
  } catch (err) {
    logger.error(
      `[REVIEW_CYCLE] Reminder creation failed for instance=${instance.instance_id}: ${(err as Error).message}`,
    );
    return false;
  }
}
