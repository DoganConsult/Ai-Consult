// @ts-nocheck
import { logger } from '../../../platform/dos/observability/logger.service';
// ============================================
// Platform Schema — Late Tables & Seed Data
// Email inbox, tenant security config, feature flags,
// AGRC engine runs/dedup, audit engagements/plans/packages,
// governance domains/bodies/reporting lines, modules,
// knowledge articles, navigation registry/overrides/
// role bindings, schema_migrations.
// Also: seedPlatformData() for modules, navigation,
// dashboards, frameworks, automation rules.
// ============================================

import { query } from '../query';
import { getFirstRow } from '../../../shared/data/db-utils';
import { seedSecurityConfig } from '../init-master-db';

export async function createLatePlatformTables(schema: string): Promise<void> {
  // -- Email Inbox (received emails via Graph API polling)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".email_inbox (
      inbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      graph_message_id TEXT NOT NULL UNIQUE,
      conversation_id TEXT,
      internet_message_id TEXT,
      subject TEXT,
      body_preview TEXT,
      body_html TEXT,
      body_text TEXT,
      from_address VARCHAR(320),
      from_name VARCHAR(255),
      to_addresses JSONB DEFAULT '[]',
      cc_addresses JSONB DEFAULT '[]',
      importance VARCHAR(10) DEFAULT 'normal',
      has_attachments BOOLEAN DEFAULT FALSE,
      attachments JSONB DEFAULT '[]',
      categories JSONB DEFAULT '[]',
      is_read BOOLEAN DEFAULT FALSE,
      received_at TIMESTAMPTZ NOT NULL,
      folder VARCHAR(100) DEFAULT 'inbox',
      status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','read','processed','archived','linked')),
      linked_entity_type VARCHAR(50),
      linked_entity_id UUID,
      processed_by VARCHAR(64),
      processed_at TIMESTAMPTZ,
      synced_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_email_inbox_graph_id ON "${schema}".email_inbox (graph_message_id);
    CREATE INDEX IF NOT EXISTS idx_email_inbox_from ON "${schema}".email_inbox (from_address, received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_inbox_status ON "${schema}".email_inbox (status, received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_inbox_received ON "${schema}".email_inbox (received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_inbox_linked ON "${schema}".email_inbox (linked_entity_type, linked_entity_id);
  `);

  // -- Tenant Security Configuration (DB-driven auth/security params)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".tenant_security_config (
      config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      config_key VARCHAR(100) NOT NULL UNIQUE,
      config_value TEXT NOT NULL,
      data_type VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (data_type IN ('string','number','boolean','json')),
      description TEXT,
      description_ar TEXT,
      category VARCHAR(50) NOT NULL DEFAULT 'auth' CHECK (category IN ('auth','password','mfa','session','throttle','general')),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by VARCHAR(64)
    );
    CREATE INDEX IF NOT EXISTS idx_security_config_category ON "${schema}".tenant_security_config(category);
    CREATE INDEX IF NOT EXISTS idx_security_config_key ON "${schema}".tenant_security_config(config_key);
  `);

  // Seed security config defaults
  try {
    await seedSecurityConfig(schema);
  } catch (err: unknown) {
    logger.warn(`[DB] Security config seed skipped for ${schema}:`, (err instanceof Error ? err.message : String(err)));
  }

  // -- AGRC Engine Support tables (from migration 060)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".feature_flags (
      feature_key text PRIMARY KEY,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS "${schema}".agrc_engine_runs (
      run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      engine_name text NOT NULL DEFAULT 'agrc-os-v1',
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz NULL,
      status text NOT NULL DEFAULT 'running',
      trigger_mode text NOT NULL DEFAULT 'scheduled',
      triggered_by text NULL,
      controls_evaluated integer NOT NULL DEFAULT 0,
      stale_controls integer NOT NULL DEFAULT 0,
      overdue_remediations integer NOT NULL DEFAULT 0,
      kri_breaches integer NOT NULL DEFAULT 0,
      policy_reviews_started integer NOT NULL DEFAULT 0,
      tasks_created integer NOT NULL DEFAULT 0,
      notifications_created integer NOT NULL DEFAULT 0,
      escalations_triggered integer NOT NULL DEFAULT 0,
      error_message text NULL
    );
    CREATE TABLE IF NOT EXISTS "${schema}".agrc_engine_dedup (
      dedup_key text PRIMARY KEY,
      entity_type text NOT NULL,
      entity_id text NOT NULL,
      action_type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agrc_engine_dedup_expires ON "${schema}".agrc_engine_dedup(expires_at);
    CREATE INDEX IF NOT EXISTS idx_agrc_engine_runs_started ON "${schema}".agrc_engine_runs(started_at DESC);
  `);
  // Seed AGRC feature flags (DO NOTHING -- DB values take precedence over code defaults)
  await query(`
    INSERT INTO "${schema}".feature_flags (feature_key, enabled) VALUES
      ('agrc_engine_enabled', true),
      ('agrc_control_monitor_enabled', true),
      ('agrc_remediation_monitor_enabled', true),
      ('agrc_kri_monitor_enabled', true),
      ('agrc_policy_review_enabled', true),
      ('agrc_auto_task_creation_enabled', true),
      ('agrc_auto_notification_enabled', true)
    ON CONFLICT (feature_key) DO NOTHING;
  `);

  // -- R1: Create missing canonical lifecycle tables
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".audit_engagements (
      engagement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      engagement_type VARCHAR(50) NOT NULL DEFAULT 'internal_audit',
      status VARCHAR(50) DEFAULT 'planned',
      description TEXT DEFAULT '',
      scope TEXT DEFAULT '',
      lead_auditor_id VARCHAR(64),
      workspace_id UUID,
      risk_rating VARCHAR(20) DEFAULT 'medium',
      start_date DATE,
      end_date DATE,
      created_by VARCHAR(64) NOT NULL DEFAULT 'system',
      owner_user_id VARCHAR(64),
      org_unit_id VARCHAR(64),
      sensitivity VARCHAR(20),
      severity VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_audit_engagements_status ON "${schema}".audit_engagements(status);
    CREATE INDEX IF NOT EXISTS idx_audit_engagements_type ON "${schema}".audit_engagements(engagement_type);

    CREATE TABLE IF NOT EXISTS "${schema}".audit_plans (
      plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_year INTEGER NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT DEFAULT '',
      status VARCHAR(30) DEFAULT 'draft',
      workspace_id UUID,
      created_by VARCHAR(64) NOT NULL DEFAULT 'system',
      approved_by VARCHAR(64),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_audit_plans_year ON "${schema}".audit_plans(plan_year);
    CREATE INDEX IF NOT EXISTS idx_audit_plans_status ON "${schema}".audit_plans(status) WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS "${schema}".audit_packages (
      package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(500) NOT NULL DEFAULT 'New Audit Package',
      status VARCHAR(30) DEFAULT 'draft',
      framework_id UUID,
      control_count INTEGER DEFAULT 0,
      controls JSONB DEFAULT '[]'::jsonb,
      created_by VARCHAR(64) NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_audit_packages_status ON "${schema}".audit_packages(status) WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS "${schema}".governance_domains (
      domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      description TEXT DEFAULT '',
      sponsor_id VARCHAR(64),
      owner_id VARCHAR(64),
      parent_domain_id UUID,
      sort_order INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS "${schema}".governance_bodies (
      body_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      domain_id UUID,
      body_type VARCHAR(50) NOT NULL DEFAULT 'committee',
      name_en VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      description TEXT DEFAULT '',
      chair_user_id VARCHAR(64),
      charter_id UUID,
      oversight_model VARCHAR(50),
      sponsor_id VARCHAR(64),
      committee_id UUID,
      status VARCHAR(50) DEFAULT 'active',
      owner_user_id VARCHAR(64),
      org_unit_id VARCHAR(64),
      sensitivity VARCHAR(20),
      severity VARCHAR(20),
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_governance_bodies_type ON "${schema}".governance_bodies(body_type);
    CREATE INDEX IF NOT EXISTS idx_governance_bodies_domain ON "${schema}".governance_bodies(domain_id);

    CREATE TABLE IF NOT EXISTS "${schema}".governance_reporting_lines (
      line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      from_entity_type VARCHAR(50) NOT NULL,
      from_entity_id UUID NOT NULL,
      to_entity_type VARCHAR(50) NOT NULL,
      to_entity_id UUID NOT NULL,
      line_type VARCHAR(50) DEFAULT 'reports_to',
      parent_body_id UUID,
      child_body_id UUID,
      relationship_type VARCHAR(50) DEFAULT 'reports_to',
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `);

  // -- R1: Create canonical modules registry table
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".modules (
      id SERIAL,
      module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      module_code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      display_name_en VARCHAR(255),
      display_name_ar VARCHAR(255),
      category VARCHAR(100) DEFAULT '',
      description TEXT DEFAULT '',
      enabled BOOLEAN DEFAULT TRUE,
      status VARCHAR(50) DEFAULT 'active',
      customer_visible BOOLEAN DEFAULT TRUE,
      nav_enabled BOOLEAN DEFAULT TRUE,
      readiness_level VARCHAR(30) DEFAULT 'complete',
      route_base VARCHAR(255) DEFAULT '',
      primary_table VARCHAR(100) DEFAULT '',
      lifecycle_table VARCHAR(100) DEFAULT '',
      lifecycle_id_column VARCHAR(100) DEFAULT '',
      assigned_agent_id VARCHAR(10),
      entitlement_key VARCHAR(50),
      support_level VARCHAR(30) DEFAULT 'full',
      sort_order INT DEFAULT 0,
      created_by VARCHAR(64) DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE(module_code)
    );
  `);

  // -- R3: Create knowledge_articles table for /api/knowledge
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".knowledge_articles (
      article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      body_md TEXT,
      category VARCHAR(100),
      tags TEXT[] DEFAULT '{}',
      status VARCHAR(30) DEFAULT 'draft',
      author_id VARCHAR(64),
      reviewer_id VARCHAR(64),
      published_at TIMESTAMPTZ,
      tenant_id VARCHAR(64),
      created_by VARCHAR(64) DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_articles_tags ON "${schema}".knowledge_articles USING GIN(tags);
    CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status ON "${schema}".knowledge_articles(status) WHERE deleted_at IS NULL;
  `);

  // -- R1: Create navigation persistence tables
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".navigation_registry (
      nav_key VARCHAR(100) PRIMARY KEY,
      parent_nav_key VARCHAR(100),
      label_en VARCHAR(255) NOT NULL,
      label_ar VARCHAR(255),
      route VARCHAR(500),
      icon VARCHAR(100),
      module_code VARCHAR(50),
      item_type VARCHAR(30) DEFAULT 'link',
      sort_order INT DEFAULT 0,
      is_system BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".navigation_overrides (
      override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nav_key VARCHAR(100) NOT NULL,
      applies_to_role VARCHAR(50),
      label_en VARCHAR(255),
      label_ar VARCHAR(255),
      route VARCHAR(500),
      icon VARCHAR(100),
      module_code VARCHAR(50),
      sort_order INT,
      enabled BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_nav_overrides_key ON "${schema}".navigation_overrides(nav_key);

    CREATE TABLE IF NOT EXISTS "${schema}".navigation_role_bindings (
      binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nav_key VARCHAR(100) NOT NULL,
      role_code VARCHAR(50) NOT NULL,
      is_allowed BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(nav_key, role_code)
    );
  `);

  // -- Create schema_migrations table (used by file-based migration runner)
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS "${schema}".schema_migrations (
        version INTEGER PRIMARY KEY,
        filename TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err: unknown) {
    logger.warn(`[DB] schema_migrations table warning for ${schema}:`, (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Seeds modules, navigation, and dashboard data into a tenant schema.
 * Separated from table creation so it can run after migrations.
 */
export async function seedPlatformData(schema: string, tenantId: string, sectorIds?: string[]): Promise<void> {
  // === Workspace backfill: assign orphan records to default workspace ===
  try {
    const defaultWsResult = await query(
      `SELECT workspace_id FROM "${schema}".workspaces ORDER BY created_at ASC LIMIT 1`
    );
    if (defaultWsResult.rows.length > 0) {
      const defaultWsId = getFirstRow(defaultWsResult)?.workspace_id;
      const wsTables = ['frameworks', 'risks', 'controls', 'policies', 'evidence', 'assessments', 'incidents', 'vendors', 'remediation_tasks'];
      for (const tbl of wsTables) {
        try {
          await query(`UPDATE "${schema}"."${tbl}" SET workspace_id = $1 WHERE workspace_id IS NULL`, [defaultWsId]);
        } catch { /* workspace_id column may not exist yet for new tenants -- added at end */ }
      }
    }
  } catch { /* non-critical for new tenants */ }

  // === Seed applicable frameworks from registry if sector IDs provided ===
  if (sectorIds && sectorIds.length > 0) {
    try {
      const sectorResult = await query(
        `SELECT applicable_frameworks FROM sectors WHERE sector_id = ANY($1)`,
        [sectorIds]
      );
      const frameworkIds = new Set<string>();
      for (const row of sectorResult.rows) {
        for (const fwId of (row.applicable_frameworks || [])) {
          frameworkIds.add(fwId);
        }
      }
      for (const fwId of frameworkIds) {
        const instResult = await query(
          `SELECT instrument_id, name_en, name_ar FROM instruments WHERE instrument_id = $1`,
          [fwId]
        );
        if (instResult.rows.length > 0) {
          const inst = getFirstRow(instResult);
          await query(
            `INSERT INTO "${schema}".frameworks (framework_id, name, description, category, total_controls)
             VALUES ($1, $2, $3, 'security', 0)
             ON CONFLICT (framework_id) DO UPDATE SET
               name = EXCLUDED.name, description = EXCLUDED.description
             WHERE (frameworks.name, frameworks.description) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description)`,
            [inst.instrument_id, inst.name_en, inst.name_ar || inst.name_en]
          );
        }
      }
    } catch (err) {
      logger.warn(`[DB] Could not seed frameworks for tenant ${tenantId}:`, err);
    }
  }

  // === Seed default automation rules ===
  try {
    const { seedDefaultAutomationRules } = await import('../../../platform/dos/events/event-bus');
    await seedDefaultAutomationRules(tenantId);
  } catch (err) {
    logger.warn(`[DB] Could not seed automation rules for tenant ${tenantId}:`, err);
  }

  // -- Seed AGRC Executive Dashboard + Widgets (AFTER migrations create the tables)
  try {
    await query(`
      INSERT INTO "${schema}".dashboard_registry
        (dashboard_code, name_en, name_ar, audience, module_code, route, layout, is_system, is_active, sort_order)
      VALUES
        ('agrc-executive', 'Executive Dashboard', 'لوحة القيادة التنفيذية', 'executive', 'dashboard', '/',
         '{"widgets":[{"key":"engine-executive-summary-widget","width":12,"config":{}},{"key":"top-breached-kris-widget","width":6,"config":{}},{"key":"policy-review-debt-widget","width":6,"config":{}},{"key":"engine-trend-widget","width":12,"config":{}}]}'::jsonb,
         true, true, 1)
      ON CONFLICT (dashboard_code) DO UPDATE SET
        name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
        layout = EXCLUDED.layout
      WHERE (dashboard_registry.name_en, dashboard_registry.layout)
        IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.layout);
    `);
    await query(`
      INSERT INTO "${schema}".dashboard_widget_registry
        (widget_key, label_en, label_ar, module_code, component_key, default_width, default_height, is_system, is_active, sort_order)
      VALUES
        ('engine-executive-summary-widget','Engine Summary','ملخص المحرك','executive','engine-executive-summary-widget',12,4,true,true,1),
        ('top-breached-kris-widget','Top Breached KRIs','أعلى مؤشرات المخاطر المخترقة','executive','top-breached-kris-widget',6,4,true,true,2),
        ('policy-review-debt-widget','Policy Review Debt','ديون مراجعة السياسات','executive','policy-review-debt-widget',6,4,true,true,3),
        ('engine-trend-widget','Engine Trend','اتجاه المحرك','executive','engine-trend-widget',12,4,true,true,4)
      ON CONFLICT (widget_key) DO UPDATE SET
        label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
        component_key = EXCLUDED.component_key
      WHERE (dashboard_widget_registry.label_en, dashboard_widget_registry.component_key)
        IS DISTINCT FROM (EXCLUDED.label_en, EXCLUDED.component_key);
    `);
  } catch (err: unknown) {
    logger.warn(`[DB] Dashboard seed warning for ${schema}:`, (err instanceof Error ? err.message : String(err)));
  }

  // -- R1: Seed canonical modules
  await query(`
    INSERT INTO "${schema}".modules
      (module_code, name, display_name_en, display_name_ar, category, description, enabled, status,
       customer_visible, nav_enabled, readiness_level, route_base, primary_table,
       lifecycle_table, lifecycle_id_column, assigned_agent_id, entitlement_key, support_level, sort_order)
    VALUES
      ('governance','Governance','Governance','الحوكمة','core','Governance framework, bodies, charters, mandates',true,'active',true,true,'complete','/governance','governance_bodies','governance_bodies','body_id','A08','grc','full',10),
      ('risk','Risk Management','Risk Management','إدارة المخاطر','core','Risk register, assessments, treatments, KRIs',true,'active',true,true,'complete','/risks','risks','risks','risk_id','A07','grc','full',20),
      ('compliance','Compliance','Compliance','الامتثال','core','Control management, framework mapping, UCF',true,'active',true,true,'complete','/compliance','controls','controls','control_id','A04','grc','full',30),
      ('policy','Policy','Policy','السياسات','core','Policy lifecycle, procedures, attestation',true,'active',true,true,'complete','/policies','policies','policies','policy_id','A08','grc','full',40),
      ('audit','Audit','Audit','التدقيق','core','Audit engagements, findings, working papers, CAPA, schedules, team, risk planning',true,'active',true,true,'complete','/audit','audit_engagements','audit_engagements','engagement_id','A10','grc','full',50),
      ('evidence','Evidence','Evidence','الأدلة','core','Evidence collection, catalog, chain-of-custody',true,'active',true,true,'complete','/evidence','evidence','evidence','evidence_id','A05','grc','full',60),
      ('incident','Incident','Incident','الحوادث','core','Incident management and response',true,'active',true,true,'complete','/incidents','incidents','incidents','incident_id',NULL,'grc','full',70),
      ('vendor','Vendor','Vendor','الموردين','core','Third-party risk, assessments, portal',true,'active',true,true,'complete','/vendors','vendors','vendors','vendor_id','A09','grc','full',80),
      ('bcp','BCP','BCP','استمرارية الأعمال','core','Business continuity planning, BIA, exercises, crisis communications',true,'active',true,true,'partial','/bcp','bcp_plans','bcp_plans','plan_id',NULL,'grc','full',90),
      ('assessment','Assessment','Assessment','التقييم','supporting','Assessments, templates, NCA/SAMA',true,'active',true,true,'complete','/assessments','assessments','assessments','assessment_id','A03','grc','full',100),
      ('reporting','Reporting','Reporting','التقارير','supporting','Report generation, center, hub',true,'active',true,true,'partial','/reports','reports','reports','report_id','A10','grc','full',110),
      ('workflow','Workflow','Workflow','سير العمل','supporting','Workflow templates, builder, automation',true,'active',true,true,'complete','/workflows','workflows','workflows','workflow_id','A08','grc','full',120),
      ('analytics','Analytics','Analytics','التحليلات','supporting','Dashboard analytics and charts',true,'active',true,true,'complete','/analytics-dashboard','dashboard_configs','','','','grc','full',130),
      ('ai','AI Hub','AI Hub','مركز الذكاء الاصطناعي','ai','Copilot, AI squad, contextual AI',true,'active',true,true,'complete','/ai-hub','copilot_sessions','','','A04','grc','full',140),
      ('ai-governance','AI Governance','AI Governance','حوكمة الذكاء الاصطناعي','ai','Model, prompt, agent registry and governance',true,'active',true,true,'partial','/ai-governance','ai_asset_inventory','','','','ai','full',150),
      ('integrations','Integrations','Integrations','التكاملات','platform','Connector management and health',true,'active',true,true,'complete','/integrations','integration_configs','','','A01','grc','full',160),
      ('foundation','Foundation','Foundation','الأساسيات','platform','Organization structure, business units, departments, locations, teams, users, roles',true,'active',true,true,'complete','/foundation','organizations','','','A02','grc','full',5),
      ('workspace','Workspace','Workspace','بيئة العمل','platform','Workspace management, teams, roles',true,'active',true,true,'complete','/workspace-home','workspaces','','','A02','grc','full',170),
      ('maturity','Maturity','Maturity','النضج','supporting','Maturity assessment and scoring',true,'active',true,true,'complete','/maturity','maturity_scores','','','','grc','full',180),
      ('remediation','Remediation','Remediation','المعالجة','supporting','Remediation task CRUD with priority, assignment, overdue tracking',true,'active',true,true,'partial','/remediation','remediation_tasks','remediation_tasks','task_id',NULL,'grc','full',190),
      ('action','Action Items','Action Items','بنود العمل','supporting','Action item tracking',true,'active',false,false,'partial','/action-items','action_items','action_items','item_id',NULL,'grc','internal',200),
      ('training','Training','Training','التدريب','supporting','Training & awareness campaigns, assignments, certifications, phishing simulations',true,'active',true,true,'partial','/training','training_campaigns','training_campaigns','campaign_id','','grc','full',210),
      ('knowledge','Knowledge','Knowledge','المعرفة','supporting','Knowledge base, entity graph, KSA hub',true,'active',true,true,'partial','/knowledge-hub','knowledge_articles','','','A03','grc','full',220),
      ('messaging','Messaging','Messaging','المراسلة','platform','Internal messaging',true,'active',true,true,'complete','/messaging','messages','','','','grc','full',230),
      ('exception','Exception','Exception','الاستثناءات','supporting','Exception governance',true,'active',false,false,'partial','/exceptions','exceptions','exceptions','exception_id',NULL,'grc','full',240),
      ('asset','Asset','Asset','الأصول','supporting','Asset inventory',true,'active',false,false,'partial','/assets','assets','assets','asset_id',NULL,'grc','internal',250)
    ON CONFLICT (module_code) DO UPDATE SET
      name = EXCLUDED.name,
      display_name_en = EXCLUDED.display_name_en,
      display_name_ar = EXCLUDED.display_name_ar,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      readiness_level = EXCLUDED.readiness_level,
      route_base = EXCLUDED.route_base,
      primary_table = EXCLUDED.primary_table,
      lifecycle_table = EXCLUDED.lifecycle_table,
      lifecycle_id_column = EXCLUDED.lifecycle_id_column,
      assigned_agent_id = EXCLUDED.assigned_agent_id,
      entitlement_key = EXCLUDED.entitlement_key,
      support_level = EXCLUDED.support_level,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW();
  `);

  // -- R1.1: Seed canonical navigation baseline
  await query(`
    INSERT INTO "${schema}".navigation_registry
      (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
    VALUES
      ('home', null, 'Home', 'الرئيسية', '/workspace-home', 'home', null, 'link', 10, true, true),
      ('foundation', null, 'Foundation', 'الأساسيات', null, 'database', 'foundation', 'group', 100, true, true),
      ('foundation-overview', 'foundation', 'Overview', 'نظرة عامة', '/foundation/overview', 'home', 'foundation', 'link', 101, true, true),
      ('foundation-organization', 'foundation', 'Organization', 'المنظمة', '/foundation/organization', 'building-2', 'foundation', 'link', 102, true, true),
      ('foundation-business-units', 'foundation', 'Business Units', 'الوحدات التنظيمية', '/foundation/business-units', 'briefcase', 'foundation', 'link', 103, true, true),
      ('foundation-departments', 'foundation', 'Departments', 'الأقسام', '/foundation/departments', 'th-large', 'foundation', 'link', 104, true, true),
      ('foundation-users', 'foundation', 'Users', 'المستخدمون', '/foundation/users', 'users', 'foundation', 'link', 105, true, true),
      ('foundation-roles', 'foundation', 'Roles & Permissions', 'الأدوار والصلاحيات', '/foundation/roles', 'key', 'foundation', 'link', 106, true, true),
      ('foundation-teams', 'foundation', 'Teams', 'الفِرَق', '/foundation/teams', 'users', 'foundation', 'link', 107, true, true),
      ('foundation-locations', 'foundation', 'Locations', 'المواقع', '/foundation/locations', 'map-pin', 'foundation', 'link', 108, true, true),
      ('foundation-reference-data', 'foundation', 'Reference Data', 'البيانات المرجعية', '/foundation/reference-data', 'database', 'foundation', 'link', 109, true, true),
      ('foundation-settings', 'foundation', 'Settings', 'الإعدادات', '/foundation/settings', 'settings', 'foundation', 'link', 111, true, true),
      ('governance', null, 'Governance', 'الحوكمة', null, 'building-2', 'governance', 'group', 200, true, true),
      ('governance-overview', 'governance', 'Overview', 'نظرة عامة', '/governance/overview', null, 'governance', 'link', 201, true, true),
      ('governance-policies', 'governance', 'Policies', 'السياسات', '/governance/policies', null, 'governance', 'link', 202, true, true),
      ('risk', null, 'Risk', 'المخاطر', null, 'shield-alert', 'risk', 'group', 300, true, true),
      ('risk-overview', 'risk', 'Overview', 'نظرة عامة', '/risk/overview', null, 'risk', 'link', 301, true, true),
      ('risk-register', 'risk', 'Risk Register', 'سجل المخاطر', '/risk/register', null, 'risk', 'link', 302, true, true),
      ('compliance', null, 'Compliance', 'الامتثال', null, 'shield-check', 'controls', 'group', 400, true, true),
      ('compliance-overview', 'compliance', 'Overview', 'نظرة عامة', '/compliance/overview', null, 'controls', 'link', 401, true, true),
      ('compliance-frameworks', 'compliance', 'Frameworks', 'الأطر', '/compliance/frameworks', null, 'controls', 'link', 402, true, true),
      ('compliance-controls', 'compliance', 'Controls', 'الضوابط', '/compliance/controls', null, 'controls', 'link', 403, true, true),
      ('evidence', null, 'Evidence', 'الأدلة', null, 'folder-check', 'evidence', 'group', 500, true, true),
      ('evidence-overview', 'evidence', 'Overview', 'نظرة عامة', '/evidence/overview', null, 'evidence', 'link', 501, true, true),
      ('evidence-vault', 'evidence', 'Evidence Vault', 'خزينة الأدلة', '/evidence/vault', null, 'evidence', 'link', 502, true, true),
      ('audit', null, 'Audit', 'التدقيق', null, 'search-check', 'audit', 'group', 600, true, true),
      ('audit-overview', 'audit', 'Overview', 'نظرة عامة', '/audit/overview', null, 'audit', 'link', 601, true, true),
      ('audit-engagements', 'audit', 'Audits', 'عمليات التدقيق', '/audit/engagements', null, 'audit', 'link', 603, true, true),
      ('reports', null, 'Reports', 'التقارير', null, 'file-bar-chart', 'reports', 'group', 700, true, true),
      ('reports-overview', 'reports', 'Reports Overview', 'نظرة عامة للتقارير', '/reports/overview', null, 'reports', 'link', 700, true, true),
      ('reports-executive', 'reports', 'Executive Dashboard', 'لوحة تنفيذية', '/reports/executive', null, 'reports', 'link', 701, true, true),
      ('reports-risk', 'reports', 'Risk Analytics', 'تحليلات المخاطر', '/reports/risk', null, 'reports', 'link', 702, true, true),
      ('reports-compliance', 'reports', 'Compliance Analytics', 'تحليلات الامتثال', '/reports/compliance', null, 'reports', 'link', 703, true, true),
      ('reports-evidence', 'reports', 'Evidence Analytics', 'تحليلات الأدلة', '/reports/evidence', null, 'reports', 'link', 704, true, true),
      ('reports-audit', 'reports', 'Audit Analytics', 'تحليلات التدقيق', '/reports/audit', null, 'reports', 'link', 705, true, true),
      ('reports-scheduled', 'reports', 'Scheduled Reports', 'التقارير المجدولة', '/reports/scheduled', null, 'reports', 'link', 706, true, true),
      ('reports-exports', 'reports', 'Exports', 'التصدير', '/reports/exports', null, 'reports', 'link', 707, true, true),
      ('reports-builder', 'reports', 'Report Builder', 'منشئ التقارير', '/reports/builder', null, 'reports', 'link', 708, true, true),
      ('ai', null, 'AI & Automation', 'الذكاء الاصطناعي', null, 'cpu', 'ai', 'group', 900, true, true),
      ('ai-hub', 'ai', 'AI Hub', 'مركز الذكاء', '/ai-hub', null, 'ai', 'link', 901, true, true),
      ('integrations', null, 'Integrations', 'التكاملات', null, 'plug-zap', 'integrations', 'group', 1000, true, true),
      ('integrations-connector', 'integrations', 'Connector Hub', 'مركز الموصلات', '/connector-hub', null, 'integrations', 'link', 1001, true, true),
      ('admin', null, 'Administration', 'الإدارة', null, 'settings', 'admin', 'group', 1100, true, true),
      ('admin-team', 'admin', 'Team', 'الفريق', '/team', null, 'admin', 'link', 1101, true, true),
      ('admin-config', 'admin', 'Configuration', 'التكوين', '/tenant-config', null, 'admin', 'link', 1103, true, true),
      ('incidents', null, 'Incidents', 'الحوادث', null, 'alert-triangle', 'incident', 'group', 650, true, true),
      ('incidents-overview', 'incidents', 'Overview', 'نظرة عامة', '/incidents/overview', null, 'incident', 'link', 651, true, true),
      ('incidents-register', 'incidents', 'Register', 'السجل', '/incidents/register', null, 'incident', 'link', 652, true, true),
      ('incidents-investigation', 'incidents', 'Investigation', 'التحقيق', '/incidents/investigation', null, 'incident', 'link', 653, true, true),
      ('incidents-war-room', 'incidents', 'War Room', 'غرفة العمليات', '/incidents/war-room', null, 'incident', 'link', 654, true, true),
      ('incidents-near-miss', 'incidents', 'Near-Miss', 'الحوادث الوشيكة', '/incidents/near-miss', null, 'incident', 'link', 655, true, true),
      ('incidents-pir', 'incidents', 'Post-Incident Review', 'مراجعة ما بعد الحادث', '/incidents/pir', null, 'incident', 'link', 656, true, true),
      ('incidents-trends', 'incidents', 'Trends & Analytics', 'الاتجاهات والتحليلات', '/incidents/trends', null, 'incident', 'link', 657, true, true),
      ('incidents-regulatory', 'incidents', 'Regulatory Reporting', 'الإبلاغ التنظيمي', '/incidents/regulatory', null, 'incident', 'link', 658, true, true),
      ('incidents-taxonomy', 'incidents', 'Taxonomy', 'التصنيف', '/incidents/taxonomy', null, 'incident', 'link', 659, true, true),
      ('incidents-lessons', 'incidents', 'Lessons Learned', 'الدروس المستفادة', '/incidents/lessons', null, 'incident', 'link', 660, true, true),
      ('vendor', null, 'Vendor Risk', 'مخاطر الموردين', null, 'truck', 'vendor', 'group', 750, true, true),
      ('vendor-overview', 'vendor', 'Overview', 'نظرة عامة', '/vendor-risk/overview', null, 'vendor', 'link', 751, true, true),
      ('vendor-register', 'vendor', 'Vendor Register', 'سجل الموردين', '/vendor-risk/register', null, 'vendor', 'link', 752, true, true),
      ('vendor-assessments', 'vendor', 'Risk Assessments', 'تقييمات المخاطر', '/vendor-risk/assessments', null, 'vendor', 'link', 753, true, true),
      ('vendor-due-diligence', 'vendor', 'Due Diligence', 'العناية الواجبة', '/vendor-risk/due-diligence', null, 'vendor', 'link', 754, true, true),
      ('vendor-sla', 'vendor', 'SLA Monitoring', 'مراقبة الاتفاقيات', '/vendor-risk/sla', null, 'vendor', 'link', 755, true, true),
      ('vendor-fourth-party', 'vendor', 'Fourth-Party Risk', 'مخاطر الطرف الرابع', '/vendor-risk/fourth-party', null, 'vendor', 'link', 756, true, true),
      ('vendor-concentration', 'vendor', 'Concentration Risk', 'مخاطر التركز', '/vendor-risk/concentration', null, 'vendor', 'link', 757, true, true),
      ('vendor-offboarding', 'vendor', 'Offboarding', 'إنهاء التعاقد', '/vendor-risk/offboarding', null, 'vendor', 'link', 758, true, true),
      ('vendor-monitoring', 'vendor', 'Continuous Monitoring', 'المراقبة المستمرة', '/vendor-risk/monitoring', null, 'vendor', 'link', 759, true, true),
      ('bcp-nav', null, 'BCP', 'استمرارية الأعمال', null, 'shield', 'bcp', 'group', 800, true, true),
      ('bcp-overview', 'bcp-nav', 'Overview', 'نظرة عامة', '/bcp/overview', null, 'bcp', 'link', 801, true, true),
      ('bcp-plans', 'bcp-nav', 'Plans', 'الخطط', '/bcp/plans', null, 'bcp', 'link', 802, true, true),
      ('bcp-bia', 'bcp-nav', 'BIA Wizard', 'معالج تحليل الأثر', '/bcp/bia', null, 'bcp', 'link', 803, true, true),
      ('bcp-exercises', 'bcp-nav', 'Exercises & DR Tests', 'التمارين والاختبارات', '/bcp/exercises', null, 'bcp', 'link', 804, true, true),
      ('bcp-crisis-comm', 'bcp-nav', 'Crisis Communication', 'اتصالات الأزمات', '/bcp/crisis-comm', null, 'bcp', 'link', 805, true, true),
      ('bcp-recovery', 'bcp-nav', 'Recovery Strategies', 'استراتيجيات التعافي', '/bcp/recovery', null, 'bcp', 'link', 806, true, true),
      ('bcp-activation', 'bcp-nav', 'Plan Activation', 'تفعيل الخطة', '/bcp/activation', null, 'bcp', 'link', 807, true, true),
      ('bcp-dependencies', 'bcp-nav', 'Dependency Maps', 'خرائط التبعية', '/bcp/dependencies', null, 'bcp', 'link', 808, true, true),
      ('bcp-maturity', 'bcp-nav', 'Maturity Assessment', 'تقييم النضج', '/bcp/maturity', null, 'bcp', 'link', 809, true, true),
      ('ai-governance', 'ai', 'AI Governance', 'حوكمة الذكاء', '/ai-governance/assets', null, 'ai-governance', 'link', 902, true, true),
      ('knowledge', null, 'Knowledge', 'المعرفة', '/knowledge-hub', 'book-open', 'knowledge', 'link', 850, true, true),
      ('training-nav', null, 'Training', 'التدريب', null, 'graduation-cap', 'training', 'group', 860, true, true),
      ('training-overview', 'training-nav', 'Overview', 'نظرة عامة', '/training/overview', null, 'training', 'link', 861, true, true),
      ('training-campaigns', 'training-nav', 'Campaigns', 'الحملات', '/training/campaigns', null, 'training', 'link', 862, true, true),
      ('training-assignments', 'training-nav', 'Assignments', 'التكليفات', '/training/assignments', null, 'training', 'link', 863, true, true),
      ('training-content', 'training-nav', 'Content Library', 'مكتبة المحتوى', '/training/content', null, 'training', 'link', 864, true, true),
      ('training-certifications', 'training-nav', 'Certifications', 'الشهادات', '/training/certifications', null, 'training', 'link', 865, true, true),
      ('training-phishing', 'training-nav', 'Phishing Simulations', 'محاكاة التصيد', '/training/phishing', null, 'training', 'link', 866, true, true),
      ('training-compliance', 'training-nav', 'Compliance Tracker', 'متابعة الامتثال', '/training/compliance', null, 'training', 'link', 867, true, true),
      ('training-reports', 'training-nav', 'Reports', 'التقارير', '/training/reports', null, 'training', 'link', 868, true, true),
      ('remediation-nav', null, 'Remediation', 'المعالجة', '/remediation', 'wrench', 'remediation', 'link', 870, true, true),
      ('asset-nav', null, 'Assets', 'الأصول', '/assets', 'server', 'asset', 'link', 880, true, true),
      ('help', null, 'Help', 'المساعدة', '/help', 'circle-help', null, 'link', 9100, true, true)
    ON CONFLICT (nav_key) DO NOTHING;
  `);
}
