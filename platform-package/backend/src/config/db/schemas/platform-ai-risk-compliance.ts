import { logger } from '../../../platform/dos/observability/logger.service';
// ============================================
// Platform Schema — AI, Risk & Compliance Extended
// AI step executions, agent status, feedback,
// autonomous workflow config, journey progress,
// GRC roadmaps, maturity scores, RACI matrices,
// guidance history, process templates, vulnerabilities,
// model risk management, DPIA, SLA, ESG, locations,
// digital signatures, saved views, favorites,
// dashboard shares, file storage, email templates/log,
// indexes, soft-delete columns, workspace_id/lifecycle
// phase columns.
// ============================================

import { query } from '../query';
import { toErrorMessage } from '../../../errors/http-error.util';

export async function createAiRiskComplianceTables(schema: string): Promise<void> {
  // === Autonomous Workflow / AI Squad Tables (v4) ===

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ai_step_executions (
      execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_execution_id UUID NOT NULL,
      step_id VARCHAR(100) NOT NULL,
      agent_id VARCHAR(10) NOT NULL,
      agent_user_id VARCHAR(64) NOT NULL,
      trigger_reason VARCHAR(20) NOT NULL,
      input_context JSONB DEFAULT '{}',
      output_result JSONB DEFAULT '{}',
      confidence DECIMAL(3,2) DEFAULT 0.0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      human_reviewed BOOLEAN DEFAULT FALSE,
      review_decision VARCHAR(20),
      reviewed_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_ai_step_exec_workflow ON "${schema}".ai_step_executions(workflow_execution_id);
    CREATE INDEX IF NOT EXISTS idx_ai_step_exec_status ON "${schema}".ai_step_executions(status);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ai_agent_status_log (
      log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_user_id VARCHAR(64) NOT NULL,
      agent_id VARCHAR(10) NOT NULL,
      previous_status VARCHAR(20) NOT NULL,
      new_status VARCHAR(20) NOT NULL,
      workflow_execution_id UUID,
      step_id VARCHAR(100),
      detail JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_agent_status_agent ON "${schema}".ai_agent_status_log(agent_user_id, created_at DESC);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ai_step_feedback (
      feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      step_id VARCHAR(100) NOT NULL,
      workflow_id UUID NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      suggestion_type VARCHAR(20) NOT NULL,
      accepted BOOLEAN NOT NULL,
      modified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_step_feedback_workflow ON "${schema}".ai_step_feedback(workflow_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".autonomous_workflow_config (
      config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enabled BOOLEAN DEFAULT TRUE,
      sla_grace_multiplier DECIMAL(3,2) DEFAULT 1.0,
      ai_can_execute_actions BOOLEAN DEFAULT TRUE,
      ai_can_draft_approvals BOOLEAN DEFAULT TRUE,
      require_human_review BOOLEAN DEFAULT TRUE,
      cron_interval_minutes INT DEFAULT 5,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === AI-Guided GRC Partner — Journey Tables (v5) ===

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".journey_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      roadmap_id UUID NOT NULL,
      current_stage_id VARCHAR(64),
      current_step_id VARCHAR(64),
      completed_stages TEXT[] DEFAULT '{}',
      completed_steps TEXT[] DEFAULT '{}',
      skipped_steps TEXT[] DEFAULT '{}',
      stage_scores JSONB DEFAULT '{}',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      last_activity_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_journey_progress_tenant ON "${schema}".journey_progress(tenant_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".grc_roadmaps (
      roadmap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      company_profile JSONB NOT NULL,
      stages JSONB NOT NULL,
      regulatory_map JSONB NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_grc_roadmaps_tenant ON "${schema}".grc_roadmaps(tenant_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".maturity_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      domain VARCHAR(32) NOT NULL,
      score DECIMAL(3,1) NOT NULL CHECK (score >= 0 AND score <= 5),
      previous_score DECIMAL(3,1) DEFAULT 0,
      factors JSONB DEFAULT '[]',
      assessed_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_maturity_tenant_domain ON "${schema}".maturity_scores(tenant_id, domain);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".raci_matrices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      entries JSONB NOT NULL,
      roles JSONB NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_raci_matrices_tenant ON "${schema}".raci_matrices(tenant_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".guidance_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      step_id VARCHAR(64),
      module_route VARCHAR(128),
      guidance_type VARCHAR(32) NOT NULL,
      content JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_guidance_history_tenant ON "${schema}".guidance_history(tenant_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".process_templates (
      template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      process_type VARCHAR(64) NOT NULL,
      name_en VARCHAR(256) NOT NULL,
      name_ar VARCHAR(256),
      stages JSONB NOT NULL,
      required_roles TEXT[] DEFAULT '{}',
      applicable_frameworks TEXT[] DEFAULT '{}',
      sector_id VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Vulnerability Management Tables (v6) ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".vulnerabilities (
      vulnerability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      cve_id VARCHAR(30),
      source VARCHAR(50) NOT NULL DEFAULT 'manual',
      severity VARCHAR(20) NOT NULL DEFAULT 'medium',
      cvss_score DECIMAL(3,1),
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      affected_asset_ids TEXT[] DEFAULT '{}',
      affected_control_ids TEXT[] DEFAULT '{}',
      assigned_to VARCHAR(64),
      remediation_plan TEXT,
      remediation_due DATE,
      remediation_task_id UUID,
      detected_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vuln_status ON "${schema}".vulnerabilities(status);
    CREATE INDEX IF NOT EXISTS idx_vuln_severity ON "${schema}".vulnerabilities(severity);
    CREATE INDEX IF NOT EXISTS idx_vuln_cve ON "${schema}".vulnerabilities(cve_id);
  `);

  // === Model Risk Management Tables (v6) ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".model_inventory (
      model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      model_type VARCHAR(50) NOT NULL DEFAULT 'classification',
      version VARCHAR(50) DEFAULT '1.0',
      owner VARCHAR(64),
      department VARCHAR(100),
      vendor VARCHAR(255),
      status VARCHAR(30) NOT NULL DEFAULT 'development',
      risk_tier VARCHAR(20) NOT NULL DEFAULT 'medium',
      use_case TEXT,
      input_data_types TEXT[] DEFAULT '{}',
      output_description TEXT,
      regulatory_frameworks TEXT[] DEFAULT '{}',
      last_validated_at TIMESTAMPTZ,
      next_review_date DATE,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_model_inv_status ON "${schema}".model_inventory(status);
    CREATE INDEX IF NOT EXISTS idx_model_inv_tier ON "${schema}".model_inventory(risk_tier);

    CREATE TABLE IF NOT EXISTS "${schema}".model_validations (
      validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      model_id UUID NOT NULL REFERENCES "${schema}".model_inventory(model_id) ON DELETE CASCADE,
      validation_type VARCHAR(50) NOT NULL,
      result VARCHAR(30) NOT NULL DEFAULT 'pending',
      score DECIMAL(5,2),
      findings JSONB DEFAULT '[]',
      validated_by VARCHAR(64),
      validated_at TIMESTAMPTZ DEFAULT NOW(),
      next_validation_date DATE,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_model_val_model ON "${schema}".model_validations(model_id);

    CREATE TABLE IF NOT EXISTS "${schema}".model_risk_scores (
      score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      model_id UUID NOT NULL REFERENCES "${schema}".model_inventory(model_id) ON DELETE CASCADE,
      inherent_risk DECIMAL(5,2),
      residual_risk DECIMAL(5,2),
      data_quality_score DECIMAL(5,2),
      performance_score DECIMAL(5,2),
      compliance_score DECIMAL(5,2),
      overall_score DECIMAL(5,2),
      zone VARCHAR(20) DEFAULT 'medium',
      scored_by VARCHAR(64),
      scored_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_model_risk_score_model ON "${schema}".model_risk_scores(model_id);
  `);

  // === Migration 024: Missing Feature Tables ===

  // -- DPIA Assessments (may pre-exist with simpler schema)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".dpia_assessments (
      dpia_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      created_by VARCHAR(64),
      data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS processing_activity TEXT;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS data_categories TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS data_subjects TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(100);
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS necessity_assessment TEXT;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS risk_assessment JSONB DEFAULT '{}';
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS mitigation_measures JSONB DEFAULT '[]';
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS consultation_required BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS consultation_details TEXT;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS dpo_opinion TEXT;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS overall_risk_level VARCHAR(20) DEFAULT 'medium';
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS assessor_id VARCHAR(64);
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(64);
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS approved_by VARCHAR(64);
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS linked_ropa_entry_id UUID;
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS linked_system_ids TEXT[] DEFAULT '{}';
    ALTER TABLE "${schema}".dpia_assessments ADD COLUMN IF NOT EXISTS workspace_id UUID;
    CREATE INDEX IF NOT EXISTS idx_dpia_status ON "${schema}".dpia_assessments (status);
    CREATE INDEX IF NOT EXISTS idx_dpia_risk_level ON "${schema}".dpia_assessments (overall_risk_level);
  `);

  // -- SLA Definitions
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".sla_definitions (
      sla_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      entity_type VARCHAR(50) NOT NULL,
      metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('response_time','resolution_time','uptime','review_cycle','evidence_collection','remediation','custom')),
      target_value DECIMAL(10,2) NOT NULL,
      target_unit VARCHAR(20) NOT NULL DEFAULT 'hours' CHECK (target_unit IN ('minutes','hours','days','percent')),
      warning_threshold DECIMAL(10,2),
      critical_threshold DECIMAL(10,2),
      escalation_chain JSONB DEFAULT '[]',
      applicable_severities TEXT[] DEFAULT '{low,medium,high,critical}',
      applicable_priorities TEXT[] DEFAULT '{low,medium,high,critical}',
      enabled BOOLEAN DEFAULT TRUE,
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sla_entity_type ON "${schema}".sla_definitions (entity_type, enabled);
    CREATE TABLE IF NOT EXISTS "${schema}".sla_breaches (
      breach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sla_id UUID NOT NULL REFERENCES "${schema}".sla_definitions(sla_id) ON DELETE CASCADE,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      expected_value DECIMAL(10,2) NOT NULL,
      actual_value DECIMAL(10,2) NOT NULL,
      breach_severity VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (breach_severity IN ('warning','critical')),
      acknowledged BOOLEAN DEFAULT FALSE,
      acknowledged_by VARCHAR(64),
      acknowledged_at TIMESTAMPTZ,
      resolved BOOLEAN DEFAULT FALSE,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sla_breaches_sla ON "${schema}".sla_breaches (sla_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sla_breaches_entity ON "${schema}".sla_breaches (entity_type, entity_id);
  `);

  // -- ESG
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".esg_categories (
      category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pillar VARCHAR(20) NOT NULL CHECK (pillar IN ('environmental','social','governance')),
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      description_en TEXT,
      description_ar TEXT,
      sort_order INT DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".esg_metrics (
      metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID NOT NULL REFERENCES "${schema}".esg_categories(category_id) ON DELETE CASCADE,
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      unit VARCHAR(50) NOT NULL,
      target_value DECIMAL(12,2),
      current_value DECIMAL(12,2),
      previous_value DECIMAL(12,2),
      data_source VARCHAR(100),
      reporting_period VARCHAR(20) NOT NULL DEFAULT 'annual' CHECK (reporting_period IN ('monthly','quarterly','semi_annual','annual')),
      framework_refs TEXT[] DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','off_track','not_started')),
      last_updated_by VARCHAR(64),
      workspace_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_esg_metrics_category ON "${schema}".esg_metrics (category_id);
    CREATE INDEX IF NOT EXISTS idx_esg_categories_pillar ON "${schema}".esg_categories (pillar, active);
  `);

  // -- Locations
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".locations (
      location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      location_type VARCHAR(30) NOT NULL DEFAULT 'office' CHECK (location_type IN ('headquarters','office','branch','data_center','warehouse','remote','cloud_region')),
      parent_location_id UUID REFERENCES "${schema}".locations(location_id),
      address_line1 VARCHAR(500),
      address_line2 VARCHAR(500),
      city VARCHAR(100),
      state_province VARCHAR(100),
      country VARCHAR(3) DEFAULT 'SAU',
      postal_code VARCHAR(20),
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
      employee_count INT DEFAULT 0,
      is_critical BOOLEAN DEFAULT FALSE,
      applicable_jurisdictions TEXT[] DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','planned','decommissioned')),
      workspace_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_locations_type ON "${schema}".locations (location_type, status);
    CREATE INDEX IF NOT EXISTS idx_locations_country ON "${schema}".locations (country);
    CREATE INDEX IF NOT EXISTS idx_locations_parent ON "${schema}".locations (parent_location_id) WHERE parent_location_id IS NOT NULL;
  `);

  // -- Digital Signatures
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".digital_signatures (
      signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      signer_id VARCHAR(64) NOT NULL,
      signer_name VARCHAR(255) NOT NULL,
      signer_role VARCHAR(50),
      signature_type VARCHAR(30) NOT NULL DEFAULT 'approval' CHECK (signature_type IN ('approval','review','acknowledgment','attestation','certification')),
      signature_hash VARCHAR(128) NOT NULL,
      certificate_ref VARCHAR(255),
      ip_address INET,
      user_agent TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','revoked','expired')),
      revoked_at TIMESTAMPTZ,
      revoked_reason TEXT,
      signed_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_signatures_entity ON "${schema}".digital_signatures (entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_signatures_signer ON "${schema}".digital_signatures (signer_id, signed_at DESC);
  `);

  // -- Saved Views
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".saved_views (
      view_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      page_route VARCHAR(200) NOT NULL,
      filters JSONB NOT NULL DEFAULT '{}',
      sort_config JSONB DEFAULT '{}',
      column_config JSONB DEFAULT '[]',
      is_default BOOLEAN DEFAULT FALSE,
      shared BOOLEAN DEFAULT FALSE,
      shared_with_roles TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_saved_views_user ON "${schema}".saved_views (user_id, page_route);
    CREATE INDEX IF NOT EXISTS idx_saved_views_shared ON "${schema}".saved_views (page_route, shared) WHERE shared = TRUE;
  `);

  // -- Favorites
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".favorites (
      favorite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      entity_title VARCHAR(500),
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, entity_type, entity_id)
    );
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON "${schema}".favorites (user_id, sort_order);
  `);

  // -- Dashboard Shares
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".dashboard_shares (
      share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dashboard_code VARCHAR(80) NOT NULL,
      shared_by VARCHAR(64) NOT NULL,
      share_type VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (share_type IN ('user','role','team','public')),
      shared_with VARCHAR(100) NOT NULL,
      permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view','edit','admin')),
      custom_layout JSONB,
      filters JSONB DEFAULT '{}',
      expires_at TIMESTAMPTZ,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dashboard_shares_code ON "${schema}".dashboard_shares (dashboard_code, active);
    CREATE INDEX IF NOT EXISTS idx_dashboard_shares_target ON "${schema}".dashboard_shares (share_type, shared_with, active);
  `);

  // -- File Storage Metadata
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".file_storage (
      file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      original_filename VARCHAR(500) NOT NULL,
      storage_provider VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (storage_provider IN ('local','s3','azure_blob','gcs')),
      storage_key VARCHAR(1000) NOT NULL,
      storage_bucket VARCHAR(255),
      content_type VARCHAR(100),
      file_size_bytes BIGINT NOT NULL,
      content_hash VARCHAR(128) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(100),
      uploaded_by VARCHAR(64) NOT NULL,
      access_level VARCHAR(20) DEFAULT 'private' CHECK (access_level IN ('private','tenant','public')),
      virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN ('pending','clean','infected','error','skipped')),
      virus_scan_at TIMESTAMPTZ,
      retention_until DATE,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_file_storage_entity ON "${schema}".file_storage (entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_file_storage_hash ON "${schema}".file_storage (content_hash);
    CREATE INDEX IF NOT EXISTS idx_file_storage_uploaded_by ON "${schema}".file_storage (uploaded_by, created_at DESC);
  `);

  // -- Email Templates
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".email_templates (
      template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_key VARCHAR(100) NOT NULL UNIQUE,
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      subject_en VARCHAR(500) NOT NULL,
      subject_ar VARCHAR(500),
      body_html_en TEXT NOT NULL,
      body_html_ar TEXT,
      body_text_en TEXT,
      body_text_ar TEXT,
      variables JSONB DEFAULT '[]',
      category VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (category IN ('system','notification','approval','report','onboarding','marketing','custom')),
      enabled BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_email_templates_key ON "${schema}".email_templates (template_key, enabled);
    CREATE INDEX IF NOT EXISTS idx_email_templates_category ON "${schema}".email_templates (category, enabled);
    CREATE TABLE IF NOT EXISTS "${schema}".email_send_log (
      send_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_key VARCHAR(100),
      recipient_email VARCHAR(255) NOT NULL,
      recipient_user_id VARCHAR(64),
      subject VARCHAR(500) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','bounced','failed')),
      provider VARCHAR(30),
      provider_message_id VARCHAR(255),
      error_message TEXT,
      metadata JSONB DEFAULT '{}',
      queued_at TIMESTAMPTZ DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON "${schema}".email_send_log (recipient_email, queued_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_send_log_status ON "${schema}".email_send_log (status, queued_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_send_log_template ON "${schema}".email_send_log (template_key, queued_at DESC);
  `);

  // === Migration 025: Missing Indexes & Soft-Delete Columns ===
  try {
    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_trail_module ON "${schema}".audit_trail (module, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON "${schema}".audit_trail (entity_type, entity_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON "${schema}".audit_trail (user_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_trail_ai_module ON "${schema}".audit_trail (action, timestamp DESC) WHERE module LIKE 'ai-%';
      CREATE INDEX IF NOT EXISTS idx_audit_trail_ai_ops ON "${schema}".audit_trail (action, timestamp DESC) WHERE module = 'ai-governance-ops';

      -- Audit trail immutability: block UPDATE/DELETE at DB level
      CREATE OR REPLACE FUNCTION "${schema}".audit_trail_immutable() RETURNS TRIGGER AS $trg$
      BEGIN
        RAISE EXCEPTION 'audit_trail is immutable: % operations are forbidden', TG_OP;
        RETURN NULL;
      END;
      $trg$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_audit_trail_no_update ON "${schema}".audit_trail;
      CREATE TRIGGER trg_audit_trail_no_update BEFORE UPDATE ON "${schema}".audit_trail FOR EACH ROW EXECUTE FUNCTION "${schema}".audit_trail_immutable();
      DROP TRIGGER IF EXISTS trg_audit_trail_no_delete ON "${schema}".audit_trail;
      CREATE TRIGGER trg_audit_trail_no_delete BEFORE DELETE ON "${schema}".audit_trail FOR EACH ROW EXECUTE FUNCTION "${schema}".audit_trail_immutable();

      CREATE INDEX IF NOT EXISTS idx_evidence_control ON "${schema}".evidence (control_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_submitted ON "${schema}".evidence (submitted_by, submitted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_status_severity ON "${schema}".incidents (status, severity);
      CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON "${schema}".incidents (assigned_to, status);
      CREATE INDEX IF NOT EXISTS idx_incidents_created ON "${schema}".incidents (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_findings_status ON "${schema}".findings (status, severity);
      CREATE INDEX IF NOT EXISTS idx_findings_source ON "${schema}".findings (source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_findings_confidentiality_level ON "${schema}".findings (confidentiality_level);
      CREATE INDEX IF NOT EXISTS idx_evidence_confidentiality_level ON "${schema}".evidence (confidentiality_level);
      CREATE INDEX IF NOT EXISTS idx_remediation_status_due ON "${schema}".remediation_tasks (status, due_date);
      CREATE INDEX IF NOT EXISTS idx_remediation_assigned ON "${schema}".remediation_tasks (assigned_to, status);
      CREATE INDEX IF NOT EXISTS idx_approvals_approver ON "${schema}".approvals (approver_id, status);
      CREATE INDEX IF NOT EXISTS idx_approvals_execution ON "${schema}".approvals (execution_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON "${schema}".notifications (user_id, read, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_workflows_status ON "${schema}".workflows (status);
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON "${schema}".workflow_executions (status, started_at DESC);
      DO $idx_block$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schema}' AND table_name='automation_rules' AND column_name='rule_category') THEN
          CREATE INDEX IF NOT EXISTS idx_automation_rules_category ON "${schema}".automation_rules (rule_category, active);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schema}' AND table_name='automation_rules' AND column_name='module') THEN
          CREATE INDEX IF NOT EXISTS idx_automation_rules_module ON "${schema}".automation_rules (module, enabled);
        END IF;
      END $idx_block$;
      CREATE INDEX IF NOT EXISTS idx_automation_log_rule ON "${schema}".automation_log (rule_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_risks_status ON "${schema}".risks (status);
      CREATE INDEX IF NOT EXISTS idx_risks_score ON "${schema}".risks (risk_score DESC);
      CREATE INDEX IF NOT EXISTS idx_controls_status ON "${schema}".controls (status);
      CREATE INDEX IF NOT EXISTS idx_policies_status ON "${schema}".policies (status);
      CREATE INDEX IF NOT EXISTS idx_policies_approval ON "${schema}".policies (approval_status);
      CREATE INDEX IF NOT EXISTS idx_frameworks_status ON "${schema}".frameworks (status);
      CREATE INDEX IF NOT EXISTS idx_vendors_risk_tier ON "${schema}".vendors (risk_tier, status);
      CREATE INDEX IF NOT EXISTS idx_assessments_framework ON "${schema}".assessments (framework_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_status ON "${schema}".assessments (status);
      CREATE INDEX IF NOT EXISTS idx_exceptions_status ON "${schema}".exceptions (status);
      CREATE INDEX IF NOT EXISTS idx_assets_type ON "${schema}".assets (type, criticality);
      CREATE INDEX IF NOT EXISTS idx_vuln_assigned ON "${schema}".vulnerabilities (assigned_to, status);
      CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user ON "${schema}".copilot_sessions (user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_type ON "${schema}".reports (type, generated_at DESC);
    `);
  } catch (err: unknown) {
    logger.warn(`[DB] Some indexes may already exist for ${schema}: ${toErrorMessage(err)}`);
  }

  // -- Soft-Delete Columns
  await query(`
    ALTER TABLE "${schema}".risks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".frameworks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".evidence ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".incidents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".findings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".assessments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".remediation_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".exceptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".vulnerabilities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".workflows ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".automation_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".bcp_plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  `);

  // === Migration: workspace_id + lifecycle_phase + extra columns ===
  await query(`
    ALTER TABLE "${schema}".frameworks      ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".frameworks      ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'plan';
    ALTER TABLE "${schema}".frameworks      ADD COLUMN IF NOT EXISTS seeding_tier VARCHAR(20) DEFAULT 'mandatory';
    ALTER TABLE "${schema}".frameworks      ADD COLUMN IF NOT EXISTS removed_by_admin BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".frameworks      ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
    ALTER TABLE "${schema}".frameworks      ADD COLUMN IF NOT EXISTS removed_reason TEXT;
    ALTER TABLE "${schema}".risks           ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".risks           ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'assess';
    ALTER TABLE "${schema}".controls        ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".controls        ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'implement';
    ALTER TABLE "${schema}".policies        ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".policies        ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'design';
    ALTER TABLE "${schema}".evidence        ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".evidence        ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'implement';
    ALTER TABLE "${schema}".assessments     ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".assessments     ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'assure';
    ALTER TABLE "${schema}".incidents       ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".incidents       ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'operate';
    ALTER TABLE "${schema}".vendors         ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".vendors         ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'assess';
    ALTER TABLE "${schema}".remediation_tasks ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE "${schema}".remediation_tasks ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20) DEFAULT 'improve';
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS due_date DATE;
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS vendor_id UUID;
    ALTER TABLE "${schema}".activity_feed    ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
    ALTER TABLE "${schema}".activity_feed    ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".activity_feed    ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
    ALTER TABLE "${schema}".activity_feed    ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted';
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS org_unit_id VARCHAR(64);
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS sensitivity VARCHAR(20);
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS severity VARCHAR(20);
    ALTER TABLE "${schema}".evidence         ADD COLUMN IF NOT EXISTS reviewer_user_id VARCHAR(64);
  `);
}
