// @ts-nocheck
/**
 * Guided Journey Engine Service — 10-Stage GRC Journey State Machine
 *
 * Manages the legacy 10-stage GRC journey model with stage/step progression,
 * prerequisite validation, checkpoint verification, and progress tracking.
 *
 * This is DIFFERENT from journey-engine.service.ts which serves the
 * 5-phase AI GRC Partner Journey model.
 *
 * Pure functions: computeStageCompletion, computeOverallCompletion
 * DB functions: initializeJourney, completeStep, skipStep,
 *   getNextRecommendedStep, validateCheckpoint, getJourneyProgress,
 *   recalculateRoadmap
 *
 * Requirements: 12.1, 12.2, 12.3, 12.5, 10.4
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import type {
  JourneyProgress,
  GrcStage,
  GrcStep,
  GrcRoadmap,
} from '../../../../types/journey.types';
import { getFirstRow } from '../../../../utils/db-utils';

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Compute the completion percentage of a single stage based on completed steps.
 * Returns a number between 0 and 100.
 */
export function computeStageCompletion(
  stage: GrcStage,
  completedSteps: string[],
): number {
  if (stage.steps.length === 0) return 100;
  const completed = stage.steps.filter((s: any) => completedSteps.includes(s.stepId)).length;
  return Math.round((completed / stage.steps.length) * 100);
}

/**
 * Compute the overall completion percentage across all stages in a roadmap.
 * Uses a weighted average where each stage's weight is proportional to its
 * number of steps.
 */
export function computeOverallCompletion(
  roadmap: GrcRoadmap,
  completedSteps: string[],
): number {
  const totalSteps = roadmap.stages.reduce((sum: any, s: any) => sum + s.steps.length, 0);
  if (totalSteps === 0) return 100;
  const totalCompleted = roadmap.stages.reduce(
    (sum: any, s: any) => sum + s.steps.filter((st: any) => completedSteps.includes(st.stepId)).length,
    0,
  );
  return Math.round((totalCompleted / totalSteps) * 100);
}

/**
 * Pure checkpoint validation: checks that all required (non-optional) steps
 * for a stage are present in the completedSteps set.
 *
 * Returns { valid, missingSteps } where missingSteps contains the stepIds
 * of required steps that are not yet completed.
 */
export function validateCheckpointPure(
  stage: GrcStage,
  completedSteps: string[],
): { valid: boolean; missingSteps: string[] } {
  const requiredSteps = stage.steps.filter((s: any) => !s.isOptional);
  const missingSteps = requiredSteps
    .filter((s: any) => !completedSteps.includes(s.stepId))
    .map((s: any) => s.stepId);
  return { valid: missingSteps.length === 0, missingSteps };
}

/**
 * Pure next-step recommendation: finds the first incomplete step whose
 * prerequisites are all met, iterating through stages in order.
 *
 * Returns the step and its stageId, or null if all steps are done/skipped.
 */
export function getNextRecommendedStepPure(
  roadmap: GrcRoadmap,
  completedSteps: string[],
  skippedSteps: string[],
): { stageId: string; step: GrcStep } | null {
  const doneOrSkipped = new Set([...completedSteps, ...skippedSteps]);
  const sortedStages = [...roadmap.stages].sort((a, b) => a.order - b.order);

  for (const stage of sortedStages) {
    const sortedSteps = [...stage.steps].sort((a, b) => a.order - b.order);
    for (const step of sortedSteps) {
      if (doneOrSkipped.has(step.stepId)) continue;
      const prereqsMet = step.prerequisites.every((p: any) => completedSteps.includes(p));
      if (prereqsMet) {
        return { stageId: stage.stageId, step };
      }
    }
  }

  return null;
}

// ===========================================================================
// Internal Helpers
// ===========================================================================

/** Fetch the GrcRoadmap for a tenant from the DB. */
async function fetchRoadmap(tenantId: string): Promise<GrcRoadmap | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT roadmap_id, tenant_id, stages, regulatory_map, generated_at, company_profile
     FROM "${schema}".grc_roadmaps
     WHERE tenant_id = $1
     ORDER BY generated_at DESC LIMIT 1`,
    [tenantId],
  );
  if (result.rows.length === 0) return null;
  const row = getFirstRow(result);
  return {
    roadmapId: row.roadmap_id,
    tenantId: row.tenant_id,
    stages: row.stages ?? [],
    regulatoryMap: row.regulatory_map ?? { applicableRegulators: [], applicableFrameworks: [], overlappingControls: [] },
    generatedAt: row.generated_at instanceof Date ? row.generated_at.toISOString() : row.generated_at,
    companyProfile: row.company_profile ?? { companyName: '', sector: '', sectorId: '', size: '', regions: [], dataTypes: [], maturityLevel: '', goals: [] },
  };
}

/** Fetch the JourneyProgress for a tenant/user from the DB. */
async function fetchProgress(tenantId: string, userId: string): Promise<JourneyProgress | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT roadmap_id, current_stage_id, current_step_id,
            completed_stages, completed_steps, skipped_steps,
            stage_scores, started_at, last_activity_at
     FROM "${schema}".journey_progress
     WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId],
  );
  if (result.rows.length === 0) return null;
  const row = getFirstRow(result);
  return {
    tenantId,
    userId,
    roadmapId: row.roadmap_id,
    currentStageId: row.current_stage_id,
    currentStepId: row.current_step_id,
    completedStages: row.completed_stages ?? [],
    completedSteps: row.completed_steps ?? [],
    skippedSteps: row.skipped_steps ?? [],
    stageScores: row.stage_scores ?? {},
    startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
    lastActivityAt: row.last_activity_at instanceof Date ? row.last_activity_at.toISOString() : row.last_activity_at,
  };
}

/** Persist a JourneyProgress record to the DB. */
async function saveProgress(progress: JourneyProgress): Promise<void> {
  const schema = tenantSchema(progress.tenantId);
  await safeQuery(
    `UPDATE "${schema}".journey_progress
     SET current_stage_id = $1,
         current_step_id  = $2,
         completed_stages = $3,
         completed_steps  = $4,
         skipped_steps    = $5,
         stage_scores     = $6,
         last_activity_at = NOW()
     WHERE tenant_id = $7 AND user_id = $8`,
    [
      progress.currentStageId,
      progress.currentStepId,
      JSON.stringify(progress.completedStages),
      JSON.stringify(progress.completedSteps),
      JSON.stringify(progress.skippedSteps),
      JSON.stringify(progress.stageScores),
      progress.tenantId,
      progress.userId,
    ],
  );
}

/** Find a step by stepId across all stages in a roadmap. */
function findStep(roadmap: GrcRoadmap, stepId: string): { stage: GrcStage; step: GrcStep } | null {
  for (const stage of roadmap.stages) {
    const step = stage.steps.find((s: any) => s.stepId === stepId);
    if (step) return { stage, step };
  }
  return null;
}

/** Find the next step in a stage after the given step, or null if last. */
function findNextStepInStage(stage: GrcStage, currentStepId: string): GrcStep | null {
  const sorted = [...stage.steps].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(s => s.stepId === currentStepId);
  if (idx === -1 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1];
}

/**
 * Determine the next current step after completing/skipping a step.
 * Looks for the next step in the same stage, then moves to the next stage.
 */
function advanceCurrentStep(
  roadmap: GrcRoadmap,
  progress: JourneyProgress,
  completedStepId: string,
): { stageId: string; stepId: string } {
  const found = findStep(roadmap, completedStepId);
  if (!found) return { stageId: progress.currentStageId, stepId: progress.currentStepId };

  // Try next step in same stage
  const nextInStage = findNextStepInStage(found.stage, completedStepId);
  if (nextInStage) {
    return { stageId: found.stage.stageId, stepId: nextInStage.stepId };
  }

  // Move to first step of next stage
  const sortedStages = [...roadmap.stages].sort((a, b) => a.order - b.order);
  const stageIdx = sortedStages.findIndex(s => s.stageId === found.stage.stageId);
  if (stageIdx >= 0 && stageIdx < sortedStages.length - 1) {
    const nextStage = sortedStages[stageIdx + 1];
    const firstStep = [...nextStage.steps].sort((a, b) => a.order - b.order)[0];
    if (firstStep) {
      return { stageId: nextStage.stageId, stepId: firstStep.stepId };
    }
  }

  // Already at the end
  return { stageId: progress.currentStageId, stepId: progress.currentStepId };
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Initialize a new journey for a tenant/user, creating a JourneyProgress
 * record with currentStage set to the first stage of the roadmap.
 *
 * Requirement 12.1
 */
export async function initializeJourney(
  tenantId: string,
  userId: string,
  roadmapId: string,
): Promise<JourneyProgress> {
  const schema = tenantSchema(tenantId);
  const roadmap = await fetchRoadmap(tenantId);

  const sortedStages = roadmap
    ? [...roadmap.stages].sort((a, b) => a.order - b.order)
    : [];
  const firstStage = sortedStages[0];
  const firstStep = firstStage
    ? [...firstStage.steps].sort((a, b) => a.order - b.order)[0]
    : null;

  const currentStageId = firstStage?.stageId ?? '';
  const currentStepId = firstStep?.stepId ?? '';
  const now = new Date().toISOString();

  await safeQuery(
    `INSERT INTO "${schema}".journey_progress
       (tenant_id, user_id, roadmap_id, current_stage_id, current_step_id,
        completed_stages, completed_steps, skipped_steps, stage_scores,
        started_at, last_activity_at)
     VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, NOW(), NOW())
     ON CONFLICT (tenant_id, user_id) DO UPDATE
       SET roadmap_id = $3, current_stage_id = $4, current_step_id = $5,
           completed_stages = '[]'::jsonb, completed_steps = '[]'::jsonb,
           skipped_steps = '[]'::jsonb, stage_scores = '{}'::jsonb,
           started_at = NOW(), last_activity_at = NOW()`,
    [tenantId, userId, roadmapId, currentStageId, currentStepId],
  );

  return {
    tenantId,
    userId,
    roadmapId,
    currentStageId,
    currentStepId,
    completedStages: [],
    completedSteps: [],
    skippedSteps: [],
    stageScores: {},
    startedAt: now,
    lastActivityAt: now,
  };
}

/**
 * Complete a step: validate prerequisites, update completedSteps,
 * advance currentStep, and persist to DB.
 *
 * Requirement 12.2
 */
export async function completeStep(
  tenantId: string,
  userId: string,
  stepId: string,
): Promise<JourneyProgress> {
  const progress = await fetchProgress(tenantId, userId);
  if (!progress) throw new Error('Journey not initialized');

  const roadmap = await fetchRoadmap(tenantId);
  if (!roadmap) throw new Error('Roadmap not found');

  const found = findStep(roadmap, stepId);
  if (!found) throw new Error(`Step ${stepId} not found in roadmap`);

  // Validate prerequisites from the roadmap's step definitions
  for (const prereqId of found.step.prerequisites) {
    if (!progress.completedSteps.includes(prereqId)) {
      throw new Error(`Prerequisite step ${prereqId} not completed`);
    }
  }

  // Add to completedSteps
  if (!progress.completedSteps.includes(stepId)) {
    progress.completedSteps.push(stepId);
  }

  // Advance current step
  const next = advanceCurrentStep(roadmap, progress, stepId);
  progress.currentStageId = next.stageId;
  progress.currentStepId = next.stepId;
  progress.lastActivityAt = new Date().toISOString();

  // Check if the stage is now complete
  const stageCompletion = computeStageCompletion(found.stage, progress.completedSteps);
  progress.stageScores[found.stage.stageId] = stageCompletion;
  if (stageCompletion === 100 && !progress.completedStages.includes(found.stage.stageId)) {
    progress.completedStages.push(found.stage.stageId);
  }

  await saveProgress(progress);
  return progress;
}

/**
 * Skip a step: add to skippedSteps with reason, advance currentStep.
 *
 * Requirement 12.2
 */
export async function skipStep(
  tenantId: string,
  userId: string,
  stepId: string,
  _reason: string,
): Promise<JourneyProgress> {
  const progress = await fetchProgress(tenantId, userId);
  if (!progress) throw new Error('Journey not initialized');

  const roadmap = await fetchRoadmap(tenantId);
  if (!roadmap) throw new Error('Roadmap not found');

  // Add to skippedSteps
  if (!progress.skippedSteps.includes(stepId)) {
    progress.skippedSteps.push(stepId);
  }

  // Advance current step
  const next = advanceCurrentStep(roadmap, progress, stepId);
  progress.currentStageId = next.stageId;
  progress.currentStepId = next.stepId;
  progress.lastActivityAt = new Date().toISOString();

  await saveProgress(progress);
  return progress;
}

/**
 * Find the first incomplete step whose prerequisites are all met.
 * Iterates through stages in order.
 *
 * Requirement 12.3
 */
export async function getNextRecommendedStep(
  tenantId: string,
  userId: string,
): Promise<{ stageId: string; step: GrcStep } | null> {
  const progress = await fetchProgress(tenantId, userId);
  if (!progress) return null;

  const roadmap = await fetchRoadmap(tenantId);
  if (!roadmap) return null;

  const doneOrSkipped = new Set([...progress.completedSteps, ...progress.skippedSteps]);
  const sortedStages = [...roadmap.stages].sort((a, b) => a.order - b.order);

  for (const stage of sortedStages) {
    const sortedSteps = [...stage.steps].sort((a, b) => a.order - b.order);
    for (const step of sortedSteps) {
      if (doneOrSkipped.has(step.stepId)) continue;
      const prereqsMet = step.prerequisites.every((p: any) => progress.completedSteps.includes(p));
      if (prereqsMet) {
        return { stageId: stage.stageId, step };
      }
    }
  }

  return null;
}

/**
 * Validate a stage checkpoint: check that all prerequisite steps for the
 * given stage are in completedSteps.
 *
 * Requirement 12.5
 */
export async function validateCheckpoint(
  tenantId: string,
  userId: string,
  stageId: string,
): Promise<{ valid: boolean; missingSteps: string[] }> {
  const progress = await fetchProgress(tenantId, userId);
  if (!progress) return { valid: false, missingSteps: [] };

  const roadmap = await fetchRoadmap(tenantId);
  if (!roadmap) return { valid: false, missingSteps: [] };

  const stage = roadmap.stages.find((s: any) => s.stageId === stageId);
  if (!stage) return { valid: false, missingSteps: [] };

  // Collect all required (non-optional) steps for this stage
  const requiredSteps = stage.steps.filter((s: any) => !s.isOptional);
  const missingSteps = requiredSteps
    .filter((s: any) => !progress.completedSteps.includes(s.stepId))
    .map((s: any) => s.stepId);

  return { valid: missingSteps.length === 0, missingSteps };
}

/**
 * Retrieve the current journey progress for a tenant/user.
 *
 * Requirement 10.4
 */
export async function getGuidedJourneyProgress(
  tenantId: string,
  userId: string,
): Promise<JourneyProgress | null> {
  return fetchProgress(tenantId, userId);
}

/**
 * Recalculate the roadmap progress percentages after stage completion.
 * Recomputes stageScores and completedStages from the current completedSteps.
 *
 * Requirement 12.5
 */
export async function recalculateRoadmap(
  tenantId: string,
  userId: string,
): Promise<JourneyProgress> {
  const progress = await fetchProgress(tenantId, userId);
  if (!progress) throw new Error('Journey not initialized');

  const roadmap = await fetchRoadmap(tenantId);
  if (!roadmap) throw new Error('Roadmap not found');

  // Recompute stage scores and completed stages
  const stageScores: Record<string, number> = {};
  const completedStages: string[] = [];

  for (const stage of roadmap.stages) {
    const pct = computeStageCompletion(stage, progress.completedSteps);
    stageScores[stage.stageId] = pct;
    if (pct === 100) {
      completedStages.push(stage.stageId);
    }
  }

  progress.stageScores = stageScores;
  progress.completedStages = completedStages;
  progress.lastActivityAt = new Date().toISOString();

  await saveProgress(progress);
  return progress;
}
