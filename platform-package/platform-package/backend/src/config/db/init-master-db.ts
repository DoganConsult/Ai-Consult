import { logger } from '../../platform/dos/observability/logger.service';
// ============================================
// Platform — Master DB Initialization
// Public schema tables and security configuration
// ============================================

import { query } from "./query";
import { pool } from "./pool";
import { toErrorMessage } from '../../errors/http-error.util';

export async function waitForDatabase(maxRetries = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err: unknown) {
      if (attempt === maxRetries) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logger.error(JSON.stringify({ level: 'warn', message: `DB connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms`, error: toErrorMessage(err), timestamp: new Date().toISOString() }));
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/** Initialize master tables (public schema) */
export async function initMasterDB(): Promise<void> {
  // === Core tables (existing) ===
  await query(`
    CREATE TABLE IF NOT EXISTS tenants (
      tenant_id VARCHAR(16) PRIMARY KEY,
      org_name VARCHAR(255) NOT NULL,
      industry VARCHAR(100) NOT NULL DEFAULT 'other',
      org_size VARCHAR(50) NOT NULL DEFAULT '1-50',
      regions TEXT[] DEFAULT '{}',
      plan VARCHAR(50) DEFAULT 'free',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      tenant_id VARCHAR(16) REFERENCES tenants(tenant_id),
      role VARCHAR(50) DEFAULT 'owner',
      onboarding_complete BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Extend tenants table — AGRC-grade organization profile ===
  await query(`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_code VARCHAR(50);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_name_en VARCHAR(255);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_name_ar VARCHAR(255);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS schema_name VARCHAR(100);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#1a73e8';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_frameworks TEXT[] DEFAULT '{}';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_score INT DEFAULT 0;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

    -- ═══ LAYER 1: Legal Identity ═══
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS org_name_ar VARCHAR(255);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS org_type VARCHAR(50) DEFAULT 'private';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legal_form VARCHAR(50);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cr_number VARCHAR(30);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS unified_number VARCHAR(30);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vat_number VARCHAR(30);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS listing_status VARCHAR(30) DEFAULT 'private';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id VARCHAR(16);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country_of_incorporation VARCHAR(3) DEFAULT 'SAU';

    -- ═══ LAYER 2: Location & Jurisdiction ═══
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS headquarter_city VARCHAR(100);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS economic_zone VARCHAR(50);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branch_count INT DEFAULT 1;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS operating_regions TEXT[] DEFAULT '{SAU}';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cross_border_ops BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cross_border_countries TEXT[] DEFAULT '{}';

    -- ═══ LAYER 3: Sector & Industry Classification ═══
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sector_ids TEXT[] DEFAULT '{}';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_sector_id VARCHAR(50);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS isic_code VARCHAR(10);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS critical_infrastructure BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS critical_sector_designation VARCHAR(50);

    -- ═══ LAYER 4: Operational Profile ═══
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS employee_count INT;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS annual_revenue_range VARCHAR(30);
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fiscal_year_end VARCHAR(5) DEFAULT '12-31';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS it_staff_count INT DEFAULT 0;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS security_staff_count INT DEFAULT 0;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_ciso BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_dpo BOOLEAN DEFAULT FALSE;

    -- ═══ LAYER 5: Data & Technology Profile ═══
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_classification_level VARCHAR(30) DEFAULT 'internal';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS processes_personal_data BOOLEAN DEFAULT TRUE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS personal_data_volume VARCHAR(20) DEFAULT 'medium';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cross_border_data_transfer BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cloud_providers TEXT[] DEFAULT '{}';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS uses_ai_ml BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS processes_payment_cards BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_ot_scada BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_iot_devices BOOLEAN DEFAULT FALSE;

    -- ═══ LAYER 6: GRC Maturity & Program State ═══
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grc_maturity_level VARCHAR(30) DEFAULT 'initial';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS existing_certifications TEXT[] DEFAULT '{}';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS target_certifications TEXT[] DEFAULT '{}';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_audit_date DATE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_audit_date DATE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS regulator_ids TEXT[] DEFAULT '{}';

    -- ═══ LAYER 7: Governance & Oversight ═══
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_board_committee BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_risk_committee BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_audit_committee BOOLEAN DEFAULT FALSE;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reporting_currency VARCHAR(3) DEFAULT 'SAR';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS language_primary VARCHAR(2) DEFAULT 'ar';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS language_secondary VARCHAR(2) DEFAULT 'en';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Riyadh';
  `);

  // === Control-plane domain registry (multi-hostname → one tenant; verified only) ===
  await query(`
    CREATE TABLE IF NOT EXISTS public.tenant_domains (
      domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(16) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      hostname VARCHAR(255) NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      verified_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_domains_hostname_active
      ON public.tenant_domains (LOWER(TRIM(hostname)))
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_active
      ON public.tenant_domains (tenant_id)
      WHERE deleted_at IS NULL;
  `);

  // === Extend users table ===
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_role VARCHAR(50) DEFAULT 'viewer';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'internal';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0;
  `);

  // === Multi-tenant membership (supports users belonging to multiple tenants) ===
  await query(`
    CREATE TABLE IF NOT EXISTS tenant_user_memberships (
      membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      tenant_id VARCHAR(16) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'viewer',
      membership_type VARCHAR(50) DEFAULT 'member',
      is_tenant_owner BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'active',
      is_primary BOOLEAN DEFAULT FALSE,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      invited_by VARCHAR(64),
      last_accessed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, tenant_id)
    );
    CREATE INDEX IF NOT EXISTS idx_tum_user ON tenant_user_memberships(user_id) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_tum_tenant ON tenant_user_memberships(tenant_id) WHERE status = 'active';
  `);

  // === Regulatory Registry (master, shared across tenants) ===
  await query(`
    CREATE TABLE IF NOT EXISTS regulators (
      regulator_id VARCHAR(50) PRIMARY KEY,
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      acronym VARCHAR(20),
      category VARCHAR(50),
      website VARCHAR(255),
      mandate_note TEXT,
      sectors TEXT[] DEFAULT '{}',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS instruments (
      instrument_id VARCHAR(100) PRIMARY KEY,
      regulator_id VARCHAR(50) REFERENCES regulators(regulator_id),
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      version VARCHAR(50),
      version_id VARCHAR(100),
      publication_date DATE,
      effective_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      sectors TEXT[] DEFAULT '{}',
      mandatory BOOLEAN DEFAULT FALSE,
      summary_en TEXT,
      summary_ar TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS instrument_structure (
      node_id VARCHAR(100) PRIMARY KEY,
      instrument_id VARCHAR(100) REFERENCES instruments(instrument_id),
      parent_node_id VARCHAR(100),
      level INT NOT NULL,
      code VARCHAR(50) NOT NULL,
      title_en VARCHAR(500) NOT NULL,
      title_ar VARCHAR(500) NOT NULL,
      description_en TEXT,
      description_ar TEXT,
      priority VARCHAR(20),
      automatable BOOLEAN DEFAULT FALSE,
      evidence_types TEXT[] DEFAULT '{}',
      sort_order INT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cross_mappings (
      mapping_id SERIAL PRIMARY KEY,
      source_node_id VARCHAR(100) REFERENCES instrument_structure(node_id),
      target_node_id VARCHAR(100) REFERENCES instrument_structure(node_id),
      relationship VARCHAR(50) DEFAULT 'equivalent',
      confidence DECIMAL(3,2) DEFAULT 1.0,
      rationale TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sectors (
      sector_id VARCHAR(50) PRIMARY KEY,
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      parent_sector_id VARCHAR(50),
      applicable_regulators TEXT[] DEFAULT '{}',
      applicable_frameworks TEXT[] DEFAULT '{}'
    );
  `);

  // === Auth hardening tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) REFERENCES users(user_id),
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_mfa (
      user_id VARCHAR(64) PRIMARY KEY REFERENCES users(user_id),
      mfa_type VARCHAR(20) NOT NULL,
      totp_secret VARCHAR(255),
      email_code_hash VARCHAR(255),
      email_code_expires_at TIMESTAMPTZ,
      consecutive_failures INT DEFAULT 0,
      locked_until TIMESTAMPTZ,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      ip_address INET,
      success BOOLEAN NOT NULL,
      attempted_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Agent performance tracking ===
  await query(`
    CREATE TABLE IF NOT EXISTS agent_performance (
      record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id VARCHAR(100) NOT NULL,
      tool_name VARCHAR(100) NOT NULL,
      tenant_id VARCHAR(16),
      duration_ms INT NOT NULL,
      success BOOLEAN NOT NULL,
      error_message TEXT,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Platform administration ===
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS edition_limits (
      plan VARCHAR(50) PRIMARY KEY,
      max_users INT DEFAULT 10,
      max_frameworks INT DEFAULT 5,
      max_assessments INT DEFAULT 20,
      features JSONB DEFAULT '{}'
    );
  `);

  // === Background job scheduler tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS job_registry (
      job_name VARCHAR(100) PRIMARY KEY,
      cron_expression VARCHAR(100) NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      last_run_at TIMESTAMPTZ,
      last_status VARCHAR(20),
      last_error TEXT,
      next_run_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS job_executions (
      execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_name VARCHAR(100) REFERENCES job_registry(job_name),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL,
      duration_ms INT,
      error_message TEXT
    );
  `);

  // === Seed data history tracking ===
  await query(`
    CREATE TABLE IF NOT EXISTS seed_history (
      seed_id VARCHAR(100) PRIMARY KEY,
      version VARCHAR(50) NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'success'
    );
  `);

  // === Provisioning job lookup (job_id → tenant_id for GET status without auth) ===
  await query(`
    CREATE TABLE IF NOT EXISTS provisioning_job_lookup (
      job_id UUID PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_provisioning_job_lookup_created ON provisioning_job_lookup(created_at);
  `);

  // === Roles table (DB-driven roles with permissions + descriptions) ===
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      role_id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(16) REFERENCES tenants(tenant_id),
      name_en VARCHAR(100) NOT NULL,
      name_ar VARCHAR(100) NOT NULL,
      description_en TEXT,
      description_ar TEXT,
      permissions TEXT[] DEFAULT '{}',
      is_system BOOLEAN DEFAULT TRUE,
      can_approve BOOLEAN DEFAULT FALSE,
      max_risk_level VARCHAR(20) DEFAULT 'low',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === User activities table ===
  await query(`
    CREATE TABLE IF NOT EXISTS user_activities (
      activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) REFERENCES users(user_id),
      tenant_id VARCHAR(16) REFERENCES tenants(tenant_id),
      action VARCHAR(50) NOT NULL,
      module VARCHAR(50),
      entity_type VARCHAR(50),
      entity_id VARCHAR(100),
      description TEXT,
      ip_address INET,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_activities_tenant ON user_activities(tenant_id, created_at DESC);
  `);

  // === Seed default system roles ===
  await query(`
    INSERT INTO roles (role_id, tenant_id, name_en, name_ar, description_en, description_ar, permissions, is_system, can_approve, max_risk_level, sort_order)
    VALUES
      ('owner', NULL, 'Platform Admin', 'مدير المنصة', 'Full platform access across all tenants. Manages billing, users, all structures and platform-wide settings.', 'وصول كامل للمنصة عبر جميع المستأجرين. يدير الفواتير والمستخدمين وجميع الهياكل وإعدادات المنصة.', ARRAY['policy.document.read','policy.document.write','policy.document.delete','policy.document.publish','risk.record.read','risk.record.write','risk.record.delete','risk.record.approve','framework.record.read','framework.record.manage','control.record.read','control.record.write','control.record.delete','assessment.record.read','assessment.record.write','assessment.record.delete','audit.record.read','audit.record.manage','tenant.config.manage','users.account.manage','analytics.report.read','analytics.report.write','workflow.instance.read','workflow.instance.write','report.document.read','report.document.write','workspace.config.read','workspace.config.write','evidence.item.read','evidence.item.write','evidence.item.delete','evidence.item.verify','compliance.program.read','compliance.program.write','integrations.connector.read','integrations.connector.write','training.record.read','training.record.write','ai.agent.read','ai.agent.write','ai.squad.read','ai.squad.write','vendor.record.read','vendor.record.write','vendor.record.delete','incident.record.read','incident.record.write','incident.record.delete','bcp.plan.read','bcp.plan.write','privacy.assessment.read','privacy.assessment.write','governance.body.read','governance.body.write','team.member.read','team.member.write','team.member.delegate','platform.admin.read','platform.admin.write'], TRUE, TRUE, 'critical', 1),
      ('admin', NULL, 'Admin', 'المشرف', 'Full operational access. Can manage users, roles, workflows and approvals.', 'وصول تشغيلي كامل. يمكنه إدارة المستخدمين والأدوار وسير العمل والموافقات.', ARRAY['policy.document.read','policy.document.write','policy.document.delete','risk.record.read','risk.record.write','risk.record.delete','framework.record.read','framework.record.manage','control.record.read','control.record.write','control.record.delete','assessment.record.read','assessment.record.write','assessment.record.delete','audit.record.read','audit.record.manage','tenant.config.manage','users.account.manage','analytics.report.read','analytics.report.write','workflow.instance.read','workflow.instance.write','report.document.read','report.document.write','workspace.config.read','workspace.config.write'], TRUE, TRUE, 'critical', 2),
      ('compliance_officer', NULL, 'Compliance Officer', 'مسؤول الامتثال', 'Manages frameworks, controls, policies and assessments. Can approve compliance items.', 'يدير الأطر والضوابط والسياسات والتقييمات. يمكنه الموافقة على عناصر الامتثال.', ARRAY['policy.document.read','policy.document.write','risk.record.read','framework.record.read','framework.record.manage','control.record.read','control.record.write','assessment.record.read','assessment.record.write','audit.record.read','analytics.report.read','workflow.instance.read','report.document.read','workspace.config.read'], TRUE, TRUE, 'high', 3),
      ('risk_manager', NULL, 'Risk Manager', 'مدير المخاطر', 'Manages risk register, risk assessments and treatments. Can approve risk items.', 'يدير سجل المخاطر وتقييمات المخاطر والمعالجات. يمكنه الموافقة على عناصر المخاطر.', ARRAY['policy.document.read','risk.record.read','risk.record.write','framework.record.read','control.record.read','control.record.write','assessment.record.read','audit.record.read','analytics.report.read','workflow.instance.read','report.document.read','workspace.config.read'], TRUE, TRUE, 'high', 4),
      ('auditor', NULL, 'Auditor', 'المدقق', 'Read-only access to all modules with audit management capabilities.', 'وصول للقراءة فقط لجميع الوحدات مع قدرات إدارة التدقيق.', ARRAY['policy.document.read','risk.record.read','framework.record.read','control.record.read','assessment.record.read','audit.record.read','audit.record.manage','analytics.report.read','workflow.instance.read','report.document.read','workspace.config.read'], TRUE, FALSE, 'medium', 5),
      ('viewer', NULL, 'Viewer', 'مشاهد', 'Read-only access to dashboards and reports. No edit or approval permissions.', 'وصول للقراءة فقط للوحات المعلومات والتقارير. بدون صلاحيات تعديل أو موافقة.', ARRAY['policy.document.read','risk.record.read','framework.record.read','control.record.read','assessment.record.read','audit.record.read','analytics.report.read','workspace.config.read'], TRUE, FALSE, 'low', 6)
    ON CONFLICT (role_id) DO UPDATE SET
      name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
      description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;
  `);

  // === Content pack registry (shared across tenants) ===
  await query(`
    CREATE TABLE IF NOT EXISTS content_packs (
      pack_id VARCHAR(100) PRIMARY KEY,
      version VARCHAR(20) NOT NULL,
      framework_refs TEXT[] NOT NULL,
      manifest JSONB NOT NULL,
      metadata JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Landing page content (shared, public) ===
  await query(`
    CREATE TABLE IF NOT EXISTS landing_content (
      content_id VARCHAR(50) PRIMARY KEY,
      section VARCHAR(50) NOT NULL,
      sort_order INT DEFAULT 0,
      icon VARCHAR(50),
      title_en VARCHAR(500),
      title_ar VARCHAR(500),
      desc_en TEXT,
      desc_ar TEXT,
      viz_type VARCHAR(30),
      chart_data JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Lead captures (contact + demo requests) ===
  await query(`
    CREATE TABLE IF NOT EXISTS lead_captures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_type VARCHAR(30) NOT NULL CHECK (lead_type IN ('contact','demo_request','newsletter')),
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      phone VARCHAR(50),
      message TEXT,
      metadata JSONB DEFAULT '{}',
      status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','dismissed')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_lead_captures_type ON lead_captures (lead_type, created_at DESC)`);

  // === Email verification tokens ===
  await query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens (token)`);

  // === Tier definitions ===
  await query(`
    CREATE TABLE IF NOT EXISTS tier_definitions (
      tier VARCHAR(20) PRIMARY KEY,
      features TEXT[] NOT NULL,
      limits JSONB NOT NULL,
      timeline VARCHAR(20)
    );
  `);

  // === Subscriptions (commercial billing) ===
  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(100) NOT NULL UNIQUE REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      tier VARCHAR(20) NOT NULL DEFAULT 'starter',
      billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly',
      gateway VARCHAR(20) NOT NULL DEFAULT 'stripe',
      external_subscription_id VARCHAR(255),
      stripe_customer_id VARCHAR(255),
      status VARCHAR(30) NOT NULL DEFAULT 'trialing',
      trial_ends_at TIMESTAMPTZ,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions (trial_ends_at) WHERE status = 'trialing';
  `);

  // === Payments (transaction ledger) ===
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(100) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      gateway VARCHAR(20) NOT NULL,
      external_payment_id VARCHAR(255),
      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments (tenant_id, created_at DESC);
  `);

  // === Quotes table (shared across tenants) ===
  await query(`
    CREATE TABLE IF NOT EXISTS quotes (
      quote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category VARCHAR(50) NOT NULL,
      text_ar TEXT NOT NULL,
      text_en TEXT NOT NULL,
      sort_order INT DEFAULT 0
    );
  `);

  // === Extend users table for role profiles ===
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role_profile VARCHAR(50);
  `);

  // === Extend users table for AI agent support + absence tracking ===
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'human';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_id VARCHAR(10);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS absence_status VARCHAR(20) DEFAULT 'available';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS absent_from TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS absent_until TIMESTAMPTZ;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS rate_limit_hits (
      key VARCHAR(255) NOT NULL,
      window_start BIGINT NOT NULL,
      hit_count INT NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (key, window_start)
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limit_updated ON rate_limit_hits (updated_at);
  `);

  // === Missing indexes for auth, lookup, and analytics tables ===
  await query(`
    CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts (email, attempted_at DESC) WHERE success = FALSE;
    CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id, expires_at) WHERE used = FALSE;
    CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON password_reset_tokens (token_hash) WHERE used = FALSE;
    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);
    CREATE INDEX IF NOT EXISTS idx_agent_perf_agent ON agent_performance (agent_id, executed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_instruments_regulator ON instruments (regulator_id);
    CREATE INDEX IF NOT EXISTS idx_instrument_structure_instrument ON instrument_structure (instrument_id);
    CREATE INDEX IF NOT EXISTS idx_instrument_structure_parent ON instrument_structure (parent_node_id);
    CREATE INDEX IF NOT EXISTS idx_cross_mappings_source ON cross_mappings (source_node_id);
    CREATE INDEX IF NOT EXISTS idx_cross_mappings_target ON cross_mappings (target_node_id);
    CREATE INDEX IF NOT EXISTS idx_job_executions_status ON job_executions (status, started_at DESC);
  `);

  // === Tenant Module Entitlements ===
  await query(`
    CREATE TABLE IF NOT EXISTS tenant_module_entitlements (
      entitlement_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id                  TEXT        NOT NULL UNIQUE REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      grc_enabled                BOOLEAN     NOT NULL DEFAULT TRUE,
      qiyas_enabled              BOOLEAN     NOT NULL DEFAULT FALSE,
      licensed_modules           TEXT[]      NOT NULL DEFAULT '{grc}',
      default_operation_mode     VARCHAR(30) NOT NULL DEFAULT 'human_only'
        CHECK (default_operation_mode IN ('human_only','hybrid_shadow','hybrid_active','autonomous')),
      agent_confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85,
      workflow_mode_enforcement  VARCHAR(20) NOT NULL DEFAULT 'per_step'
        CHECK (workflow_mode_enforcement IN ('tenant_wide','per_team','per_step')),
      modules_config             JSONB       NOT NULL DEFAULT '{}',
      activated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tme_tenant  ON tenant_module_entitlements(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tme_qiyas   ON tenant_module_entitlements(qiyas_enabled) WHERE qiyas_enabled = TRUE;
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grc_enabled     BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS qiyas_enabled   BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS licensed_modules TEXT[]  NOT NULL DEFAULT '{grc}';
  `).catch((err: unknown) => {
    logger.warn('[DB] Module entitlements DDL failed (non-fatal, idempotent)', { error: toErrorMessage(err) });
  });

  // Backfill entitlements for existing tenants
  await query(`
    INSERT INTO tenant_module_entitlements (tenant_id, grc_enabled, qiyas_enabled, licensed_modules)
    SELECT tenant_id, TRUE, FALSE, '{grc}' FROM tenants
    ON CONFLICT (tenant_id) DO NOTHING
  `).catch((err: unknown) => {
    logger.warn('[DB] Module entitlements backfill failed (non-fatal)', { error: toErrorMessage(err) });
  });

  // === Cleanup stale auth data ===
  await query(`DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days'`).catch((err: unknown) => {
    logger.warn('[DB] Stale login_attempts cleanup failed', { error: toErrorMessage(err) });
  });
  await query(`DELETE FROM password_reset_tokens WHERE (used = TRUE OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '7 days'`).catch((err: unknown) => {
    logger.warn('[DB] Stale password_reset_tokens cleanup failed', { error: toErrorMessage(err) });
  });

  // === Onboarding tables required by the registration flow ===
  await query(`
    CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_key VARCHAR(100) NOT NULL UNIQUE,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      tenant_id VARCHAR(64),
      workspace_id VARCHAR(64),
      started_by_user_id VARCHAR(64) NOT NULL,
      organization_name VARCHAR(255),
      display_name VARCHAR(255),
      language_code VARCHAR(10) NOT NULL DEFAULT 'en',
      progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
      readiness_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      blockers_count INT NOT NULL DEFAULT 0,
      current_stage_code VARCHAR(100),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_saved_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      provisioning_started_at TIMESTAMPTZ,
      provisioning_completed_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      version INT NOT NULL DEFAULT 1,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      session_code VARCHAR(100),
      user_id UUID,
      session_status VARCHAR(50),
      source VARCHAR(50),
      metadata JSONB,
      last_activity_at TIMESTAMPTZ,
      current_stage VARCHAR(50),
      completed_stages VARCHAR[],
      expires_at TIMESTAMPTZ,
      overall_readiness_score NUMERIC(5,2),
      stage_scores JSONB,
      category_scores JSONB,
      ip_address VARCHAR(50),
      user_agent TEXT,
      module_code VARCHAR(30) DEFAULT 'workspace_setup',
      parent_session_id UUID
    );
    CREATE INDEX IF NOT EXISTS idx_onb_sessions_status ON public.onboarding_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_onb_sessions_started_by ON public.onboarding_sessions(started_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON public.onboarding_sessions(tenant_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS public.onboarding_stage_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stage_code VARCHAR(50) NOT NULL UNIQUE,
      sort_order INT NOT NULL DEFAULT 0,
      icon_class VARCHAR(100),
      label_en TEXT NOT NULL,
      label_ar TEXT NOT NULL,
      description_en TEXT,
      description_ar TEXT,
      is_required BOOLEAN NOT NULL DEFAULT TRUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      min_readiness_score NUMERIC(5,2) DEFAULT 0,
      max_completion_days INT DEFAULT 30,
      validation_rules JSONB,
      metadata JSONB,
      visibility_rule_json JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_stage_definitions_code ON public.onboarding_stage_definitions(stage_code);
    CREATE INDEX IF NOT EXISTS idx_stage_definitions_active ON public.onboarding_stage_definitions(is_active) WHERE is_active = TRUE;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS public.onboarding_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
      stage_code VARCHAR(100) NOT NULL,
      display_order INT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'not_started',
      percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      validated_at TIMESTAMPTZ,
      validation_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(session_id, stage_code)
    );
    CREATE INDEX IF NOT EXISTS idx_onb_stages_session ON public.onboarding_stages(session_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS public.onboarding_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
      question_code VARCHAR(150) NOT NULL,
      answer_text TEXT,
      answer_number NUMERIC(18,4),
      answer_bool BOOLEAN,
      answer_date DATE,
      answer_json JSONB,
      answered_by_user_id VARCHAR(64) NOT NULL,
      source VARCHAR(50) NOT NULL DEFAULT 'user',
      version INT NOT NULL DEFAULT 1,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      tenant_id VARCHAR(16),
      tenant_slug VARCHAR(64),
      answered_by_email VARCHAR(255),
      answered_by_role VARCHAR(64),
      UNIQUE(session_id, question_code)
    );
    CREATE INDEX IF NOT EXISTS idx_onb_answers_session ON public.onboarding_answers(session_id);
  `);

  logger.info("[DB] Master tables + Regulatory Registry + Roles + Activities + Indexes + Module Entitlements + Onboarding ready");
}

/** Seed AGRC-OS UI catalog (role_profiles, widget_registry, dashboard_layouts, drawer_templates) for a tenant schema. Idempotent. */
export async function seedAgrcOsUiCatalog(schema: string): Promise<void> {
  await query(`
    INSERT INTO "${schema}".role_profiles (role, modules, dashboard_widgets, default_landing_page, custom, updated_at)
    VALUES
      ('owner', '["governance","risk","compliance","evidence","reporting","assessment","workflow","ai","vendor","incident","bcp","privacy","training","integration","platform"]', '["risk_heatmap","compliance_score","executive_summary","audit_readiness"]', '/dashboard', false, NOW()),
      ('admin', '["governance","risk","compliance","evidence","reporting","assessment","workflow","ai"]', '["risk_heatmap","compliance_score","control_progress","evidence_locker","audit_readiness","executive_summary"]', '/dashboard', false, NOW()),
      ('compliance_officer', '["governance","compliance","evidence","reporting","assessment","workflow"]', '["compliance_score","framework_coverage","control_progress","evidence_locker","audit_readiness"]', '/dashboard', false, NOW()),
      ('risk_manager', '["risk","compliance","evidence","reporting","assessment","workflow"]', '["risk_heatmap","risk_summary","compliance_score","control_progress","vendor_risk"]', '/dashboard', false, NOW()),
      ('auditor', '["governance","risk","compliance","evidence","reporting","assessment"]', '["audit_readiness","evidence_locker","compliance_score","risk_heatmap"]', '/dashboard', false, NOW()),
      ('viewer', '["governance","risk","compliance","evidence","reporting"]', '["compliance_score","risk_heatmap","executive_summary"]', '/dashboard', false, NOW()),
      ('it_security', '["risk","compliance","evidence","workflow"]', '["risk_heatmap","control_progress","incident_tracker","evidence_locker"]', '/dashboard', false, NOW())
    ON CONFLICT (role) DO UPDATE SET
      modules = EXCLUDED.modules,
      dashboard_widgets = EXCLUDED.dashboard_widgets,
      default_landing_page = EXCLUDED.default_landing_page,
      updated_at = NOW()
  `);
  await query(`
    INSERT INTO "${schema}".widget_registry (widget_key, label_en, label_ar, category, default_width, default_height, sort_order)
    VALUES
      ('risk_heatmap', 'Risk Heatmap', 'خريطة المخاطر الحرارية', 'risk', 2, 1, 1),
      ('compliance_score', 'Compliance Score', 'نسبة الامتثال', 'compliance', 1, 1, 2),
      ('compliance_overview', 'Compliance Overview', 'نظرة عامة على الامتثال', 'compliance', 2, 1, 3),
      ('executive_summary', 'Executive Summary', 'ملخص تنفيذي', 'overview', 2, 1, 4),
      ('audit_readiness', 'Audit Readiness', 'جاهزية التدقيق', 'evidence', 1, 1, 5),
      ('control_progress', 'Control Progress', 'تقدم الضوابط', 'compliance', 2, 1, 6),
      ('evidence_locker', 'Evidence Locker', 'خزنة الأدلة', 'evidence', 1, 1, 7),
      ('framework_coverage', 'Framework Coverage', 'تغطية الأطر', 'compliance', 2, 1, 8),
      ('risk_summary', 'Risk Summary', 'ملخص المخاطر', 'risk', 1, 1, 9),
      ('vendor_risk', 'Vendor Risk Snapshot', 'مخاطر الموردين', 'risk', 1, 1, 10),
      ('incident_tracker', 'Incident Tracker', 'متتبع الحوادث', 'security', 1, 1, 11),
      ('policy_scorecard', 'Policy Scorecard', 'بطاقة السياسات', 'compliance', 1, 1, 12),
      ('compliance_trend', 'Compliance Trend', 'اتجاه الامتثال', 'compliance', 2, 1, 13),
      ('risk_distribution', 'Risk Distribution', 'توزيع المخاطر', 'risk', 1, 1, 14),
      ('framework_radar', 'Framework Radar', 'رادار الأطر', 'compliance', 2, 1, 15),
      ('maturity_gauge', 'Maturity Gauge', 'مقياس النضج', 'overview', 1, 1, 16),
      ('evidence_freshness', 'Evidence Freshness', 'حداثة الأدلة', 'evidence', 1, 1, 17),
      ('assessment_progress', 'Assessment Progress', 'تقدم التقييم', 'assessment', 1, 1, 18),
      ('top_risks', 'Top Risks', 'أهم المخاطر', 'risk', 1, 1, 19),
      ('ai_summary', 'AI Summary', 'ملخص الذكاء الاصطناعي', 'ai', 2, 1, 20)
    ON CONFLICT (widget_key) DO UPDATE SET
      label_en = EXCLUDED.label_en,
      label_ar = EXCLUDED.label_ar,
      category = EXCLUDED.category,
      default_width = EXCLUDED.default_width,
      default_height = EXCLUDED.default_height,
      sort_order = EXCLUDED.sort_order
  `);
  await query(`
    INSERT INTO "${schema}".dashboard_layouts (dashboard_code, name_en, name_ar, layout, audience, sort_order, updated_at)
    VALUES
      ('big_picture', 'Big Picture', 'الصورة الكبيرة', '{"widgets":[{"id":"executive_summary","x":0,"y":0,"w":2,"h":1},{"id":"compliance_score","x":2,"y":0,"w":1,"h":1},{"id":"risk_heatmap","x":0,"y":1,"w":2,"h":1},{"id":"audit_readiness","x":2,"y":1,"w":1,"h":1}]}', 'all', 1, NOW()),
      ('executive', 'Executive', 'تنفيذي', '{"widgets":[{"id":"executive_summary","x":0,"y":0,"w":2,"h":1},{"id":"compliance_score","x":2,"y":0,"w":1,"h":1},{"id":"risk_heatmap","x":0,"y":1,"w":2,"h":1},{"id":"maturity_gauge","x":2,"y":1,"w":1,"h":1}]}', 'executive', 2, NOW()),
      ('compliance_ops', 'Compliance Operations', 'عمليات الامتثال', '{"widgets":[{"id":"compliance_overview","x":0,"y":0,"w":2,"h":1},{"id":"framework_coverage","x":0,"y":1,"w":2,"h":1},{"id":"control_progress","x":0,"y":2,"w":2,"h":1},{"id":"evidence_locker","x":2,"y":0,"w":1,"h":1},{"id":"audit_readiness","x":2,"y":1,"w":1,"h":1}]}', 'compliance', 3, NOW()),
      ('risk_ops', 'Risk Operations', 'عمليات المخاطر', '{"widgets":[{"id":"risk_heatmap","x":0,"y":0,"w":2,"h":1},{"id":"risk_summary","x":2,"y":0,"w":1,"h":1},{"id":"top_risks","x":0,"y":1,"w":1,"h":1},{"id":"vendor_risk","x":1,"y":1,"w":1,"h":1},{"id":"compliance_score","x":2,"y":1,"w":1,"h":1}]}', 'risk', 4, NOW()),
      ('evidence_ops', 'Evidence Operations', 'عمليات الأدلة', '{"widgets":[{"id":"evidence_locker","x":0,"y":0,"w":1,"h":1},{"id":"evidence_freshness","x":1,"y":0,"w":1,"h":1},{"id":"audit_readiness","x":2,"y":0,"w":1,"h":1},{"id":"control_progress","x":0,"y":1,"w":2,"h":1}]}', 'evidence', 5, NOW()),
      ('audit_ops', 'Audit Operations', 'عمليات التدقيق', '{"widgets":[{"id":"audit_readiness","x":0,"y":0,"w":1,"h":1},{"id":"evidence_locker","x":1,"y":0,"w":1,"h":1},{"id":"compliance_overview","x":0,"y":1,"w":2,"h":1},{"id":"assessment_progress","x":2,"y":0,"w":1,"h":1}]}', 'auditor', 6, NOW())
    ON CONFLICT (dashboard_code) DO UPDATE SET
      name_en = EXCLUDED.name_en,
      name_ar = EXCLUDED.name_ar,
      layout = EXCLUDED.layout,
      audience = EXCLUDED.audience,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
  `);
  await query(`
    INSERT INTO "${schema}".drawer_templates (template_key, name_en, name_ar, zones, context_type, sort_order, updated_at)
    VALUES
      ('entity_detail', 'Entity Detail', 'تفاصيل الكيان', '[{"id":"header","title_en":"Details","title_ar":"التفاصيل"},{"id":"actions","title_en":"Actions","title_ar":"الإجراءات"},{"id":"timeline","title_en":"Timeline","title_ar":"الجدول الزمني"},{"id":"related","title_en":"Related","title_ar":"مرتبط"}]', 'entity', 1, NOW()),
      ('risk_detail', 'Risk Detail', 'تفاصيل المخاطر', '[{"id":"header","title_en":"Risk","title_ar":"المخاطر"},{"id":"treatment","title_en":"Treatment","title_ar":"المعالجة"},{"id":"controls","title_en":"Controls","title_ar":"الضوابط"},{"id":"timeline","title_en":"History","title_ar":"السجل"}]', 'risk', 2, NOW()),
      ('control_detail', 'Control Detail', 'تفاصيل الضابط', '[{"id":"header","title_en":"Control","title_ar":"الضابط"},{"id":"evidence","title_en":"Evidence","title_ar":"الأدلة"},{"id":"tests","title_en":"Tests","title_ar":"الاختبارات"},{"id":"timeline","title_en":"History","title_ar":"السجل"}]', 'control', 3, NOW()),
      ('policy_detail', 'Policy Detail', 'تفاصيل السياسة', '[{"id":"header","title_en":"Policy","title_ar":"السياسة"},{"id":"approvals","title_en":"Approvals","title_ar":"الموافقات"},{"id":"related","title_en":"Related","title_ar":"مرتبط"}]', 'policy', 4, NOW()),
      ('assessment_detail', 'Assessment Detail', 'تفاصيل التقييم', '[{"id":"header","title_en":"Assessment","title_ar":"التقييم"},{"id":"progress","title_en":"Progress","title_ar":"التقدم"},{"id":"findings","title_en":"Findings","title_ar":"النتائج"}]', 'assessment', 5, NOW()),
      ('evidence_detail', 'Evidence Detail', 'تفاصيل الدليل', '[{"id":"header","title_en":"Evidence","title_ar":"الدليل"},{"id":"custody","title_en":"Custody","title_ar":"العهدة"},{"id":"linked_controls","title_en":"Linked Controls","title_ar":"الضوابط المرتبطة"}]', 'evidence', 6, NOW())
    ON CONFLICT (template_key) DO UPDATE SET
      name_en = EXCLUDED.name_en,
      name_ar = EXCLUDED.name_ar,
      zones = EXCLUDED.zones,
      context_type = EXCLUDED.context_type,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
  `);
}

/**
 * Seed default tenant security configuration values.
 * Uses ON CONFLICT DO UPDATE so admin customisations survive re-runs
 * (only description/type fields get refreshed, not the value itself).
 * Called once per tenant schema creation / migration.
 */
export async function seedSecurityConfig(schema: string): Promise<void> {
  await query(`
    INSERT INTO "${schema}".tenant_security_config
      (config_key, config_value, data_type, description, description_ar, category)
    VALUES
      ('password_reset_token_expiry_minutes', '30', 'number',
       'Minutes before a password-reset token expires', 'دقائق قبل انتهاء صلاحية رمز إعادة تعيين كلمة المرور', 'password'),
      ('bcrypt_rounds', '12', 'number',
       'Number of bcrypt hashing rounds for passwords', 'عدد جولات تشفير bcrypt لكلمات المرور', 'password'),
      ('password_min_length', '8', 'number',
       'Minimum password length', 'الحد الأدنى لطول كلمة المرور', 'password'),
      ('password_require_special', 'true', 'boolean',
       'Require at least one special character in passwords', 'يتطلب حرفاً خاصاً واحداً على الأقل في كلمات المرور', 'password'),
      ('mfa_max_failures', '3', 'number',
       'Consecutive MFA failures before lockout', 'الإخفاقات المتتالية في MFA قبل القفل', 'mfa'),
      ('mfa_lockout_minutes', '15', 'number',
       'Minutes to lock MFA verification after max failures', 'دقائق قفل التحقق من MFA بعد الحد الأقصى للإخفاقات', 'mfa'),
      ('email_mfa_code_expiry_minutes', '10', 'number',
       'Minutes before email MFA code expires', 'دقائق قبل انتهاء صلاحية رمز MFA بالبريد الإلكتروني', 'mfa'),
      ('jwt_access_token_expiry_minutes', '15', 'number',
       'JWT access token lifetime in minutes', 'عمر رمز الوصول JWT بالدقائق', 'session'),
      ('jwt_refresh_token_expiry_days', '7', 'number',
       'JWT refresh token lifetime in days', 'عمر رمز التحديث JWT بالأيام', 'session'),
      ('session_idle_timeout_minutes', '30', 'number',
       'Idle session timeout in minutes', 'مهلة الخمول للجلسة بالدقائق', 'session'),
      ('max_login_attempts', '5', 'number',
       'Login attempts before progressive throttle kicks in', 'محاولات تسجيل الدخول قبل بدء التأخير التدريجي', 'throttle'),
      ('login_throttle_window_minutes', '10', 'number',
       'Rolling window to count failed login attempts', 'النافذة الزمنية المتدحرجة لحساب محاولات الدخول الفاشلة', 'throttle'),
      ('login_throttle_max_delay_ms', '60000', 'number',
       'Maximum progressive delay in milliseconds', 'الحد الأقصى للتأخير التدريجي بالملي ثانية', 'throttle')
    ON CONFLICT (config_key) DO UPDATE SET
      description = EXCLUDED.description,
      description_ar = EXCLUDED.description_ar,
      data_type = EXCLUDED.data_type,
      category = EXCLUDED.category
  `);

  // Merkle witness table for external tamper-evidence
  await query(`
    CREATE TABLE IF NOT EXISTS audit_merkle_witnesses (
      witness_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(16) REFERENCES tenants(tenant_id),
      witness_date DATE NOT NULL,
      source_table VARCHAR(50) NOT NULL,
      merkle_root VARCHAR(64) NOT NULL,
      entry_count INTEGER NOT NULL,
      first_entry_hash VARCHAR(64),
      last_entry_hash VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, witness_date, source_table)
    )
  `);

  // Immutability triggers on Merkle witnesses (append-only)
  await query(`
    CREATE OR REPLACE FUNCTION merkle_witness_immutable() RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_merkle_witnesses is immutable: % operations are forbidden', TG_OP;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);
  await query(`DROP TRIGGER IF EXISTS trg_merkle_witness_no_delete ON audit_merkle_witnesses`);
  await query(`
    CREATE TRIGGER trg_merkle_witness_no_delete
      BEFORE DELETE ON audit_merkle_witnesses
      FOR EACH ROW EXECUTE FUNCTION merkle_witness_immutable()
  `);

  // Apply RLS to public schema tables with tenant_id columns
  await applyPublicSchemaRLS();
}

/**
 * Enable Row-Level Security on public schema tables that contain tenant_id.
 * Policies are permissive when app.current_tenant_id is not set (migrations, admin).
 * FORCE ensures RLS applies even to the table owner.
 */
async function applyPublicSchemaRLS(): Promise<void> {
  const tables = ['users', 'roles', 'user_activities'];
  for (const tbl of tables) {
    try {
      // Check table exists first
      const check = await query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenant_id'`,
        [tbl]
      );
      if (check.rows.length === 0) continue;

      await query(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY`);
      await query(`ALTER TABLE public.${tbl} FORCE ROW LEVEL SECURITY`);
      await query(`
        DROP POLICY IF EXISTS rls_${tbl}_tenant ON public.${tbl};
        CREATE POLICY rls_${tbl}_tenant ON public.${tbl}
          USING (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = current_setting('app.current_tenant_id', true)
          )
          WITH CHECK (true)
      `);
    } catch (err: unknown) {
      logger.warn(`[DB] RLS setup skipped for ${tbl}: ${toErrorMessage(err)}`);
    }
  }
}
