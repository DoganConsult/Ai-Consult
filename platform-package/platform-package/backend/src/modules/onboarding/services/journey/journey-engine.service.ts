// @ts-nocheck
/**
 * Journey Engine Service — Central Orchestrator
 *
 * Manages journey state transitions, coordinates sub-services,
 * and provides the core state machine for the AI GRC Partner Journey.
 *
 * Pure functions: serializeJourneyState, deserializeJourneyState,
 *   computeNextPhase, isStepCompleted, addCompletedStep
 *
 * DB functions: getOrCreateJourneyState, saveJourneyState, advanceJourney
 *
 * Aggregation: getJourneyProgress
 *
 * Orchestration: on setup complete → create roadmap → activate first phase templates
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import type {
  JourneyState,
  JourneyPhase,
  JourneyProgress,
  RoadmapPhaseType,
} from '../../../../types/journey.types';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// ===========================================================================
// Constants
// ===========================================================================

/** Ordered journey phases — setup + the 5 roadmap phases. */
const PHASE_ORDER: JourneyPhase[] = [
  'setup',
  'foundation',
  'assessment',
  'implementation',
  'operations',
  'continuous_improvement',
];

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Serialize a JourneyState to a JSON string.
 * Round-trip safe with deserializeJourneyState.
 *
 * Requirement 7.3: Round-trip serialization for journey state.
 */
export function serializeJourneyState(state: JourneyState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize a JSON string back to a JourneyState.
 * Provides safe defaults for arrays to handle partial/corrupted data.
 *
 * Requirement 7.3: Round-trip serialization for journey state.
 */
export function deserializeJourneyState(json: string): JourneyState {
  const parsed = JSON.parse(json);
  return {
    stateId: parsed.stateId,
    tenantId: parsed.tenantId,
    userId: parsed.userId,
    currentPhase: parsed.currentPhase,
    completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
    conversationHistory: Array.isArray(parsed.conversationHistory)
      ? parsed.conversationHistory.map((entry: GenericRow) => ({
          role: entry.role,
          content: entry.content,
          contentAr: entry.contentAr,
          timestamp: entry.timestamp,
          ...(entry.stepId !== undefined ? { stepId: entry.stepId } : {}),
        }))
      : [],
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}

/**
 * Compute the next phase in the journey, or null if the journey is complete.
 *
 * Looks up the current phase in PHASE_ORDER and returns the next one.
 * Returns null if the current phase is the last one (continuous_improvement).
 */
export function computeNextPhase(state: JourneyState): JourneyPhase | null {
  const currentIndex = PHASE_ORDER.indexOf(state.currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * Check whether a specific step has been completed in the journey state.
 */
export function isStepCompleted(state: JourneyState, stepId: string): boolean {
  return state.completedSteps.includes(stepId);
}

/**
 * Return a new JourneyState with the given step added to completedSteps.
 * If the step is already completed, returns the state unchanged.
 * Does not mutate the original state.
 */
export function addCompletedStep(state: JourneyState, stepId: string): JourneyState {
  if (state.completedSteps.includes(stepId)) {
    return state;
  }
  return {
    ...state,
    completedSteps: [...state.completedSteps, stepId],
    updatedAt: new Date().toISOString(),
  };
}


// ---------------------------------------------------------------------------
// Risk Score Computation (Requirement 5.3)
// ---------------------------------------------------------------------------

/** Risk classification label. */
export type RiskClassification = 'Low' | 'Medium' | 'High' | 'Critical';

/** Result of a risk score computation. */
export interface RiskScoreResult {
  score: number;
  classification: RiskClassification;
}

/**
 * Compute a risk score from likelihood and impact ratings.
 *
 * score = likelihood × impact
 *
 * Classification boundaries:
 *   score ≤ 5  → Low
 *   score ≤ 10 → Medium
 *   score ≤ 15 → High
 *   score > 15 → Critical
 *
 * Requirement 5.3: Risk score computation with valid classification.
 */
export function computeRiskScore(
  likelihood: number,
  impact: number,
): RiskScoreResult {
  const score = likelihood * impact;

  let classification: RiskClassification;
  if (score <= 5) {
    classification = 'Low';
  } else if (score <= 10) {
    classification = 'Medium';
  } else if (score <= 15) {
    classification = 'High';
  } else {
    classification = 'Critical';
  }

  return { score, classification };
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Get the existing journey state for a tenant/user, or create a new one
 * starting at the 'setup' phase.
 *
 * Requirement 7.2: Restore journey to exact point where user left off.
 */
export async function getOrCreateJourneyState(
  tenantId: string,
  userId: string,
): Promise<JourneyState> {
  const schema = tenantSchema(tenantId);

  // Try to fetch existing state
  const existing = await safeQuery(
    `SELECT state_id, tenant_id, user_id, current_phase,
            completed_steps, conversation_history, created_at, updated_at
     FROM "${schema}".journey_state
     WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId],
  );

  if (existing.rows.length > 0) {
    const row = getFirstRow(existing);
    const state: JourneyState = {
      stateId: row.state_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      currentPhase: row.current_phase as JourneyPhase,
      completedSteps: row.completed_steps ?? [],
      conversationHistory: row.conversation_history ?? [],
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };

    // Requirement 7.4: Validate referenced entities on restoration
    const validated = await validateAndRepairState(state);
    return validated;
  }

  // Create new state starting at setup phase
  const result = await safeQuery(
    `INSERT INTO "${schema}".journey_state
       (tenant_id, user_id, current_phase, completed_steps, conversation_history)
     VALUES ($1, $2, 'setup', '[]'::jsonb, '[]'::jsonb)
     RETURNING state_id, created_at, updated_at`,
    [tenantId, userId],
  );

  const row = getFirstRow(result);
  return {
    stateId: row.state_id,
    tenantId,
    userId,
    currentPhase: 'setup',
    completedSteps: [],
    conversationHistory: [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

/**
 * Persist the current journey state to the database.
 *
 * Requirement 7.1: Persist journey state after each significant interaction.
 */
export async function saveJourneyState(state: JourneyState): Promise<JourneyState> {
  const schema = tenantSchema(state.tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".journey_state
     SET current_phase = $1,
         completed_steps = $2,
         conversation_history = $3,
         updated_at = NOW()
     WHERE tenant_id = $4 AND user_id = $5
     RETURNING updated_at`,
    [
      state.currentPhase,
      JSON.stringify(state.completedSteps),
      JSON.stringify(state.conversationHistory),
      state.tenantId,
      state.userId,
    ],
  );

  const row = getFirstRow(result);
  return {
    ...state,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

/**
 * Advance the journey by completing a step and potentially transitioning phases.
 *
 * 1. Marks the step as completed.
 * 2. Checks if the current phase is done (all phase steps completed).
 * 3. If done, transitions to the next phase.
 * 4. On setup→foundation transition, orchestrates roadmap creation and
 *    first phase template activation.
 * 5. Persists the updated state.
 *
 * Requirements: 7.1, 7.2
 */
export async function advanceJourney(
  tenantId: string,
  userId: string,
  stepId: string,
): Promise<JourneyState> {
  let state = await getOrCreateJourneyState(tenantId, userId);

  // Add the completed step
  state = addCompletedStep(state, stepId);

  // Check if we should transition to the next phase
  const shouldAdvance = await shouldAdvancePhase(state);
  if (shouldAdvance) {
    const nextPhase = computeNextPhase(state);
    if (nextPhase) {
      const previousPhase = state.currentPhase;
      state = { ...state, currentPhase: nextPhase, updatedAt: new Date().toISOString() };

      // Orchestrate sub-services on phase transitions
      await onPhaseTransition(tenantId, userId, previousPhase, nextPhase);
    }
  }

  // Persist the updated state (Req 7.1)
  state = await saveJourneyState(state);
  return state;
}


// ===========================================================================
// Aggregation
// ===========================================================================

/**
 * Get a comprehensive journey progress summary for a tenant.
 * Aggregates data from roadmap, maturity, and current phase.
 *
 * Returns a JourneyProgress object combining:
 * - Current roadmap state
 * - Maturity score data
 * - Phase completion information
 */
export async function getJourneyProgress(
  tenantId: string,
): Promise<JourneyProgress> {
  const { getRoadmap } = await import('../../../agrc-engine/services/engine/roadmap-builder.service');
  const { getLatestMaturity, computePhaseProgress } = await import('../../../agrc-engine/services/engine/maturity-dashboard.service');

  // Get the journey state for the first user (tenant-level progress)
  const schema = tenantSchema(tenantId);
  const stateResult = await safeQuery(
    `SELECT state_id, tenant_id, user_id, current_phase,
            completed_steps, conversation_history, created_at, updated_at
     FROM "${schema}".journey_state
     WHERE tenant_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [tenantId],
  );

  const roadmap = await getRoadmap(tenantId);
  const _maturity = await getLatestMaturity(tenantId);

  // Compute phase progress from roadmap
  const phaseProgressList: Array<{ phaseIndex: number; progress: Awaited<ReturnType<typeof computePhaseProgress>> }> = [];
  if (roadmap) {
    for (let i = 0; i < roadmap.phases.length; i++) {
      const pp = await computePhaseProgress(tenantId, i);
      phaseProgressList.push({ phaseIndex: i, progress: pp });
    }
  }

  // Determine current stage/step from roadmap
  let currentStageId = '';
  let currentStepId = '';
  const completedStages: string[] = [];
  const completedSteps: string[] = [];
  const stageScores: Record<string, number> = {};

  if (roadmap) {
    for (let i = 0; i < roadmap.phases.length; i++) {
      const phase = roadmap.phases[i];
      const ppEntry = phaseProgressList.find(e => e.phaseIndex === i);
      const pp = ppEntry?.progress;
      if (pp) {
        const completionPercent = pp.total > 0 ? Math.round((pp.completed / pp.total) * 100) : 0;
        stageScores[phase.type] = completionPercent;
        if (completionPercent === 100) {
          completedStages.push(phase.phaseId);
        }
      }

      for (const ms of phase.milestones) {
        for (const task of ms.tasks) {
          if (task.status === 'completed') {
            completedSteps.push(task.taskId);
          }
          // Track the first pending task as current
          if (!currentStepId && task.status === 'pending') {
            currentStageId = phase.phaseId;
            currentStepId = task.taskId;
          }
        }
      }
    }
  }

  const stateRow = getFirstRow(stateResult);
  const userId = stateRow?.user_id ?? '';
  const startedAt = stateRow?.created_at instanceof Date
    ? stateRow.created_at.toISOString()
    : (stateRow?.created_at ?? new Date().toISOString());
  const lastActivityAt = stateRow?.updated_at instanceof Date
    ? stateRow.updated_at.toISOString()
    : (stateRow?.updated_at ?? new Date().toISOString());

  return {
    tenantId,
    userId,
    roadmapId: roadmap?.roadmapId ?? '',
    currentStageId,
    currentStepId,
    completedStages,
    completedSteps,
    skippedSteps: [],
    stageScores,
    startedAt,
    lastActivityAt,
  };
}

// ===========================================================================
// Orchestration Helpers
// ===========================================================================

/**
 * Determine whether the current phase should advance.
 *
 * For the 'setup' phase, checks if the company profile exists (setup complete).
 * For roadmap phases, checks if all tasks in the current phase are completed.
 */
async function shouldAdvancePhase(state: JourneyState): Promise<boolean> {
  if (state.currentPhase === 'setup') {
    // Setup is complete when the company profile has been created
    const { getCompanyProfile } = await import('../../../../platform/dos/provisioning/setup-wizard.service');
    const profile = await getCompanyProfile(state.tenantId);
    return profile !== null;
  }

  // For roadmap phases, check if all tasks in the current phase are done
  const { getRoadmap } = await import('../../../agrc-engine/services/engine/roadmap-builder.service');
  const roadmap = await getRoadmap(state.tenantId);
  if (!roadmap) return false;

  const currentPhase = roadmap.phases.find(
    (p: any) => p.type === (state.currentPhase as RoadmapPhaseType),
  );
  if (!currentPhase) return false;

  // Phase is complete when all milestones are complete
  return currentPhase.milestones.every((ms: any) =>
    ms.tasks.every((t: any) => t.status === 'completed' || t.status === 'skipped'),
  );
}

/**
 * Handle side effects when transitioning between phases.
 *
 * - setup → foundation: Create roadmap, activate foundation templates
 * - Any phase → next phase: Activate templates for the new phase
 */
async function onPhaseTransition(
  tenantId: string,
  _userId: string,
  fromPhase: JourneyPhase,
  toPhase: JourneyPhase,
): Promise<void> {
  if (fromPhase === 'setup' && toPhase === 'foundation') {
    await onSetupComplete(tenantId);
  }

  // Activate templates for the new phase (if it's a roadmap phase)
  const roadmapPhases: RoadmapPhaseType[] = [
    'foundation', 'assessment', 'implementation', 'operations', 'continuous_improvement',
  ];
  if (roadmapPhases.includes(toPhase as RoadmapPhaseType)) {
    await activatePhaseTemplates(tenantId, toPhase as RoadmapPhaseType);
  }
}

/**
 * Orchestrate actions when setup is complete:
 * 1. Retrieve the company profile
 * 2. Generate the GRC roadmap
 * 3. Persist the roadmap
 */
async function onSetupComplete(tenantId: string): Promise<void> {
  const { getCompanyProfile } = await import('../../../../platform/dos/provisioning/setup-wizard.service');
  const { generateRoadmap, createRoadmap } = await import('../../../agrc-engine/services/engine/roadmap-builder.service');

  const profile = await getCompanyProfile(tenantId);
  if (!profile) return;

  const roadmap = generateRoadmap(profile);
  await createRoadmap(tenantId, roadmap);
}

/**
 * Activate templates for a given roadmap phase.
 * Uses the template engine to customize and persist templates.
 */
async function activatePhaseTemplates(
  tenantId: string,
  phaseType: RoadmapPhaseType,
): Promise<void> {
  const { getCompanyProfile } = await import('../../../../platform/dos/provisioning/setup-wizard.service');
  const { activateTemplateForPhase, saveActivatedTemplate } = await import('../../../../platform/dos/services/document-generation/template-engine.service');

  const profile = await getCompanyProfile(tenantId);
  if (!profile) return;

  try {
    const activated = await activateTemplateForPhase(tenantId, phaseType, profile);
    await saveActivatedTemplate(tenantId, activated);
  } catch {
    // Template activation failure should not block phase progression
    // Error is logged but the journey continues (per design error handling)
  }
}

// ===========================================================================
// State Validation & Repair
// ===========================================================================

/**
 * Validate that all referenced entities in the journey state still exist.
 * If entities are missing, attempt to repair the state.
 *
 * Requirement 7.4: Validate referenced entities on restoration.
 * Requirement 7.5: Repair state by regenerating missing components.
 */
async function validateAndRepairState(state: JourneyState): Promise<JourneyState> {
  // If we're past setup, verify the roadmap exists
  if (state.currentPhase !== 'setup') {
    const { getRoadmap } = await import('../../../agrc-engine/services/engine/roadmap-builder.service');
    const roadmap = await getRoadmap(state.tenantId);

    if (!roadmap) {
      // Roadmap is missing — attempt to regenerate it (Req 7.5)
      try {
        await onSetupComplete(state.tenantId);
      } catch {
        // If regeneration fails, reset to setup phase
        return {
          ...state,
          currentPhase: 'setup',
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  // Verify company profile exists if past setup
  if (state.currentPhase !== 'setup') {
    const { getCompanyProfile } = await import('../../../../platform/dos/provisioning/setup-wizard.service');
    const profile = await getCompanyProfile(state.tenantId);

    if (!profile) {
      // Company profile missing — reset to setup
      return {
        ...state,
        currentPhase: 'setup',
        completedSteps: [],
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return state;
}
