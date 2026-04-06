// ============================================
// Provisioning & Onboarding Schema
// Provisioning jobs, provisioning steps, workspace seeds,
// ninety day plans, plan item instances, evidence tasks,
// onboarding assessment drafts, onboarding consensus.
// ============================================

import { query } from '../query';

/**
 * Creates provisioning pipeline, workspace seed, and onboarding assessment tables.
 * Depends on foundation tables (workspaces, controls).
 */
export async function createProvisioningTables(schema: string): Promise<void> {
  // === Provisioning tables (workspace seed + pipeline tracking) ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".workspace_seeds (
      seed_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      schema_version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
      seed_payload JSONB NOT NULL,
      answers_hash VARCHAR(64),
      provisioning_job_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by VARCHAR(64) NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_workspace_seeds_tenant ON "${schema}".workspace_seeds(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_seeds_answers_hash ON "${schema}".workspace_seeds(tenant_id, answers_hash);

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
    CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_tenant ON "${schema}".provisioning_jobs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_status ON "${schema}".provisioning_jobs(status, created_at);

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
    CREATE INDEX IF NOT EXISTS idx_provisioning_steps_job ON "${schema}".provisioning_steps(job_id);

    CREATE TABLE IF NOT EXISTS "${schema}".ninety_day_plans (
      plan90_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL,
      template_code VARCHAR(64) NOT NULL,
      start_at DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ninety_day_plans_tenant ON "${schema}".ninety_day_plans(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ninety_day_plans_workspace ON "${schema}".ninety_day_plans(workspace_id);

    CREATE TABLE IF NOT EXISTS "${schema}".plan_item_instances (
      item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan90_id UUID NOT NULL REFERENCES "${schema}".ninety_day_plans(plan90_id) ON DELETE CASCADE,
      tenant_id VARCHAR(64) NOT NULL,
      week INT NOT NULL CHECK (week >= 1 AND week <= 13),
      type VARCHAR(32) NOT NULL,
      title_en VARCHAR(512) NOT NULL,
      title_ar VARCHAR(512),
      owner_role VARCHAR(64) NOT NULL,
      due_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Open',
      completed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_plan_item_instances_plan ON "${schema}".plan_item_instances(plan90_id);
    CREATE INDEX IF NOT EXISTS idx_plan_item_instances_tenant ON "${schema}".plan_item_instances(tenant_id);

    CREATE TABLE IF NOT EXISTS "${schema}".evidence_tasks (
      task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL,
      control_id VARCHAR(128),
      evidence_requirement_id UUID,
      due_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Open',
      assigned_role VARCHAR(64),
      assigned_to VARCHAR(64),
      assigned_at TIMESTAMPTZ,
      submission_evidence_id UUID,
      cadence VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_evidence_tasks_tenant ON "${schema}".evidence_tasks(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_tasks_due ON "${schema}".evidence_tasks(tenant_id, due_at);
    CREATE INDEX IF NOT EXISTS idx_evidence_tasks_status ON "${schema}".evidence_tasks(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_evidence_tasks_assigned ON "${schema}".evidence_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
  `);

  // === Onboarding assessment draft (singleton per tenant) + consensus ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".onboarding_assessment_drafts (
      draft_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      assessment_id UUID,
      answers JSONB NOT NULL DEFAULT '{}',
      active_category_key VARCHAR(64) DEFAULT '',
      current_question_index INT DEFAULT 0,
      completion_percent INT DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      consensus_status VARCHAR(20) DEFAULT NULL,
      submitted_by VARCHAR(64),
      submitted_at TIMESTAMPTZ,
      created_by VARCHAR(64) NOT NULL,
      updated_by VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".onboarding_consensus (
      consensus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      draft_id UUID NOT NULL REFERENCES "${schema}".onboarding_assessment_drafts(draft_id) ON DELETE CASCADE,
      tenant_id VARCHAR(64) NOT NULL,
      reviewer_user_id VARCHAR(64) NOT NULL,
      reviewer_name VARCHAR(255),
      decision VARCHAR(20) NOT NULL DEFAULT 'pending',
      comments TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(draft_id, reviewer_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_onboarding_consensus_draft ON "${schema}".onboarding_consensus(draft_id);
  `);
}
