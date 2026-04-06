import { logger } from '../../../platform/dos/observability/logger.service';
// ============================================
// AI Agents Schema
// Role profiles, AI trigger config, user role assignments,
// role functions, authorization matrix, SoD conflicts,
// AGRC-OS UI config tables, AI asset inventory,
// prompt registry, agent registry, and AI governance tables.
// ============================================

import { query } from '../query';
import { seedAgrcOsUiCatalog } from '../init-master-db';

/**
 * Creates AI agent, role profile, authorization, and AI governance registry tables.
 * Depends on foundation and teams-governance tables.
 */
export async function createAiAgentsTables(schema: string): Promise<void> {
  // === GRC Competitive Overhaul — Role profiles & AI trigger config ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".role_profiles (
      role VARCHAR(50) PRIMARY KEY,
      modules JSONB NOT NULL DEFAULT '[]',
      dashboard_widgets JSONB NOT NULL DEFAULT '[]',
      default_landing_page VARCHAR(100) NOT NULL DEFAULT '/dashboard',
      custom BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".user_role_assignments (
      assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      role_id UUID NOT NULL,
      scope_type VARCHAR(32) NOT NULL DEFAULT 'tenant',
      scope_id VARCHAR(128),
      is_primary BOOLEAN NOT NULL DEFAULT false,
      valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      valid_to TIMESTAMPTZ,
      assigned_by VARCHAR(64),
      reason TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, role_id, scope_type, scope_id)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".role_functions (
      function_code VARCHAR(100) PRIMARY KEY,
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      description_en TEXT,
      description_ar TEXT,
      is_system BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".role_function_map (
      role_id UUID NOT NULL,
      function_code VARCHAR(100) NOT NULL REFERENCES "${schema}".role_functions(function_code),
      can_author BOOLEAN NOT NULL DEFAULT false,
      can_approve BOOLEAN NOT NULL DEFAULT false,
      is_responsible BOOLEAN NOT NULL DEFAULT false,
      is_accountable BOOLEAN NOT NULL DEFAULT false,
      is_consulted BOOLEAN NOT NULL DEFAULT false,
      is_informed BOOLEAN NOT NULL DEFAULT false,
      enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (role_id, function_code)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".function_authorities (
      function_code VARCHAR(100) NOT NULL REFERENCES "${schema}".role_functions(function_code),
      action VARCHAR(64) NOT NULL,
      resource_type VARCHAR(64) NOT NULL,
      allow BOOLEAN NOT NULL DEFAULT true,
      max_risk_level VARCHAR(20) DEFAULT 'critical',
      conditions JSONB NOT NULL DEFAULT '{}',
      active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (function_code, action, resource_type)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".role_function_scope_map (
      scope_map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID NOT NULL,
      function_code VARCHAR(100) NOT NULL REFERENCES "${schema}".role_functions(function_code),
      scope_type VARCHAR(32) NOT NULL,
      scope_id VARCHAR(128),
      enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (role_id, function_code, scope_type, scope_id)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".user_function_overrides (
      override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      function_code VARCHAR(100) NOT NULL,
      action VARCHAR(64) NOT NULL,
      resource_type VARCHAR(64) NOT NULL,
      allow BOOLEAN NOT NULL,
      scope_type VARCHAR(32) NOT NULL DEFAULT 'tenant',
      scope_id VARCHAR(128),
      reason TEXT,
      expires_at TIMESTAMPTZ,
      created_by VARCHAR(64),
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".authorization_decision_log (
      decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      action VARCHAR(64) NOT NULL,
      resource_type VARCHAR(64) NOT NULL,
      resource_id VARCHAR(128),
      scope_type VARCHAR(32) NOT NULL,
      required_function VARCHAR(100),
      allowed BOOLEAN NOT NULL,
      decision_source VARCHAR(32) NOT NULL,
      matched_role_id UUID,
      matched_function_code VARCHAR(100),
      reason TEXT,
      decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".authorization_mismatch_log (
      mismatch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      permission VARCHAR(100) NOT NULL,
      legacy_allowed BOOLEAN NOT NULL,
      matrix_allowed BOOLEAN NOT NULL,
      matrix_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON "${schema}".user_role_assignments(user_id, active);
    CREATE INDEX IF NOT EXISTS idx_role_function_map_role ON "${schema}".role_function_map(role_id, enabled);
    CREATE INDEX IF NOT EXISTS idx_role_function_scope_map ON "${schema}".role_function_scope_map(role_id, function_code, scope_type, scope_id);
    CREATE INDEX IF NOT EXISTS idx_authorization_decision_user ON "${schema}".authorization_decision_log(user_id, decided_at DESC);
    CREATE INDEX IF NOT EXISTS idx_authorization_mismatch_user ON "${schema}".authorization_mismatch_log(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS "${schema}".sod_conflict_matrix (
      conflict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_a VARCHAR(50) NOT NULL,
      role_b VARCHAR(50) NOT NULL,
      scope VARCHAR(50) DEFAULT 'tenant',
      reason_en TEXT NOT NULL,
      reason_ar TEXT,
      severity VARCHAR(20) NOT NULL DEFAULT 'hard',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (role_a, role_b, scope)
    );

    INSERT INTO "${schema}".sod_conflict_matrix (role_a, role_b, scope, reason_en, reason_ar, severity)
    VALUES
      ('risk_manager', 'auditor', 'tenant', 'Cannot audit own risk assessments', 'لا يمكن تدقيق تقييمات المخاطر الخاصة', 'hard'),
      ('compliance_officer', 'auditor', 'tenant', 'Cannot audit own compliance work', 'لا يمكن تدقيق أعمال الامتثال الخاصة', 'hard'),
      ('admin', 'auditor', 'tenant', 'Admin can modify anything auditor reviews', 'يمكن للمسؤول تعديل أي شيء يراجعه المدقق', 'soft')
    ON CONFLICT (role_a, role_b, scope) DO NOTHING;

    CREATE TABLE IF NOT EXISTS "${schema}".ai_trigger_config (
      tenant_id UUID PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      risk_threshold VARCHAR(20) DEFAULT 'critical',
      compliance_gap_threshold INT DEFAULT 30,
      incident_severity_threshold VARCHAR(20) DEFAULT 'critical',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === User-role responsibility matrix view ===
  try {
    await query(`
      CREATE OR REPLACE VIEW "${schema}".v_user_role_responsibility_matrix AS
        SELECT
          ura.user_id,
          u.email,
          u.name,
          ura.role_id,
          rf.function_code,
          rf.name_en AS function_name_en,
          rf.name_ar AS function_name_ar,
          rfm.can_author,
          rfm.can_approve,
          rfm.is_responsible,
          rfm.is_accountable,
          rfm.is_consulted,
          rfm.is_informed,
          COALESCE(rfsm.scope_type, 'global') AS scope_type,
          rfsm.scope_id,
          ura.is_primary,
          ura.active
        FROM "${schema}".user_role_assignments ura
        LEFT JOIN users u
          ON u.user_id = ura.user_id
        JOIN "${schema}".role_function_map rfm
          ON rfm.role_id = ura.role_id
         AND rfm.enabled = TRUE
        JOIN "${schema}".role_functions rf
          ON rf.function_code = rfm.function_code
        LEFT JOIN "${schema}".role_function_scope_map rfsm
          ON rfsm.role_id = rfm.role_id
         AND rfsm.function_code = rfm.function_code
         AND rfsm.enabled = TRUE
        WHERE ura.active = TRUE
          AND (ura.valid_to IS NULL OR ura.valid_to > NOW());
    `);
  } catch (err: unknown) {
    logger.warn(`[DB] v_user_role_responsibility_matrix view skipped for ${schema}:`, (err instanceof Error ? err.message : String(err)));
  }

  // === AGRC-OS UI config (migration 017) ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".workspace_profile (
      tenant_id VARCHAR(64) PRIMARY KEY,
      industry VARCHAR(100) NOT NULL DEFAULT 'other',
      org_size VARCHAR(50) NOT NULL DEFAULT '1-50',
      sectors JSONB DEFAULT '[]',
      default_dashboard VARCHAR(100) NOT NULL DEFAULT 'big_picture',
      risk_appetite VARCHAR(20) DEFAULT 'moderate',
      escalation_level VARCHAR(20) DEFAULT 'high',
      orchestrator_enabled VARCHAR(20) DEFAULT 'auto',
      reporting_cadence VARCHAR(20) DEFAULT 'weekly',
      enforcement_mode VARCHAR(20) DEFAULT 'advisory',
      evidence_freshness_days INT DEFAULT 60,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".widget_registry (
      widget_key VARCHAR(80) PRIMARY KEY,
      label_en VARCHAR(200) NOT NULL,
      label_ar VARCHAR(200),
      category VARCHAR(50) NOT NULL DEFAULT 'overview',
      default_width INT NOT NULL DEFAULT 2,
      default_height INT NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".dashboard_layouts (
      layout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dashboard_code VARCHAR(80) NOT NULL UNIQUE,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200),
      layout JSONB NOT NULL DEFAULT '{"widgets":[]}',
      audience VARCHAR(80) NOT NULL DEFAULT 'all',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_audience ON "${schema}".dashboard_layouts(audience);
    CREATE TABLE IF NOT EXISTS "${schema}".drawer_templates (
      template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_key VARCHAR(80) NOT NULL UNIQUE,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200),
      zones JSONB NOT NULL DEFAULT '[]',
      context_type VARCHAR(80) NOT NULL DEFAULT 'entity',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_drawer_templates_context ON "${schema}".drawer_templates(context_type);
  `);

  // === Seed AGRC-OS UI (role_profiles, widget_registry, dashboard_layouts, drawer_templates) ===
  try {
    await seedAgrcOsUiCatalog(schema);
  } catch (err: unknown) {
    logger.warn(`[DB] AGRC-OS UI seed skipped for ${schema}:`, (err instanceof Error ? err.message : String(err)));
  }

  // === R1: Create AI governance registry tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ai_asset_inventory (
      asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_type VARCHAR(30) NOT NULL,
      asset_key VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      scope_type VARCHAR(30) DEFAULT 'tenant',
      tenant_id TEXT,
      lifecycle_status VARCHAR(30) DEFAULT 'draft',
      status VARCHAR(30) DEFAULT 'enabled',
      business_owner VARCHAR(64),
      technical_owner VARCHAR(64),
      governance_owner VARCHAR(64),
      source_type VARCHAR(30),
      source_ref TEXT,
      metadata JSONB DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      created_by VARCHAR(64) DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_asset_type_key ON "${schema}".ai_asset_inventory(asset_type, asset_key) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_ai_asset_type ON "${schema}".ai_asset_inventory(asset_type);
    CREATE INDEX IF NOT EXISTS idx_ai_asset_status ON "${schema}".ai_asset_inventory(status);

    CREATE TABLE IF NOT EXISTS "${schema}".ai_prompt_registry (
      prompt_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID NOT NULL,
      version_number INT NOT NULL DEFAULT 1,
      template_text TEXT NOT NULL DEFAULT '',
      variables JSONB DEFAULT '[]',
      linked_model_asset_id UUID,
      approval_status VARCHAR(30) DEFAULT 'draft',
      deployment_status VARCHAR(30) DEFAULT 'inactive',
      is_active BOOLEAN DEFAULT FALSE,
      rollback_from_version_id UUID,
      diff_summary TEXT,
      change_summary TEXT,
      notes TEXT,
      approved_by VARCHAR(64),
      approved_at TIMESTAMPTZ,
      deployed_by VARCHAR(64),
      deployed_at TIMESTAMPTZ,
      created_by VARCHAR(64) DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_prompt_asset ON "${schema}".ai_prompt_registry(asset_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_ai_prompt_active ON "${schema}".ai_prompt_registry(asset_id) WHERE is_active = TRUE;

    CREATE TABLE IF NOT EXISTS "${schema}".ai_agent_registry (
      agent_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID NOT NULL,
      version_number INT NOT NULL DEFAULT 1,
      agent_config JSONB NOT NULL DEFAULT '{}',
      linked_prompt_asset_id UUID,
      linked_model_asset_id UUID,
      capabilities JSONB DEFAULT '[]',
      approval_status VARCHAR(30) DEFAULT 'draft',
      deployment_status VARCHAR(30) DEFAULT 'inactive',
      is_active BOOLEAN DEFAULT FALSE,
      rollback_from_version_id UUID,
      diff_summary TEXT,
      change_summary TEXT,
      notes TEXT,
      approved_by VARCHAR(64),
      approved_at TIMESTAMPTZ,
      deployed_by VARCHAR(64),
      deployed_at TIMESTAMPTZ,
      created_by VARCHAR(64) DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_agent_asset ON "${schema}".ai_agent_registry(asset_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_ai_agent_active ON "${schema}".ai_agent_registry(asset_id) WHERE is_active = TRUE;
  `);

  // === 2G: AI Governance operations tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".ai_governance_break_glass (
      break_glass_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID NOT NULL,
      version_id UUID,
      registry_type VARCHAR(50) NOT NULL,
      actor_id VARCHAR(64) NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      duration_minutes INT,
      expires_at TIMESTAMPTZ,
      revoked_by VARCHAR(64),
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bg_status ON "${schema}".ai_governance_break_glass(status);
    CREATE INDEX IF NOT EXISTS idx_bg_asset ON "${schema}".ai_governance_break_glass(asset_id);

    CREATE TABLE IF NOT EXISTS "${schema}".ai_governance_promotions (
      promotion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID NOT NULL,
      version_id UUID NOT NULL,
      registry_type VARCHAR(50) NOT NULL,
      from_environment VARCHAR(30) NOT NULL,
      to_environment VARCHAR(30) NOT NULL,
      promoted_by VARCHAR(64) NOT NULL,
      approval_status VARCHAR(30) DEFAULT 'completed',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_promo_asset ON "${schema}".ai_governance_promotions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_promo_registry ON "${schema}".ai_governance_promotions(registry_type);
  `);

  // === Agent Cooperation Tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".agent_cycle_summaries (
      cycle_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      discoveries JSONB DEFAULT '[]',
      handoffs JSONB DEFAULT '[]',
      correlations JSONB DEFAULT '[]',
      discovery_count INT DEFAULT 0,
      handoff_count INT DEFAULT 0,
      correlation_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".agent_handoffs (
      id TEXT PRIMARY KEY,
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      handoff_type TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS "${schema}".agent_discoveries (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      discovery_type TEXT,
      title TEXT,
      severity TEXT DEFAULT 'medium',
      entity_type TEXT,
      entity_id TEXT,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".agent_correlations (
      id TEXT PRIMARY KEY,
      agents TEXT[],
      shared_entity TEXT,
      severity TEXT DEFAULT 'medium',
      findings JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
