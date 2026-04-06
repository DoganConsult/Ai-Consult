// @ts-nocheck
// @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
import { v4 as uuid } from "uuid";
import { logger } from '../observability/logger.service';
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { toErrorMessage } from '../../../errors/http-error.util';
import { getProvisioningStepDefinitions, type ProvisioningContext } from './onboarding-config.service';
import { getFirstRow } from '../../../shared/data/db-utils';
import type { GenericRow } from '../../../types/db-rows.types';

export type StepStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

/**
 * @deprecated
 * @removal-date Phase 7 (bootstrap)
 * @owner DOS
 * @replacement DOS provisioning-orchestrator Pipeline-aligned step names (workspace-provisioning.pipeline.yaml stages 1–8).
 * This constant is only used to create the deprecated PROVISIONING_STEPS fallback.
 * All provisioning steps should be loaded from provisioning_step_definitions table.
 * This export is kept for backward compatibility but should not be used in new code.
 */
export const PROVISIONING_PIPELINE_STEPS = [
  "Validating answers",
  "Building compliance profile",
  "Determining regulators & selecting frameworks",
  "Compiling control scope",
  "Creating evidence plan",
  "Provisioning workspace",
  "Baseline scoring and reports",
  "Finalizing",
] as const;

export interface ProvisioningStep {
  name: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ProvisioningJob {
  jobId: string;
  tenantId: string;
  userId: string;
  status: JobStatus;
  percent: number;
  steps: ProvisioningStep[];
  workspaceId?: string;
  seedId?: string;
  counts?: {
    frameworkCount: number;
    riskCount: number;
    policyCount: number;
    controlCount: number;
    vendorCount?: number;
    incidentCount?: number;
    evidenceTaskCount?: number;
    planItemCount?: number;
  };
  reasons?: Array<{ targetId: string; targetName: string; reason: string; confidence: number }>;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

/**
 * @deprecated
 * @removal-date Phase 7 (bootstrap)
 * @owner DOS
 * @replacement DOS provisioning-orchestrator This constant is kept only as a fallback when DB query fails.
 * All provisioning steps should be loaded from provisioning_step_definitions table via getProvisioningStepDefinitions().
 * This fallback should only be used in exceptional circumstances (DB unavailable, migration in progress, etc.).
 */
const PROVISIONING_STEPS = [...PROVISIONING_PIPELINE_STEPS];

const jobs = new Map<string, ProvisioningJob>();
/** Idempotency: key = tenantId + ":" + idempotencyKey, value = jobId */
const idempotencyMap = new Map<string, string>();

/**
 * Load provisioning steps from database, optionally filtered by applicability rules.
 * @param context Optional provisioning context (signals, answers, inferred regulators/frameworks, etc.)
 *                If provided, steps are filtered based on their applicability_rule column.
 * @deprecated
 * @removal-date Phase 7 (bootstrap)
 * @owner DOS
 * @replacement DOS provisioning-orchestrator Fallback: Falls back to hardcoded PROVISIONING_STEPS only if DB query fails or returns no results.
 * This fallback should be removed once all environments have provisioning_step_definitions populated.
 */
async function loadStepsFromDb(context?: ProvisioningContext): Promise<ProvisioningStep[]> {
  try {
    const dbSteps = await getProvisioningStepDefinitions(undefined, context);
    if (dbSteps && dbSteps.length > 0) {
      return dbSteps.map(step => ({
        name: step.step_name,
        status: "PENDING" as StepStatus,
      }));
    }
    logger.warn("No provisioning steps found in DB, falling back to deprecated hardcoded list. This should only happen during migrations or if DB is unavailable.");
  } catch (error) {
    logger.error("Failed to load provisioning steps from DB, falling back to deprecated hardcoded list. This should only happen during migrations or if DB is unavailable.", { error: toErrorMessage(error) });
  }
  // @deprecated @removal-date Phase 7 @owner DOS @replacement DOS provisioning-orchestrator. Fallback only.
  return PROVISIONING_STEPS.map(name => ({ name, status: "PENDING" as StepStatus }));
}

/**
 * Create a new provisioning job with steps loaded from database.
 * Steps are loaded from provisioning_step_definitions table.
 * @param context Optional provisioning context for filtering steps based on applicability rules.
 */
export async function createProvisioningJob(tenantId: string, userId: string, context?: ProvisioningContext): Promise<ProvisioningJob> {
  const steps = await loadStepsFromDb(context);
  const job: ProvisioningJob = {
    jobId: uuid(),
    tenantId,
    userId,
    status: "PENDING",
    percent: 0,
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.jobId, job);
  return job;
}

/** Register job in global lookup so GET status can resolve tenant from jobId. */
export async function registerJobLookup(jobId: string, tenantId: string): Promise<void> {
  await safeQuery(
    `INSERT INTO provisioning_job_lookup (job_id, tenant_id) VALUES ($1, $2)
     ON CONFLICT (job_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
     WHERE provisioning_job_lookup.tenant_id IS DISTINCT FROM EXCLUDED.tenant_id`,
    [jobId, tenantId]
  );
}

/** Look up tenant_id by job_id (for GET status when auth not present). */
export async function lookupTenantByJobId(jobId: string): Promise<string | null> {
  const r = await safeQuery(
    `SELECT tenant_id FROM provisioning_job_lookup WHERE job_id = $1`,
    [jobId]
  );
  return getFirstRow(r)?.tenant_id ?? null;
}

/** List provisioning job IDs and summary for a tenant (for GET /api/provisioning/jobs). */
export async function listJobsForTenant(tenantId: string): Promise<Array<{ id: string; status: string; percent: number; created_at: string; updated_at: string }>> {
  const r = await safeQuery(
    `SELECT job_id, created_at FROM provisioning_job_lookup WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  const out: Array<{ id: string; status: string; percent: number; created_at: string; updated_at: string }> = [];
  for (const row of r.rows) {
    const jobId = String(row.job_id);
    const job = jobs.get(jobId) ?? (await loadJobFromDb(tenantId, jobId));
    if (job) {
      out.push({
        id: job.jobId,
        status: job.status,
        percent: job.percent,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      });
    } else {
      out.push({
        id: jobId,
        status: "PENDING",
        percent: 0,
        created_at: (row.created_at && new Date(row.created_at).toISOString()) || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  return out;
}

/** Load job from tenant DB and hydrate in-memory map (survives restart). */
export async function loadJobFromDb(tenantId: string, jobId: string): Promise<ProvisioningJob | null> {
  const schema = tenantSchema(tenantId);
  try {
    const jobRow = await safeQuery(
      `SELECT job_id, tenant_id, user_id, status, percent, workspace_id, seed_id, counts, error_message, created_at, updated_at
       FROM "${schema}".provisioning_jobs WHERE job_id = $1`,
      [jobId]
    );
    if (jobRow.rows.length === 0) return null;
    const r = getFirstRow(jobRow);
    const stepsRow = await safeQuery(
      `SELECT name, stage_index, status, started_at, completed_at FROM "${schema}".provisioning_steps WHERE job_id = $1 ORDER BY stage_index`,
      [jobId]
    );
    const steps: ProvisioningStep[] = stepsRow.rows.map((s: GenericRow) => ({
      name: s.name,
      status: s.status,
      startedAt: s.started_at,
      completedAt: s.completed_at,
    }));
    
    // If no steps found in DB, load from provisioning_step_definitions instead of hardcoded fallback
    let finalSteps = steps;
    if (steps.length === 0) {
      logger.warn(`No steps found in DB for job ${jobId}, loading from provisioning_step_definitions`);
      finalSteps = await loadStepsFromDb();
    }
    
    const job: ProvisioningJob = {
      jobId: String(r.job_id),
      tenantId: r.tenant_id,
      userId: r.user_id,
      status: r.status,
      percent: Number(r.percent) || 0,
      steps: finalSteps,
      workspaceId: r.workspace_id,
      seedId: r.seed_id,
      counts: r.counts,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      error: r.error_message,
    };
    jobs.set(jobId, job);
    return job;
  } catch {
    return null;
  }
}

/** Get job from map or load from DB by jobId (optionally with known tenantId). */
export async function getProvisioningJobAsync(jobId: string, tenantId?: string): Promise<ProvisioningJob | undefined> {
  let job = jobs.get(jobId);
  if (job) return job;
  const tid = tenantId ?? (await lookupTenantByJobId(jobId));
  if (tid) job = await loadJobFromDb(tid, jobId) ?? undefined;
  return job;
}

/** Idempotency: return existing job if same tenant + key; otherwise create and register key. */
export async function getOrCreateJobWithIdempotency(
  tenantId: string,
  userId: string,
  idempotencyKey: string | undefined,
  context?: ProvisioningContext
): Promise<{ job: ProvisioningJob; isExisting: boolean }> {
  if (idempotencyKey) {
    const key = `${tenantId}:${idempotencyKey}`;
    const existingJobId = idempotencyMap.get(key);
    if (existingJobId) {
      const existing = jobs.get(existingJobId);
      if (existing) return { job: existing, isExisting: true };
      idempotencyMap.delete(key);
    }
  }
  const job = await createProvisioningJob(tenantId, userId, context);
  if (idempotencyKey) idempotencyMap.set(`${tenantId}:${idempotencyKey}`, job.jobId);
  return { job, isExisting: false };
}

/**
 * @deprecated
 * @removal-date Phase 7 (bootstrap)
 * @owner DOS
 * @replacement Baseline migration + createTenantSchema() — tables come from migration 776 and foundation schema.
 * Retained as a no-op safety net; inline DDL removed (Law 1: no duplicate table creation).
 */
async function ensureFoundationTables(schema: string): Promise<void> {
  await safeQuery(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
}

/** Ensure provisioning tables exist in the tenant schema (idempotent). */
async function ensureProvisioningTables(schema: string): Promise<void> {
  await safeQuery(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await ensureFoundationTables(schema);
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".provisioning_jobs (
      job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      percent INT NOT NULL DEFAULT 0,
      workspace_id VARCHAR(64),
      seed_id UUID,
      answers_hash VARCHAR(64),
      counts JSONB,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".provisioning_steps (
      step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES "${schema}".provisioning_jobs(job_id) ON DELETE CASCADE,
      name VARCHAR(128) NOT NULL,
      stage_index INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      error_message TEXT,
      UNIQUE(job_id, stage_index)
    );
  `);
}

/** Persist job and steps to tenant DB (auto-creates tables if needed). */
export async function persistProvisioningJob(
  job: ProvisioningJob,
  options: { 
    answersHash?: string; 
    seedProfileCode?: string | null;
    seedProfileSector?: string | null;
    seedProfileCompanySize?: string | null;
    seedProfileRegulatorCodes?: string[] | null;
    seedProfileFrameworkCodes?: string[] | null;
  } = {}
): Promise<void> {
  const schema = tenantSchema(job.tenantId);
  await ensureProvisioningTables(schema);
  await safeQuery(
    `INSERT INTO "${schema}".provisioning_jobs (
      job_id, tenant_id, user_id, status, percent, answers_hash, 
      seed_profile_code, seed_profile_sector, seed_profile_company_size, 
      seed_profile_regulator_codes, seed_profile_framework_codes
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (job_id) DO UPDATE SET 
       updated_at = NOW(), 
       seed_profile_code = EXCLUDED.seed_profile_code,
       seed_profile_sector = EXCLUDED.seed_profile_sector,
       seed_profile_company_size = EXCLUDED.seed_profile_company_size,
       seed_profile_regulator_codes = EXCLUDED.seed_profile_regulator_codes,
       seed_profile_framework_codes = EXCLUDED.seed_profile_framework_codes`,
    [
      job.jobId, 
      job.tenantId, 
      job.userId, 
      job.status, 
      job.percent, 
      options.answersHash ?? null, 
      options.seedProfileCode ?? null,
      options.seedProfileSector ?? null,
      options.seedProfileCompanySize ?? null,
      options.seedProfileRegulatorCodes ?? null,
      options.seedProfileFrameworkCodes ?? null,
    ]
  );
  for (let i = 0; i < job.steps.length; i++) {
    await safeQuery(
      `INSERT INTO "${schema}".provisioning_steps (job_id, name, stage_index, status)
       VALUES ($1, $2, $3, 'PENDING')
       ON CONFLICT (job_id, stage_index) DO UPDATE SET
         name = EXCLUDED.name, status = EXCLUDED.status
       WHERE provisioning_steps.name IS DISTINCT FROM EXCLUDED.name`,
      [job.jobId, job.steps[i].name, i]
    );
  }
}

/** Update step status in DB (auto-creates tables if needed). */
export async function advanceStepInDb(
  tenantId: string,
  jobId: string,
  stepIndex: number,
  status: StepStatus,
  errorMessage?: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await ensureProvisioningTables(schema);
  const now = new Date().toISOString();
  if (status === "RUNNING") {
    await safeQuery(
      `UPDATE "${schema}".provisioning_steps SET status = $1, started_at = $2 WHERE job_id = $3 AND stage_index = $4`,
      [status, now, jobId, stepIndex]
    );
  } else {
    await safeQuery(
      `UPDATE "${schema}".provisioning_steps SET status = $1, completed_at = $2, error_message = $3 WHERE job_id = $4 AND stage_index = $5`,
      [status, now, errorMessage ?? null, jobId, stepIndex]
    );
  }
  const job = jobs.get(jobId);
  if (job) {
    const doneCount = job.steps.filter(s => s.status === "DONE").length;
    const percent = job.steps.length ? Math.round((doneCount / job.steps.length) * 100) : 0;
    await safeQuery(
      `UPDATE "${schema}".provisioning_jobs SET percent = $1, updated_at = $2 WHERE job_id = $3`,
      [percent, now, jobId]
    );
  }
}

/** Mark job DONE in DB and set workspace_id/seed_id/counts. */
export async function completeJobInDb(
  tenantId: string,
  jobId: string,
  result: { workspaceId: string; seedId?: string; counts?: ProvisioningJob["counts"] }
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await ensureProvisioningTables(schema);
  await safeQuery(
    `UPDATE "${schema}".provisioning_jobs SET status = 'DONE', percent = 100, workspace_id = $1, seed_id = $2, counts = $3, updated_at = NOW() WHERE job_id = $4`,
    [result.workspaceId, result.seedId ?? null, result.counts ? JSON.stringify(result.counts) : null, jobId]
  );
  const job = jobs.get(jobId);
  if (job) {
    job.steps.forEach((s, i) => {
      if (s.status !== "DONE") {
        job.steps[i].status = "DONE";
        job.steps[i].completedAt = new Date().toISOString();
      }
    });
  }
}

/** Mark job FAILED in DB. */
export async function failJobInDb(tenantId: string, jobId: string, errorMessage: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await ensureProvisioningTables(schema);
  await safeQuery(
    `UPDATE "${schema}".provisioning_jobs SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE job_id = $2`,
    [errorMessage, jobId]
  );
}

export function getProvisioningJob(jobId: string): ProvisioningJob | undefined {
  return jobs.get(jobId);
}

export function advanceStep(jobId: string, stepIndex: number, status: StepStatus, extra?: Partial<ProvisioningJob>): void {
  const job = jobs.get(jobId);
  if (!job) return;

  const step = job.steps[stepIndex];
  if (!step) return;

  if (status === "RUNNING") {
    step.status = "RUNNING";
    step.startedAt = new Date().toISOString();
    job.status = "RUNNING";
  } else if (status === "DONE") {
    step.status = "DONE";
    step.completedAt = new Date().toISOString();
  } else if (status === "FAILED") {
    step.status = "FAILED";
    step.completedAt = new Date().toISOString();
  }

  const doneCount = job.steps.filter(s => s.status === "DONE").length;
  job.percent = Math.round((doneCount / job.steps.length) * 100);

  if (extra) Object.assign(job, extra);
  job.updatedAt = new Date().toISOString();
}

export function completeJob(jobId: string, result: { workspaceId: string; counts: ProvisioningJob["counts"]; reasons?: ProvisioningJob["reasons"] }): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "DONE";
  job.percent = 100;
  job.workspaceId = result.workspaceId;
  job.counts = result.counts;
  job.reasons = result.reasons;
  job.updatedAt = new Date().toISOString();
  job.steps.forEach(s => { if (s.status !== "DONE") { s.status = "DONE"; s.completedAt = job.updatedAt; } });
}

export function failJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "FAILED";
  job.error = error;
  job.updatedAt = new Date().toISOString();
}

export async function runProvisioningAsync(
  jobId: string,
  provisionFn: (job: ProvisioningJob, advance: (idx: number, status: StepStatus) => void) => Promise<{ workspaceId: string; counts: ProvisioningJob["counts"]; reasons?: ProvisioningJob["reasons"] }>
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  const advance = (idx: number, status: StepStatus) => advanceStep(jobId, idx, status);

  try {
    const result = await provisionFn(job, advance);
    completeJob(jobId, result);
    logger.info("Provisioning completed", { jobId, tenantId: job.tenantId });
  } catch (err: unknown) {
    failJob(jobId, toErrorMessage(err) || "Unknown provisioning error");
    logger.error("Provisioning failed", { jobId, tenantId: job.tenantId, error: toErrorMessage(err) });
  }
}

export function cleanupOldJobs(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, job] of jobs.entries()) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      jobs.delete(id);
    }
  }
}

/** Remove old entries from global job lookup and idempotency map. */
export async function cleanupJobLookup(maxAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  await safeQuery(`DELETE FROM provisioning_job_lookup WHERE created_at < $1`, [cutoff]);
  for (const [key, jobId] of idempotencyMap.entries()) {
    const job = jobs.get(jobId);
    if (!job || new Date(job.createdAt).getTime() < Date.now() - maxAgeMs) {
      idempotencyMap.delete(key);
    }
  }
}

/**
 * @deprecated Legacy wrapper for backward-compatibility with unmigrated controllers
 */
export class ProvisioningService {
  async startProvisioning(_opts: unknown): Promise<unknown> { return { jobId: 'legacy' }; }
  async getProvisioningStatus(_jobId: string): Promise<unknown> { return { job: {}, steps: [] }; }
  async getProvisioningSteps(_jobId: string): Promise<unknown> { return []; }
  async getProvisioningEvents(_jobId: string): Promise<unknown> { return []; }
}
