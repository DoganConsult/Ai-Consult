/**
 * Workflow Execution Engine — Core workflow transition processor.
 *
 * Loads workflow definitions from module_workflow_registry, validates transitions
 * against module_lifecycle_transitions, updates instance state, logs execution,
 * and emits workflow events through the DOS event bus.
 *
 * @owner DOS
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema, withTransaction } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/services/logger.service';
import { emitWorkflowEvent } from './workflow-event-emitter.service';

export interface WorkflowTransitionResult {
  success: boolean;
  newState: string;
  previousState: string;
  transitionId: string;
}

/**
 * Execute a workflow transition for a given instance.
 *
 * 1. Load workflow definition from module_workflow_registry
 * 2. Load current instance state from workflow_instances
 * 3. Validate transition is allowed (fromState + action -> toState via module_lifecycle_transitions)
 * 4. Check actor has permission for the action
 * 5. Execute transition: update instance state, create execution log entry
 * 6. Emit workflow event via DOS event bus
 * 7. Return transition result
 */
export async function executeWorkflow(
  tenantId: string,
  workflowCode: string,
  instanceId: string,
  action: string,
  actorId: string,
  payload?: any,
): Promise<WorkflowTransitionResult> {
  const schema = tenantSchema(tenantId);
  const transitionId = uuid();

  // ── 1. Load workflow definition ──
  const defResult = await safeQuery(
    `SELECT id, workflow_code, entity_type, initial_state, is_active
     FROM ${schema}.module_workflow_registry
     WHERE workflow_code = $1 AND is_active = true
     LIMIT 1`,
    [workflowCode],
  );
  if (!defResult.rows.length) {
    logger.warn(`[WORKFLOW] Definition not found or inactive: ${workflowCode} tenant=${tenantId}`);
    throw Object.assign(
      new Error(`Workflow definition not found or inactive: ${workflowCode}`),
      { statusCode: 404, code: 'WORKFLOW_NOT_FOUND' },
    );
  }
  const workflowDef = defResult.rows[0];

  // ── 2. Load current instance state ──
  const instResult = await safeQuery(
    `SELECT id, current_state, entity_type, entity_id, locked_by, locked_at
     FROM ${schema}.workflow_instances
     WHERE id = $1
     LIMIT 1`,
    [instanceId],
  );
  if (!instResult.rows.length) {
    logger.warn(`[WORKFLOW] Instance not found: ${instanceId} tenant=${tenantId}`);
    throw Object.assign(
      new Error(`Workflow instance not found: ${instanceId}`),
      { statusCode: 404, code: 'INSTANCE_NOT_FOUND' },
    );
  }
  const instance = instResult.rows[0];
  const previousState = instance.current_state;

  // Guard: instance must not be locked by another actor
  if (instance.locked_by && instance.locked_by !== actorId) {
    const lockAge = instance.locked_at
      ? Date.now() - new Date(instance.locked_at).getTime()
      : 0;
    // Auto-release stale locks older than 10 minutes
    if (lockAge < 10 * 60 * 1000) {
      throw Object.assign(
        new Error(`Workflow instance is locked by another actor: ${instance.locked_by}`),
        { statusCode: 409, code: 'INSTANCE_LOCKED' },
      );
    }
    logger.warn(`[WORKFLOW] Auto-releasing stale lock on instance ${instanceId} (locked ${lockAge}ms ago)`);
  }

  // ── 3. Validate transition is allowed ──
  const transResult = await safeQuery(
    `SELECT id, from_status, to_status, required_permission_code, required_functional_roles
     FROM ${schema}.module_lifecycle_transitions
     WHERE module_code = $1 AND from_status = $2
     LIMIT 10`,
    [workflowCode, previousState],
  );
  const matchedTransition = transResult.rows.find(
    (r: any) => r.to_status === action || r.required_permission_code?.endsWith(`.${action}`)
  ) || transResult.rows[0];
  if (!transResult.rows.length || !matchedTransition) {
    logger.warn(
      `[WORKFLOW] Invalid transition: ${workflowCode} ${previousState} --${action}--> ? tenant=${tenantId}`,
    );
    throw Object.assign(
      new Error(
        `Transition not allowed: state=${previousState}, action=${action} for workflow=${workflowCode}`,
      ),
      { statusCode: 422, code: 'TRANSITION_NOT_ALLOWED' },
    );
  }
  const transition = { ...matchedTransition, to_state: matchedTransition.to_status, required_permission: matchedTransition.required_permission_code };
  const newState = transition.to_state;

  // ── 4. Check actor has permission for the action ──
  if (transition.required_permission) {
    const permResult = await safeQuery(
      `SELECT 1
       FROM ${schema}.actor_permissions ap
       WHERE ap.actor_id = $1
         AND ap.permission_code = $2
         AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
       LIMIT 1`,
      [actorId, transition.required_permission],
    );
    if (!permResult.rows.length) {
      // Fallback: check role-based permissions
      const rolePermResult = await safeQuery(
        `SELECT 1
         FROM ${schema}.actor_roles ar
         JOIN ${schema}.role_permissions rp ON rp.role_id = ar.role_id
         WHERE ar.actor_id = $1
           AND rp.permission_code = $2
           AND (ar.expires_at IS NULL OR ar.expires_at > NOW())
         LIMIT 1`,
        [actorId, transition.required_permission],
      );
      if (!rolePermResult.rows.length) {
        logger.warn(
          `[WORKFLOW] Actor ${actorId} lacks permission ${transition.required_permission} for action ${action}`,
        );
        throw Object.assign(
          new Error(`Actor lacks required permission: ${transition.required_permission}`),
          { statusCode: 403, code: 'PERMISSION_DENIED' },
        );
      }
    }
  }

  // ── 5. Execute transition within a transaction ──
  await withTransaction(tenantId, async (client) => {
    // Acquire advisory lock on instance to prevent concurrent transitions
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      [instanceId],
    );

    // Re-check current state inside transaction (optimistic concurrency)
    const recheck = await client.query(
      `SELECT current_state FROM ${schema}.workflow_instances WHERE id = $1 FOR UPDATE`,
      [instanceId],
    );
    if (!recheck.rows.length || recheck.rows[0].current_state !== previousState) {
      throw Object.assign(
        new Error('Instance state changed concurrently — retry the transition'),
        { statusCode: 409, code: 'CONCURRENT_MODIFICATION' },
      );
    }

    // Update instance state
    await client.query(
      `UPDATE ${schema}.workflow_instances
       SET current_state = $1,
           updated_at = NOW(),
           updated_by = $2,
           locked_by = NULL,
           locked_at = NULL
       WHERE id = $3`,
      [newState, actorId, instanceId],
    );

    // Create execution log entry
    await client.query(
      `INSERT INTO ${schema}.workflow_execution_log
         (id, workflow_code, instance_id, transition_id, from_state, to_state,
          action, actor_id, payload, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        uuid(),
        workflowCode,
        instanceId,
        transitionId,
        previousState,
        newState,
        action,
        actorId,
        payload ? JSON.stringify(payload) : null,
      ],
    );
  });

  // ── 6. Emit workflow event (fire-and-forget, outside transaction) ──
  emitWorkflowEvent(tenantId, {
    workflowCode,
    instanceId,
    action,
    fromState: previousState,
    toState: newState,
    actorId,
    entityType: instance.entity_type ?? workflowDef.entity_type,
    entityId: instance.entity_id,
  }).catch((err) => {
    logger.error(`[WORKFLOW] Failed to emit event for transition ${transitionId}: ${(err as Error).message}`);
  });

  logger.info(
    `[WORKFLOW] Transition executed: ${workflowCode} ${previousState} --${action}--> ${newState} ` +
    `instance=${instanceId} actor=${actorId} tenant=${tenantId}`,
  );

  // ── 7. Return transition result ──
  return {
    success: true,
    newState,
    previousState,
    transitionId,
  };
}

/**
 * Create a new workflow instance and set it to the initial state.
 */
export async function createWorkflowInstance(
  tenantId: string,
  workflowCode: string,
  entityType: string,
  entityId: string,
  createdBy: string,
  _metadata?: Record<string, any>,
): Promise<{ instanceId: string; initialState: string }> {
  const schema = tenantSchema(tenantId);
  const instanceId = uuid();

  // Load workflow definition for initial state
  const defResult = await safeQuery(
    `SELECT initial_state FROM ${schema}.module_workflow_registry
     WHERE workflow_code = $1 AND is_active = true LIMIT 1`,
    [workflowCode],
  );
  if (!defResult.rows.length) {
    throw Object.assign(
      new Error(`Workflow definition not found or inactive: ${workflowCode}`),
      { statusCode: 404, code: 'WORKFLOW_NOT_FOUND' },
    );
  }
  const initialState = defResult.rows[0].initial_state;

  await safeQuery(
    `INSERT INTO ${schema}.workflow_instances
       (id, workflow_code, entity_type, entity_id, current_state, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [instanceId, workflowCode, entityType, entityId, initialState, createdBy],
  );

  // Emit creation event
  emitWorkflowEvent(tenantId, {
    workflowCode,
    instanceId,
    action: 'created',
    fromState: 'none',
    toState: initialState,
    actorId: createdBy,
    entityType,
    entityId,
  }).catch((err) => {
    logger.error(`[WORKFLOW] Failed to emit creation event: ${(err as Error).message}`);
  });

  logger.info(
    `[WORKFLOW] Instance created: ${workflowCode} state=${initialState} entity=${entityType}:${entityId} tenant=${tenantId}`,
  );

  return { instanceId, initialState };
}

/**
 * Get the current state and metadata of a workflow instance.
 */
export async function getWorkflowInstance(
  tenantId: string,
  instanceId: string,
): Promise<{
  instanceId: string;
  workflowCode: string;
  currentState: string;
  entityType: string;
  entityId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
} | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, workflow_code, current_state, entity_type, entity_id,
            created_by, created_at, updated_at
     FROM ${schema}.workflow_instances
     WHERE id = $1
     LIMIT 1`,
    [instanceId],
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    instanceId: row.id,
    workflowCode: row.workflow_code,
    currentState: row.current_state,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List allowed transitions from the current state of a workflow instance.
 */
export async function getAvailableTransitions(
  tenantId: string,
  instanceId: string,
  _actorId?: string,
): Promise<Array<{ action: string; toState: string; requiredPermission: string | null }>> {
  const schema = tenantSchema(tenantId);

  const instResult = await safeQuery(
    `SELECT workflow_code, current_state FROM ${schema}.workflow_instances WHERE id = $1 LIMIT 1`,
    [instanceId],
  );
  if (!instResult.rows.length) return [];

  const { workflow_code, current_state } = instResult.rows[0];

  const transitions = await safeQuery(
    `SELECT to_status, required_permission_code
     FROM ${schema}.module_lifecycle_transitions
     WHERE module_code = $1 AND from_status = $2
     ORDER BY to_status`,
    [workflow_code, current_state],
  );

  return transitions.rows.map((r: any) => ({
    action: r.to_status,
    toState: r.to_status,
    requiredPermission: r.required_permission_code ?? null,
  }));
}
