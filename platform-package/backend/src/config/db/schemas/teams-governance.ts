// ============================================
// Teams & Governance Schema
// Teams, RACI, member profiles, escalation paths,
// governance bodies, risk appetite, authority matrix,
// escalation thresholds, CCM cycles, KRIs, risk workspace,
// GRC lifecycle gap tables, assessment templates, and
// related governance operational tables.
// ============================================

import { query } from '../query';

/**
 * Creates teams, governance bodies, RACI assignments, risk workspace tables,
 * and related governance operational tables. Depends on foundation tables.
 */
export async function createTeamsGovernanceTables(schema: string): Promise<void> {
  // === KSA GRC Operating System — Module Fire Points ===

  // Module Fire Points — kickstart log + contact points
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".module_kickstart_log (
      log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      module_code VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      kicked_at TIMESTAMPTZ,
      kicked_by VARCHAR(255),
      artifacts_created JSONB,
      errors JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT uq_module_kickstart UNIQUE (module_code)
    );
    CREATE TABLE IF NOT EXISTS "${schema}".module_contact_points (
      contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      module_code VARCHAR(50) NOT NULL,
      owner_user_id VARCHAR(255),
      owner_team_id UUID,
      owner_role VARCHAR(100),
      backup_user_id VARCHAR(255),
      backup_team_id UUID,
      escalation_role_id VARCHAR(100),
      escalation_team_id UUID,
      notification_email BOOLEAN DEFAULT true,
      onboarding_question_code VARCHAR(150),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT chk_owner_defined CHECK (
        owner_user_id IS NOT NULL OR owner_team_id IS NOT NULL OR owner_role IS NOT NULL
      ),
      CONSTRAINT uq_module_contact UNIQUE (module_code)
    );
  `);

  // Content pack installations per tenant
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".content_pack_installations (
      installation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pack_id VARCHAR(100) NOT NULL,
      version VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      installed_at TIMESTAMPTZ DEFAULT NOW(),
      installed_by VARCHAR(64)
    );
  `);

  // UCF controls (tenant-specific with ownership)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ucf_controls (
      control_id VARCHAR(100) PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      title VARCHAR(255),
      objective_en TEXT NOT NULL,
      objective_ar TEXT NOT NULL,
      activity_en TEXT NOT NULL,
      activity_ar TEXT NOT NULL,
      owner VARCHAR(64),
      frequency VARCHAR(20) DEFAULT 'quarterly',
      lifecycle_state VARCHAR(30) DEFAULT 'design',
      evidence_requirements JSONB DEFAULT '[]',
      test_steps JSONB DEFAULT '[]',
      exception_rules JSONB DEFAULT '[]',
      pack_id VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // UCF controls — add columns for existing tenants (new tenants get them from CREATE TABLE above)
  await query(`
    ALTER TABLE "${schema}".ucf_controls ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE "${schema}".ucf_controls ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    ALTER TABLE "${schema}".ucf_controls ADD COLUMN IF NOT EXISTS mapped_frameworks JSONB DEFAULT '[]';
    ALTER TABLE "${schema}".ucf_controls ADD COLUMN IF NOT EXISTS baseline_status VARCHAR(30);
    ALTER TABLE "${schema}".ucf_controls ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ;
  `);

  // Crosswalk mappings
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".crosswalk_mappings (
      mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_control_id VARCHAR(100) NOT NULL REFERENCES "${schema}".ucf_controls(control_id),
      target_requirement_id VARCHAR(100) NOT NULL,
      relationship VARCHAR(20) NOT NULL,
      confidence NUMERIC(3,2) DEFAULT 0.90,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Control lifecycle transitions (immutable audit log)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".control_transitions (
      transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      control_id VARCHAR(100) NOT NULL REFERENCES "${schema}".ucf_controls(control_id),
      from_state VARCHAR(30) NOT NULL,
      to_state VARCHAR(30) NOT NULL,
      actor VARCHAR(64) NOT NULL,
      reason TEXT,
      evidence_ref VARCHAR(100),
      transitioned_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Extend existing exceptions table with exception/waiver management columns
  // Wrapped in try/catch: the exceptions table may be created by a later migration or separate schema module
  try {
    await query(`
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS justification TEXT;
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS compensating_controls TEXT;
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS risk_impact VARCHAR(20);
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS requested_by VARCHAR(64);
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS requested_duration INT;
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS approver_designation VARCHAR(64);
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS approval_chain JSONB DEFAULT '[]';
      ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
  } catch { /* exceptions table may not exist yet — columns will be added by migrations */ }

  // Cadence tasks
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".cadence_tasks (
      task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      control_id VARCHAR(100) NOT NULL REFERENCES "${schema}".ucf_controls(control_id),
      period_type VARCHAR(20) NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      task_type VARCHAR(50) NOT NULL,
      assigned_to VARCHAR(64),
      status VARCHAR(20) DEFAULT 'pending',
      due_date DATE NOT NULL,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Teams
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".teams (
      team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_code VARCHAR(100) UNIQUE,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200) NOT NULL,
      description_en TEXT,
      description_ar TEXT,
      team_lead_user_id VARCHAR(64),
      parent_team_id UUID,
      team_type VARCHAR(50) DEFAULT 'operational',
      active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `);

  // Team members
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".team_members (
      team_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES "${schema}".teams(team_id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      team_role VARCHAR(20) DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      left_at TIMESTAMPTZ,
      active BOOLEAN DEFAULT true,
      UNIQUE (team_id, user_id)
    );
  `);

  // Team RACI assignments
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".team_raci_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type VARCHAR(50) NOT NULL,
      scope_id VARCHAR(100) NOT NULL,
      team_id UUID NOT NULL REFERENCES "${schema}".teams(team_id) ON DELETE CASCADE,
      raci_role VARCHAR(20) NOT NULL,
      notes TEXT,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(scope_type, scope_id, team_id, raci_role)
    );
  `);

  // Member profiles (multi-profile per user)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".member_profiles (
      profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      team_id UUID REFERENCES "${schema}".teams(team_id) ON DELETE CASCADE,
      profile_name VARCHAR(255) NOT NULL,
      profile_name_ar VARCHAR(255),
      role_code VARCHAR(50) NOT NULL,
      permissions JSONB DEFAULT '[]',
      raci_summary JSONB DEFAULT '{}',
      is_default BOOLEAN DEFAULT false,
      assigned_by VARCHAR(64),
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT true,
      UNIQUE(user_id, team_id, role_code)
    );
  `);

  // Member lifecycle events
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".member_lifecycle_events (
      event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      team_id UUID REFERENCES "${schema}".teams(team_id) ON DELETE CASCADE,
      event_type VARCHAR(30) NOT NULL,
      from_status VARCHAR(30),
      to_status VARCHAR(30),
      metadata JSONB DEFAULT '{}',
      performed_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Agent shadow profiles
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".member_agent_shadows (
      shadow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      team_id UUID REFERENCES "${schema}".teams(team_id) ON DELETE CASCADE,
      agent_name VARCHAR(255) NOT NULL,
      agent_name_ar VARCHAR(255),
      activation_mode VARCHAR(20) NOT NULL DEFAULT 'human_only',
      raci_mirror JSONB DEFAULT '{}',
      capabilities JSONB DEFAULT '[]',
      auto_actions JSONB DEFAULT '[]',
      last_action_at TIMESTAMPTZ,
      total_actions INT DEFAULT 0,
      enabled BOOLEAN DEFAULT false,
      configured_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, team_id)
    );
  `);

  // Agent activation rules
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".agent_activation_rules (
      rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shadow_id UUID NOT NULL REFERENCES "${schema}".member_agent_shadows(shadow_id) ON DELETE CASCADE,
      rule_name VARCHAR(255) NOT NULL,
      rule_name_ar VARCHAR(255),
      trigger_type VARCHAR(50) NOT NULL,
      trigger_config JSONB NOT NULL DEFAULT '{}',
      action_type VARCHAR(50) NOT NULL,
      action_config JSONB NOT NULL DEFAULT '{}',
      priority INT DEFAULT 50,
      enabled BOOLEAN DEFAULT true,
      last_triggered_at TIMESTAMPTZ,
      trigger_count INT DEFAULT 0,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Team escalation paths
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".team_escalation_paths (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_team_id UUID NOT NULL REFERENCES "${schema}".teams(team_id) ON DELETE CASCADE,
      escalate_to_team_id UUID NOT NULL REFERENCES "${schema}".teams(team_id) ON DELETE CASCADE,
      escalation_level INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(from_team_id, escalation_level)
    );
  `);

  // Assessment templates
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".assessment_templates (
      template_id VARCHAR(100) PRIMARY KEY,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200) NOT NULL,
      framework_id VARCHAR(100),
      scoring_methodology VARCHAR(20) NOT NULL,
      weights JSONB DEFAULT '{}',
      question_bank JSONB DEFAULT '[]',
      pack_id VARCHAR(100),
      category VARCHAR(50) DEFAULT 'general',
      industry VARCHAR(50) DEFAULT 'all',
      difficulty VARCHAR(20) DEFAULT 'intermediate',
      estimated_minutes INT DEFAULT 60,
      description_en TEXT DEFAULT '',
      description_ar TEXT DEFAULT '',
      applicable_sectors JSONB DEFAULT '["all"]',
      tags JSONB DEFAULT '[]',
      is_system BOOLEAN DEFAULT false,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Assessment responses (per-question answers)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".assessment_responses (
      response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id VARCHAR(100) NOT NULL,
      question_id VARCHAR(100) NOT NULL,
      answer JSONB,
      score NUMERIC DEFAULT 0,
      responded_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, question_id)
    );
  `);

  // Tenant configuration versions
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".tenant_config_versions (
      version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_number INT NOT NULL,
      version INT,
      tier VARCHAR(30),
      config JSONB NOT NULL,
      changed_by VARCHAR(64),
      changed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // RoPA entries (PDPL)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ropa_entries (
      entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      processing_purpose TEXT NOT NULL,
      legal_basis VARCHAR(100) NOT NULL,
      data_categories TEXT[] DEFAULT '{}',
      data_subjects TEXT[] DEFAULT '{}',
      recipients TEXT[] DEFAULT '{}',
      retention_days INT,
      transfer_details TEXT,
      technical_measures TEXT,
      organizational_measures TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Consent records (PDPL)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".consent_records (
      consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_id VARCHAR(100) NOT NULL,
      processing_purpose VARCHAR(200) NOT NULL,
      consent_version VARCHAR(20),
      granted_at TIMESTAMPTZ DEFAULT NOW(),
      withdrawn_at TIMESTAMPTZ
    );
  `);

  // Vendor tier configuration
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_tier_config (
      tier VARCHAR(20) PRIMARY KEY,
      min_requirements JSONB NOT NULL,
      review_frequency VARCHAR(20) NOT NULL,
      remediation_sla_days INT NOT NULL
    );
  `);

  await query(`
    INSERT INTO "${schema}".vendor_tier_config (tier, min_requirements, review_frequency, remediation_sla_days)
    VALUES
      ('low',      '{"steps":["basic_info","contract_review"]}',                                                                  'annually',    90),
      ('medium',   '{"steps":["basic_info","contract_review","risk_assessment"]}',                                                'semi_annual', 60),
      ('high',     '{"steps":["basic_info","contract_review","risk_assessment","security_review","compliance_check"]}',            'quarterly',   30),
      ('critical', '{"steps":["basic_info","contract_review","risk_assessment","security_review","compliance_check","site_visit","executive_approval"]}', 'monthly', 14)
    ON CONFLICT (tier) DO NOTHING;
  `);

  // === AGRC-OS Core Tables (migration 010) ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".agrc_event_log (
      event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(60) NOT NULL,
      source_service VARCHAR(100) NOT NULL,
      entity_type VARCHAR(60),
      entity_id VARCHAR(200),
      severity VARCHAR(20) NOT NULL DEFAULT 'info',
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agrc_event_type ON "${schema}".agrc_event_log (event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agrc_event_severity ON "${schema}".agrc_event_log (severity, created_at DESC);

    CREATE TABLE IF NOT EXISTS "${schema}".governance_risk_appetite (
      category VARCHAR(100) PRIMARY KEY,
      max_residual_score DECIMAL(6,2) NOT NULL,
      acceptance_requires_role VARCHAR(50) NOT NULL,
      review_cadence_days INT NOT NULL DEFAULT 90,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".authority_matrix (
      rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      decision_type VARCHAR(50) NOT NULL,
      min_criticality VARCHAR(20) NOT NULL,
      required_approver_role VARCHAR(50) NOT NULL,
      escalation_timeout_hours INT NOT NULL DEFAULT 48,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".escalation_thresholds (
      level INT PRIMARY KEY,
      timeout_hours INT NOT NULL,
      notify_role VARCHAR(50) NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".telemetry_signals (
      signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_key VARCHAR(200) NOT NULL,
      signal_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      source VARCHAR(100) NOT NULL,
      payload JSONB DEFAULT '{}',
      occurred_at TIMESTAMPTZ NOT NULL,
      ingested_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_telemetry_subject ON "${schema}".telemetry_signals (subject_key, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS "${schema}".enforcement_gate_log (
      gate_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gate_type VARCHAR(20) NOT NULL,
      subject_id VARCHAR(200) NOT NULL,
      subject_name VARCHAR(500),
      allowed BOOLEAN NOT NULL,
      reason TEXT,
      requested_by VARCHAR(64),
      details JSONB DEFAULT '{}',
      overridden BOOLEAN DEFAULT FALSE,
      overridden_by VARCHAR(64),
      override_justification TEXT,
      overridden_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".ccm_cycle_log (
      cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      controls_evaluated INT NOT NULL,
      stale_controls INT NOT NULL DEFAULT 0,
      escalations_triggered INT NOT NULL DEFAULT 0,
      risk_recalculated BOOLEAN DEFAULT FALSE,
      cycle_ms INT NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".agrc_os_cycle_log (
      cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telemetry_ingested INT DEFAULT 0,
      controls_evaluated INT DEFAULT 0,
      risks_recomputed INT DEFAULT 0,
      policy_decisions INT DEFAULT 0,
      enforcement_actions INT DEFAULT 0,
      audit_entries INT DEFAULT 0,
      cycle_ms INT NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".sop_procedures (
      sop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      process_type VARCHAR(50) NOT NULL,
      stage_id VARCHAR(50) NOT NULL,
      role_id VARCHAR(50) NOT NULL,
      title_en VARCHAR(300) NOT NULL,
      title_ar VARCHAR(300) NOT NULL,
      steps_en JSONB NOT NULL DEFAULT '[]',
      steps_ar JSONB NOT NULL DEFAULT '[]',
      prerequisites TEXT,
      expected_output TEXT,
      sla_hours INT,
      version INT DEFAULT 1,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sop_process ON "${schema}".sop_procedures (process_type, stage_id);

    CREATE TABLE IF NOT EXISTS "${schema}".agrc_runbooks (
      runbook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trigger_event VARCHAR(60) NOT NULL,
      name_en VARCHAR(300) NOT NULL,
      name_ar VARCHAR(300) NOT NULL,
      description_en TEXT,
      description_ar TEXT,
      automated_steps JSONB NOT NULL DEFAULT '[]',
      human_escalation_points JSONB NOT NULL DEFAULT '[]',
      severity_threshold VARCHAR(20) DEFAULT 'warning',
      enabled BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_runbook_trigger ON "${schema}".agrc_runbooks (trigger_event);

    CREATE TABLE IF NOT EXISTS "${schema}".agrc_metrics_snapshots (
      snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cycle_count INT DEFAULT 0,
      avg_cycle_ms INT DEFAULT 0,
      enforcement_rate DECIMAL(5,2) DEFAULT 0,
      stale_control_pct DECIMAL(5,2) DEFAULT 0,
      telemetry_ingestion_rate INT DEFAULT 0,
      event_count INT DEFAULT 0,
      critical_events INT DEFAULT 0,
      snapshot_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".onboarding_answers (
      answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      wizard_step VARCHAR(60) NOT NULL,
      field_id VARCHAR(100) NOT NULL,
      answer_value JSONB NOT NULL DEFAULT '{}',
      version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_onboarding_answer UNIQUE (user_id, wizard_step, field_id)
    );
    CREATE INDEX IF NOT EXISTS idx_onboarding_answers_user ON "${schema}".onboarding_answers(user_id);
  `);

  // === Risk Workspace Tables (migration 010_risk_workspace) ===
  await query(`
    ALTER TABLE "${schema}".risks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS "${schema}".risk_treatments (
      treatment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      risk_id VARCHAR(16) NOT NULL REFERENCES "${schema}".risks(risk_id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      strategy VARCHAR(30) NOT NULL DEFAULT 'mitigate',
      owner VARCHAR(255) DEFAULT '',
      status VARCHAR(30) DEFAULT 'planned',
      target_date DATE,
      expected_reduction NUMERIC(5,2) DEFAULT 0,
      actual_reduction NUMERIC(5,2) DEFAULT 0,
      target_residual_score INT,
      validated_by VARCHAR(255),
      validated_at TIMESTAMPTZ,
      validation_evidence_id UUID,
      validation_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_risk_treatments_risk ON "${schema}".risk_treatments(risk_id);
    CREATE INDEX IF NOT EXISTS idx_risk_treatments_status ON "${schema}".risk_treatments(status);

    CREATE TABLE IF NOT EXISTS "${schema}".risk_kris (
      kri_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      linked_risk_id VARCHAR(16) REFERENCES "${schema}".risks(risk_id) ON DELETE SET NULL,
      linked_category VARCHAR(100),
      owner VARCHAR(255) DEFAULT '',
      threshold_red NUMERIC(10,2) NOT NULL DEFAULT 20,
      threshold_amber NUMERIC(10,2) NOT NULL DEFAULT 12,
      threshold_green NUMERIC(10,2) NOT NULL DEFAULT 6,
      current_value NUMERIC(10,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'normal',
      trend VARCHAR(10) DEFAULT 'stable',
      collection_frequency VARCHAR(20) DEFAULT 'monthly',
      last_collected_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_risk_kris_risk ON "${schema}".risk_kris(linked_risk_id);

    CREATE TABLE IF NOT EXISTS "${schema}".kri_data_points (
      data_point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kri_id UUID NOT NULL REFERENCES "${schema}".risk_kris(kri_id) ON DELETE CASCADE,
      value NUMERIC(10,2) NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      collected_by VARCHAR(255) DEFAULT '',
      notes TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_kri_data_points_kri ON "${schema}".kri_data_points(kri_id, collected_at DESC);

    CREATE TABLE IF NOT EXISTS "${schema}".kri_breach_log (
      breach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kri_id UUID NOT NULL REFERENCES "${schema}".risk_kris(kri_id) ON DELETE CASCADE,
      breach_value NUMERIC(10,2) NOT NULL,
      threshold_breached VARCHAR(10) NOT NULL,
      threshold_value NUMERIC(10,2) NOT NULL,
      linked_risk_id VARCHAR(16),
      owner VARCHAR(255) DEFAULT '',
      action_taken TEXT,
      status VARCHAR(30) DEFAULT 'open',
      breached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolved_by VARCHAR(255)
    );
    CREATE INDEX IF NOT EXISTS idx_kri_breach_status ON "${schema}".kri_breach_log(status);

    CREATE TABLE IF NOT EXISTS "${schema}".risk_acceptance_log (
      acceptance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      risk_id VARCHAR(16) NOT NULL REFERENCES "${schema}".risks(risk_id) ON DELETE CASCADE,
      residual_score INT NOT NULL,
      appetite_threshold INT NOT NULL,
      breach_amount INT NOT NULL,
      reason TEXT NOT NULL,
      requested_by VARCHAR(255) NOT NULL,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      decision VARCHAR(20) DEFAULT 'pending',
      decided_by VARCHAR(255),
      decided_at TIMESTAMPTZ,
      decision_comments TEXT,
      expiry_date DATE,
      status VARCHAR(20) DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS idx_risk_acceptance_status ON "${schema}".risk_acceptance_log(status);

    CREATE TABLE IF NOT EXISTS "${schema}".risk_review_log (
      review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      risk_id VARCHAR(16) NOT NULL REFERENCES "${schema}".risks(risk_id) ON DELETE CASCADE,
      reviewer VARCHAR(255) NOT NULL,
      review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      outcome VARCHAR(30) NOT NULL DEFAULT 'reviewed',
      previous_score INT,
      new_score INT,
      notes TEXT DEFAULT '',
      next_review_date DATE
    );
    CREATE INDEX IF NOT EXISTS idx_risk_review_risk ON "${schema}".risk_review_log(risk_id);

    CREATE TABLE IF NOT EXISTS "${schema}".risk_escalation_log (
      escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      risk_id VARCHAR(16) NOT NULL REFERENCES "${schema}".risks(risk_id) ON DELETE CASCADE,
      escalated_by VARCHAR(255) NOT NULL,
      escalated_to VARCHAR(255) NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'open',
      escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolution_notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_risk_escalation_status ON "${schema}".risk_escalation_log(status);
  `);

  // === GRC Lifecycle Phase 1 Gap Tables (Sprint C) ===

  // C1: Policy-to-Risk Mapping
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".governance_policy_risk_links (
      link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      policy_id VARCHAR(16) NOT NULL,
      risk_id VARCHAR(16) NOT NULL,
      link_type VARCHAR(30) NOT NULL DEFAULT 'mitigates',
      rationale TEXT DEFAULT '',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_policy_risk_links_policy ON "${schema}".governance_policy_risk_links(policy_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_policy_risk_links_risk ON "${schema}".governance_policy_risk_links(risk_id) WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_risk_links_unique ON "${schema}".governance_policy_risk_links(policy_id, risk_id) WHERE deleted_at IS NULL;
  `);

  // C4: Audit Charter Module
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".audit_charters (
      charter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      title_ar VARCHAR(500) DEFAULT '',
      scope TEXT DEFAULT '',
      authority TEXT DEFAULT '',
      objectives TEXT DEFAULT '',
      cae_id VARCHAR(64),
      effective_date DATE,
      review_date DATE,
      status VARCHAR(30) DEFAULT 'draft',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_audit_charters_status ON "${schema}".audit_charters(status) WHERE deleted_at IS NULL;
  `);

  // C5: Sign-Off Authority Matrix
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".sign_off_authority_matrix (
      rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      finding_severity VARCHAR(30) NOT NULL,
      required_role VARCHAR(50) NOT NULL,
      escalation_timeout_hours INT NOT NULL DEFAULT 48,
      requires_dual_approval BOOLEAN DEFAULT FALSE,
      severity_order INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sign_off_severity ON "${schema}".sign_off_authority_matrix(finding_severity) WHERE active = TRUE;

    INSERT INTO "${schema}".sign_off_authority_matrix (finding_severity, required_role, severity_order, requires_dual_approval)
    VALUES
      ('critical', 'owner', 1, TRUE),
      ('high', 'admin', 2, TRUE),
      ('medium', 'compliance_officer', 3, FALSE),
      ('low', 'auditor', 4, FALSE)
    ON CONFLICT (finding_severity) WHERE active = TRUE DO NOTHING;
  `);

  // C6: Management Response Tracking
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".management_responses (
      response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      finding_id VARCHAR(64) NOT NULL,
      respondent_id VARCHAR(64) NOT NULL,
      decision VARCHAR(20) NOT NULL CHECK (decision IN ('agree', 'disagree', 'partial')),
      response_text TEXT DEFAULT '',
      action_plan TEXT DEFAULT '',
      target_date DATE,
      status VARCHAR(30) DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_mgmt_responses_finding ON "${schema}".management_responses(finding_id);
    CREATE INDEX IF NOT EXISTS idx_mgmt_responses_status ON "${schema}".management_responses(status);
  `);

  // C7: Supervisory Review Gate
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".supervisory_reviews (
      review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id VARCHAR(64) NOT NULL,
      requested_by VARCHAR(64) NOT NULL,
      supervisor_id VARCHAR(64),
      decision VARCHAR(30),
      comments TEXT DEFAULT '',
      status VARCHAR(30) DEFAULT 'pending',
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_supervisory_reviews_status ON "${schema}".supervisory_reviews(status);
    CREATE INDEX IF NOT EXISTS idx_supervisory_reviews_report ON "${schema}".supervisory_reviews(report_id);
  `);

  // C8: Risk Tolerance Bands
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".risk_tolerance_bands (
      band_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category VARCHAR(100) NOT NULL,
      appetite_threshold DECIMAL(10,2) NOT NULL,
      tolerance_upper DECIMAL(10,2) NOT NULL,
      tolerance_lower DECIMAL(10,2) NOT NULL,
      escalation_trigger VARCHAR(30) DEFAULT 'auto_escalate',
      review_cadence_days INT DEFAULT 90,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tolerance_bands_category ON "${schema}".risk_tolerance_bands(category) WHERE active = TRUE;
  `);

  // C9: Treatment Cost-Benefit — add columns to existing risk_treatments table
  await query(`
    ALTER TABLE "${schema}".risk_treatments ADD COLUMN IF NOT EXISTS cost_estimate DECIMAL(15,2);
    ALTER TABLE "${schema}".risk_treatments ADD COLUMN IF NOT EXISTS benefit_estimate DECIMAL(15,2);
    ALTER TABLE "${schema}".risk_treatments ADD COLUMN IF NOT EXISTS roi_percentage DECIMAL(8,2);
    ALTER TABLE "${schema}".risk_treatments ADD COLUMN IF NOT EXISTS implementation_effort VARCHAR(30);
    ALTER TABLE "${schema}".risk_treatments ADD COLUMN IF NOT EXISTS annual_recurring_cost DECIMAL(15,2);
  `);

  // Add is_training column to existing entity tables
  await query(`
    ALTER TABLE "${schema}".risks ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".incidents ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".vendors ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".evidence ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".assessments ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".bcp_plans ADD COLUMN IF NOT EXISTS is_training BOOLEAN DEFAULT FALSE;
  `);
}
