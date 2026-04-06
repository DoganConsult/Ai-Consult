/**
 * Cross-Module Chain Handler — orchestrates multi-step processes that span
 * multiple modules (e.g. risk assessment -> control evaluation -> evidence request).
 *
 * Chains are persisted in the cross_module_chains table and advanced step by step.
 * Each step targets a specific module+action. Failure handling includes rollback
 * markers and compensation tracking.
 *
 * @owner DOS
 */

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema, withTransaction } from '../../../../config/database';
import { emitEvent } from '../../../../platform/dos/events/event-bus';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ── Types ──

export interface ChainStepDefinition {
  moduleCode: string;
  action: string;
  payload?: unknown;
  timeoutMs?: number;
  compensationAction?: string;
}

export interface ChainDefinition {
  chainCode: string;
  steps: ChainStepDefinition[];
  initiatorId: string;
  metadata?: Record<string, any>;
}

export interface ChainStatus {
  chainId: string;
  chainCode: string;
  currentStep: number;
  totalSteps: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';
  nextAction?: string;
  nextModule?: string;
  startedAt: string;
  updatedAt: string;
}

export interface AdvanceResult {
  chainId: string;
  currentStep: number;
  status: string;
  nextAction?: string;
}

// ── Public API ──

/**
 * Start a new cross-module chain execution.
 *
 * Creates the chain record with all steps, sets status to 'running',
 * and returns the chain ID with the first action to execute.
 */
export async function startChain(
  tenantId: string,
  chainDef: ChainDefinition,
): Promise<{ chainId: string; status: string; nextAction?: string; nextModule?: string }> {
  const schema = tenantSchema(tenantId);
  const chainId = uuid();

  if (!chainDef.steps.length) {
    throw Object.assign(
      new Error('Chain must have at least one step'),
      { statusCode: 422, code: 'EMPTY_CHAIN' },
    );
  }

  await withTransaction(tenantId, async (client) => {
    // Insert chain header
    await client.query(
      `INSERT INTO ${schema}.cross_module_chains
         (id, chain_code, initiator_id, total_steps, current_step, status,
          metadata, started_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, 'running', $5, NOW(), NOW())`,
      [
        chainId,
        chainDef.chainCode,
        chainDef.initiatorId,
        chainDef.steps.length,
        chainDef.metadata ? JSON.stringify(chainDef.metadata) : null,
      ],
    );

    // Insert chain steps
    for (let i = 0; i < chainDef.steps.length; i++) {
      const step = chainDef.steps[i];
      await client.query(
        `INSERT INTO ${schema}.cross_module_chain_steps
           (id, chain_id, step_index, module_code, action, payload,
            timeout_ms, compensation_action, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          uuid(),
          chainId,
          i,
          step.moduleCode,
          step.action,
          step.payload ? JSON.stringify(step.payload) : null,
          step.timeoutMs ?? null,
          step.compensationAction ?? null,
          i === 0 ? 'pending' : 'waiting',
        ],
      );
    }
  });

  const firstStep = chainDef.steps[0];

  // Emit chain started event
  emitEvent({
    tenantId,
    userId: chainDef.initiatorId,
    module: 'platform',
    event: 'chain.started',
    entityType: 'cross_module_chain',
    entityId: chainId,
    data: {
      chainId,
      chainCode: chainDef.chainCode,
      totalSteps: chainDef.steps.length,
      firstModule: firstStep.moduleCode,
      firstAction: firstStep.action,
    },
  }).catch((err) => {
    logger.error(`[CHAIN] Failed to emit chain.started: ${(err as Error).message}`);
  });

  logger.info(
    `[CHAIN] Started: chainId=${chainId} code=${chainDef.chainCode} ` +
    `steps=${chainDef.steps.length} initiator=${chainDef.initiatorId} tenant=${tenantId}`,
  );

  return {
    chainId,
    status: 'running',
    nextAction: firstStep.action,
    nextModule: firstStep.moduleCode,
  };
}

/**
 * Advance a chain after a step completes.
 *
 * On success: marks current step complete, advances to next step or completes the chain.
 * On failure: marks step as failed, initiates compensation if defined, or fails the chain.
 */
export async function advanceChain(
  tenantId: string,
  chainId: string,
  stepResult: { success: boolean; output?: unknown; error?: string },
): Promise<AdvanceResult> {
  const schema = tenantSchema(tenantId);

  // Load chain
  const chainResult = await safeQuery(
    `SELECT id, chain_code, current_step, total_steps, status, initiator_id
     FROM ${schema}.cross_module_chains
     WHERE id = $1`,
    [chainId],
  );
  if (!chainResult.rows.length) {
    throw Object.assign(
      new Error(`Chain not found: ${chainId}`),
      { statusCode: 404, code: 'CHAIN_NOT_FOUND' },
    );
  }

  const chain = chainResult.rows[0];

  if (chain.status !== 'running' && chain.status !== 'compensating') {
    throw Object.assign(
      new Error(`Chain is not in a runnable state: ${chain.status}`),
      { statusCode: 422, code: 'CHAIN_NOT_RUNNABLE' },
    );
  }

  const currentStepIndex = chain.current_step;

  // Load current step
  const stepRow = await safeQuery(
    `SELECT id, module_code, action, compensation_action
     FROM ${schema}.cross_module_chain_steps
     WHERE chain_id = $1 AND step_index = $2`,
    [chainId, currentStepIndex],
  );
  if (!stepRow.rows.length) {
    throw Object.assign(
      new Error(`Step not found: chain=${chainId} step=${currentStepIndex}`),
      { statusCode: 500, code: 'STEP_NOT_FOUND' },
    );
  }

  const currentStep = stepRow.rows[0];

  if (stepResult.success) {
    return await handleStepSuccess(tenantId, schema, chain, currentStep, currentStepIndex, stepResult);
  } else {
    return await handleStepFailure(tenantId, schema, chain, currentStep, currentStepIndex, stepResult);
  }
}

/**
 * Get the current status of a chain.
 */
export async function getChainStatus(
  tenantId: string,
  chainId: string,
): Promise<ChainStatus | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT id, chain_code, current_step, total_steps, status,
            started_at, updated_at
     FROM ${schema}.cross_module_chains
     WHERE id = $1`,
    [chainId],
  );
  if (!result.rows.length) return null;

  const chain = result.rows[0];

  // Get next step info if chain is running
  let nextAction: string | undefined;
  let nextModule: string | undefined;

  if (chain.status === 'running' && chain.current_step < chain.total_steps) {
    const nextStep = await safeQuery(
      `SELECT module_code, action FROM ${schema}.cross_module_chain_steps
       WHERE chain_id = $1 AND step_index = $2`,
      [chainId, chain.current_step],
    );
    if (nextStep.rows.length) {
      nextAction = nextStep.rows[0].action;
      nextModule = nextStep.rows[0].module_code;
    }
  }

  return {
    chainId: chain.id,
    chainCode: chain.chain_code,
    currentStep: chain.current_step,
    totalSteps: chain.total_steps,
    status: chain.status,
    nextAction,
    nextModule,
    startedAt: chain.started_at,
    updatedAt: chain.updated_at,
  };
}

// ── Internal helpers ──

async function handleStepSuccess(
  tenantId: string,
  schema: string,
  chain: any,
  currentStep: any,
  currentStepIndex: number,
  stepResult: { success: boolean; output?: unknown },
): Promise<AdvanceResult> {
  const nextStepIndex = currentStepIndex + 1;
  const isLastStep = nextStepIndex >= chain.total_steps;

  await withTransaction(tenantId, async (client) => {
    // Mark current step complete
    await client.query(
      `UPDATE ${schema}.cross_module_chain_steps
       SET status = 'completed', output = $1, completed_at = NOW()
       WHERE chain_id = $2 AND step_index = $3`,
      [
        stepResult.output ? JSON.stringify(stepResult.output) : null,
        chain.id,
        currentStepIndex,
      ],
    );

    if (isLastStep) {
      // Chain complete
      await client.query(
        `UPDATE ${schema}.cross_module_chains
         SET status = 'completed', current_step = $1, updated_at = NOW(), completed_at = NOW()
         WHERE id = $2`,
        [nextStepIndex, chain.id],
      );
    } else {
      // Advance to next step
      await client.query(
        `UPDATE ${schema}.cross_module_chains
         SET current_step = $1, updated_at = NOW()
         WHERE id = $2`,
        [nextStepIndex, chain.id],
      );

      // Mark next step as pending
      await client.query(
        `UPDATE ${schema}.cross_module_chain_steps
         SET status = 'pending'
         WHERE chain_id = $1 AND step_index = $2`,
        [chain.id, nextStepIndex],
      );
    }
  });

  const eventName = isLastStep ? 'chain.completed' : 'chain.step_completed';

  emitEvent({
    tenantId,
    userId: chain.initiator_id,
    module: 'platform',
    event: eventName,
    entityType: 'cross_module_chain',
    entityId: chain.id,
    data: {
      chainId: chain.id,
      chainCode: chain.chain_code,
      stepIndex: currentStepIndex,
      moduleCode: currentStep.module_code,
      action: currentStep.action,
      output: stepResult.output,
    },
  }).catch((err) => {
    logger.error(`[CHAIN] Failed to emit ${eventName}: ${(err as Error).message}`);
  });

  if (isLastStep) {
    logger.info(`[CHAIN] Completed: chainId=${chain.id} code=${chain.chain_code} tenant=${tenantId}`);
    return { chainId: chain.id, currentStep: nextStepIndex, status: 'completed' };
  }

  // Get next step info
  const nextStep = await safeQuery(
    `SELECT action, module_code FROM ${schema}.cross_module_chain_steps
     WHERE chain_id = $1 AND step_index = $2`,
    [chain.id, nextStepIndex],
  );

  const nextAction = nextStep.rows[0]?.action;
  logger.info(
    `[CHAIN] Step ${currentStepIndex} completed, advancing to step ${nextStepIndex}: ` +
    `chainId=${chain.id} tenant=${tenantId}`,
  );

  return {
    chainId: chain.id,
    currentStep: nextStepIndex,
    status: 'running',
    nextAction,
  };
}

async function handleStepFailure(
  tenantId: string,
  schema: string,
  chain: any,
  currentStep: any,
  currentStepIndex: number,
  stepResult: { success: boolean; output?: unknown; error?: string },
): Promise<AdvanceResult> {
  const hasCompensation = !!currentStep.compensation_action;

  await withTransaction(tenantId, async (client) => {
    // Mark step as failed
    await client.query(
      `UPDATE ${schema}.cross_module_chain_steps
       SET status = 'failed', output = $1, error_message = $2, completed_at = NOW()
       WHERE chain_id = $3 AND step_index = $4`,
      [
        stepResult.output ? JSON.stringify(stepResult.output) : null,
        stepResult.error ?? null,
        chain.id,
        currentStepIndex,
      ],
    );

    // Update chain status
    await client.query(
      `UPDATE ${schema}.cross_module_chains
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [hasCompensation ? 'compensating' : 'failed', chain.id],
    );
  });

  emitEvent({
    tenantId,
    userId: chain.initiator_id,
    module: 'platform',
    event: 'chain.step_failed',
    entityType: 'cross_module_chain',
    entityId: chain.id,
    data: {
      chainId: chain.id,
      chainCode: chain.chain_code,
      stepIndex: currentStepIndex,
      moduleCode: currentStep.module_code,
      action: currentStep.action,
      error: stepResult.error,
      willCompensate: hasCompensation,
    },
  }).catch((err) => {
    logger.error(`[CHAIN] Failed to emit chain.step_failed: ${(err as Error).message}`);
  });

  logger.warn(
    `[CHAIN] Step ${currentStepIndex} failed: chainId=${chain.id} ` +
    `error=${stepResult.error ?? 'unknown'} compensate=${hasCompensation} tenant=${tenantId}`,
  );

  return {
    chainId: chain.id,
    currentStep: currentStepIndex,
    status: hasCompensation ? 'compensating' : 'failed',
    nextAction: hasCompensation ? currentStep.compensation_action : undefined,
  };
}
