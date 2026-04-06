// ============================================
// Foundation Schema — Core GRC Tables
// frameworks, risks, policies, procedures, controls,
// evidence, incidents, vendors, and ALTER TABLE extensions
// ============================================

import { query } from '../query';

/**
 * Creates the foundational GRC tables that most other domain tables depend on.
 * Must run first in the schema creation sequence.
 */
export async function createFoundationTables(schema: string): Promise<void> {
  // === Existing GRC tables (preserved + extended) ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".frameworks (
      framework_id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'security',
      total_controls INT DEFAULT 0,
      implemented_controls INT DEFAULT 0,
      completion_percent INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'not_started',
      seeding_tier VARCHAR(20) DEFAULT 'mandatory',
      removed_by_admin BOOLEAN DEFAULT FALSE,
      removed_at TIMESTAMPTZ,
      removed_reason TEXT,
      target_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".risks (
      risk_id VARCHAR(16) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      likelihood INT NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
      impact INT NOT NULL CHECK (impact BETWEEN 1 AND 5),
      risk_score INT GENERATED ALWAYS AS (likelihood * impact) STORED,
      status VARCHAR(50) DEFAULT 'identified',
      owner VARCHAR(255) DEFAULT '',
      control_ids TEXT[] DEFAULT '{}',
      treatment_plan TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".policies (
      policy_id VARCHAR(16) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      description TEXT DEFAULT '',
      category VARCHAR(100) DEFAULT 'general',
      version INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'draft',
      approval_status VARCHAR(50) DEFAULT 'draft',
      approved_by VARCHAR(64),
      approved_at TIMESTAMPTZ,
      frameworks TEXT[] DEFAULT '{}',
      owner VARCHAR(255) NOT NULL,
      review_frequency VARCHAR(50) DEFAULT 'annual',
      next_review_date DATE,
      effective_date DATE,
      expiry_date DATE,
      policy_code_rules JSONB DEFAULT '[]',
      linked_procedures TEXT[] DEFAULT '{}',
      linked_controls TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS "${schema}".procedures (
      procedure_id VARCHAR(16) PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      description TEXT DEFAULT '',
      category VARCHAR(100) DEFAULT 'general',
      version INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'draft',
      approval_status VARCHAR(50) DEFAULT 'draft',
      approved_by VARCHAR(64),
      approved_at TIMESTAMPTZ,
      owner VARCHAR(255) NOT NULL,
      linked_policy_id VARCHAR(16),
      linked_controls TEXT[] DEFAULT '{}',
      review_frequency VARCHAR(50) DEFAULT 'annual',
      next_review_date DATE,
      effective_date DATE,
      expiry_date DATE,
      sop_type VARCHAR(50) DEFAULT 'operational',
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS "${schema}".policy_versions (
      version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      policy_id VARCHAR(16) NOT NULL,
      version INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      change_summary TEXT DEFAULT '',
      changed_by VARCHAR(64) NOT NULL,
      snapshot JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON "${schema}".policy_versions(policy_id, version);

    CREATE TABLE IF NOT EXISTS "${schema}".procedure_versions (
      version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      procedure_id VARCHAR(16) NOT NULL,
      version INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      change_summary TEXT DEFAULT '',
      changed_by VARCHAR(64) NOT NULL,
      snapshot JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_procedure_versions_proc ON "${schema}".procedure_versions(procedure_id, version);

    CREATE TABLE IF NOT EXISTS "${schema}".controls (
      control_id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      frameworks TEXT[] DEFAULT '{}',
      framework_id VARCHAR(50),
      status VARCHAR(50) DEFAULT 'not_started',
      evidence_required TEXT[] DEFAULT '{}',
      automatable BOOLEAN DEFAULT FALSE,
      policy_id VARCHAR(64),
      owner VARCHAR(255) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Extended columns on existing tables ===
  await query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'reports') THEN
        ALTER TABLE "${schema}".reports ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}';
        ALTER TABLE "${schema}".reports ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'json';
        ALTER TABLE "${schema}".reports ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
        ALTER TABLE "${schema}".reports ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'completed';
      END IF;
    END $$;

    ALTER TABLE "${schema}".risks ADD COLUMN IF NOT EXISTS treatment_status VARCHAR(50) DEFAULT 'untreated';
    ALTER TABLE "${schema}".risks ADD COLUMN IF NOT EXISTS kri_config JSONB DEFAULT '{}';
    ALTER TABLE "${schema}".risks ADD COLUMN IF NOT EXISTS ai_assessment JSONB;

    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'draft';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS approved_by VARCHAR(64);
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS policy_code_rules JSONB DEFAULT '[]';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(50) DEFAULT 'annual';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS effective_date DATE;
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS expiry_date DATE;
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS linked_procedures TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS linked_controls TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS policy_id VARCHAR(64);
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS test_status VARCHAR(50) DEFAULT 'not_tested';
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS evidence_ids TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS mapped_registry_nodes TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS baseline_status VARCHAR(30);
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ;
  `);

  // === New tenant tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".audit_trail (
      entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      user_id VARCHAR(64) NOT NULL,
      module VARCHAR(50) NOT NULL,
      action VARCHAR(20) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      before_state JSONB,
      after_state JSONB,
      ip_address INET,
      entry_hash VARCHAR(64),
      previous_hash VARCHAR(64)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".evidence (
      evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64),
      control_id VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      file_path VARCHAR(500),
      content_hash VARCHAR(64) NOT NULL DEFAULT '',
      previous_hash VARCHAR(64),
      chain_position INT NOT NULL DEFAULT 0,
      submitted_by VARCHAR(64) NOT NULL DEFAULT 'system',
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      verified BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'submitted',
      owner_user_id VARCHAR(64),
      reviewer_user_id VARCHAR(64),
      org_unit_id VARCHAR(64),
      sensitivity VARCHAR(20),
      severity VARCHAR(20),
      workspace_id UUID,
      lifecycle_phase VARCHAR(20) DEFAULT 'implement',
      due_date DATE,
      vendor_id UUID,
      version INT DEFAULT 1,
      previous_version_id UUID,
      expiry_date DATE,
      file_size_bytes BIGINT,
      is_training BOOLEAN DEFAULT FALSE,
      search_vector tsvector,
      deleted_at TIMESTAMPTZ,
      -- P5.4: DevOps/pipeline evidence fields
      source_type VARCHAR(30) DEFAULT 'manual-upload' CHECK (source_type IN ('manual-upload', 'system-generated', 'connector', 'pipeline')),
      source_reference VARCHAR(1000),
      metadata_kv JSONB DEFAULT '{}',
      -- P5.5: Confidentiality/sensitivity
      confidentiality_level VARCHAR(20) DEFAULT 'internal' CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- P5.4: Indexes for pipeline evidence fields
    CREATE INDEX IF NOT EXISTS idx_evidence_source_type ON "${schema}".evidence(source_type);
    CREATE INDEX IF NOT EXISTS idx_evidence_source_reference ON "${schema}".evidence(source_reference) WHERE source_reference IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_evidence_metadata_kv ON "${schema}".evidence USING GIN(metadata_kv);

    CREATE TABLE IF NOT EXISTS "${schema}".incidents (
      incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      severity VARCHAR(20),
      status VARCHAR(50) DEFAULT 'reported',
      affected_controls TEXT[] DEFAULT '{}',
      reported_by VARCHAR(64) NOT NULL,
      assigned_to VARCHAR(64),
      ai_triage JSONB,
      root_cause TEXT,
      lessons_learned TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS "${schema}".vendors (
      vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      risk_tier VARCHAR(20) DEFAULT 'medium',
      assessment_score INT,
      contract_expiry DATE,
      sla_config JSONB,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".workflows (
      workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      definition JSONB NOT NULL,
      version INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'draft',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".workflow_executions (
      execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID,
      trigger_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'running',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      step_log JSONB DEFAULT '[]',
      is_simulation BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS "${schema}".simulations (
      simulation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_snapshot JSONB NOT NULL,
      changes_applied JSONB DEFAULT '[]',
      impact_projection JSONB,
      status VARCHAR(50) DEFAULT 'active',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".red_team_runs (
      run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      model_id VARCHAR(100) NOT NULL,
      canary_prompt TEXT NOT NULL,
      result VARCHAR(50),
      vulnerability_type VARCHAR(100),
      severity VARCHAR(20),
      incident_id UUID,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      retest_scheduled_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS "${schema}".privacy_budget (
      budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_id VARCHAR(100) NOT NULL,
      total_epsilon DECIMAL(10,6) NOT NULL,
      consumed_epsilon DECIMAL(10,6) DEFAULT 0,
      query_log JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".contract_tests (
      test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      model_id VARCHAR(100) NOT NULL,
      test_name VARCHAR(255) NOT NULL,
      input_constraints JSONB NOT NULL,
      expected_output JSONB NOT NULL,
      actual_output JSONB,
      status VARCHAR(20),
      executed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS "${schema}".bcp_plans (
      plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      content JSONB NOT NULL,
      test_schedule JSONB,
      last_tested_at TIMESTAMPTZ,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".committees (
      committee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      purpose TEXT,
      members TEXT[] DEFAULT '{}',
      meeting_schedule VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".explainability_packs (
      pack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_role VARCHAR(50) NOT NULL,
      language VARCHAR(2) DEFAULT 'ar',
      content JSONB NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      generated_by VARCHAR(64) NOT NULL
    );
  `);
}

/**
 * Default Separation of Duties rules seeded during provisioning.
 * Each rule defines conflicting role/action pairs that must not
 * be held by the same person without a waiver.
 */
export const FOUNDATION_SOD_RULES = [
  { ruleCode: 'SOD-001', descriptionEn: 'Payment creation and approval must be separate', descriptionAr: 'يجب فصل إنشاء الدفع والموافقة عليه', conflictingRoles: ['payment_creator', 'payment_approver'], conflictingActions: ['payment.create', 'payment.approve'], severity: 'critical' as const },
  { ruleCode: 'SOD-002', descriptionEn: 'User provisioning and access review must be separate', descriptionAr: 'يجب فصل توفير المستخدم ومراجعة الوصول', conflictingRoles: ['user_provisioner', 'access_reviewer'], conflictingActions: ['user.provision', 'access.review'], severity: 'high' as const },
  { ruleCode: 'SOD-003', descriptionEn: 'Policy author and policy approver must be separate', descriptionAr: 'يجب فصل كاتب السياسة والموافق عليها', conflictingRoles: ['policy_author', 'policy_approver'], conflictingActions: ['policy.create', 'policy.approve'], severity: 'high' as const },
  { ruleCode: 'SOD-004', descriptionEn: 'Risk assessor and risk owner must be separate', descriptionAr: 'يجب فصل مقيم المخاطر ومالك المخاطر', conflictingRoles: ['risk_assessor', 'risk_owner'], conflictingActions: ['risk.assess', 'risk.own'], severity: 'medium' as const },
  { ruleCode: 'SOD-005', descriptionEn: 'Evidence collector and evidence reviewer must be separate', descriptionAr: 'يجب فصل جامع الأدلة ومراجع الأدلة', conflictingRoles: ['evidence_collector', 'evidence_reviewer'], conflictingActions: ['evidence.collect', 'evidence.review'], severity: 'high' as const },
  { ruleCode: 'SOD-006', descriptionEn: 'Vendor onboarding and vendor assessment must be separate', descriptionAr: 'يجب فصل استقطاب المورد وتقييمه', conflictingRoles: ['vendor_onboarder', 'vendor_assessor'], conflictingActions: ['vendor.onboard', 'vendor.assess'], severity: 'medium' as const },
  { ruleCode: 'SOD-007', descriptionEn: 'Audit planner and audit executor must be separate', descriptionAr: 'يجب فصل مخطط التدقيق ومنفذه', conflictingRoles: ['audit_planner', 'audit_executor'], conflictingActions: ['audit.plan', 'audit.execute'], severity: 'high' as const },
  { ruleCode: 'SOD-008', descriptionEn: 'Exception requester and exception approver must be separate', descriptionAr: 'يجب فصل طالب الاستثناء والموافق عليه', conflictingRoles: ['exception_requester', 'exception_approver'], conflictingActions: ['exception.request', 'exception.approve'], severity: 'critical' as const },
];
