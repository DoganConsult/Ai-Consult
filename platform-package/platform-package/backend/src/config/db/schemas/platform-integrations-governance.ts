// ============================================
// Platform Schema — Integrations & Governance Core
// Webhooks, webhook deliveries, integration configs,
// remediation tasks, scoring policies, GRC plans,
// workspaces, scope dimensions, object scopes,
// exceptions, findings, assets, object/control-risk/
// policy-control mappings.
// ============================================

import { query } from '../query';

export async function createIntegrationsGovernanceTables(schema: string): Promise<void> {
  // === Integration tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".webhooks (
      webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url VARCHAR(500) NOT NULL,
      event_types TEXT[] NOT NULL,
      secret VARCHAR(255),
      enabled BOOLEAN DEFAULT TRUE,
      failure_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".webhook_deliveries (
      delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      webhook_id UUID REFERENCES "${schema}".webhooks(webhook_id),
      event_type VARCHAR(50) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(20) NOT NULL,
      attempts INT DEFAULT 0,
      last_attempt_at TIMESTAMPTZ,
      response_code INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".integration_configs (
      integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      config JSONB NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Governance, Compliance, and Risk enhancement tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".remediation_tasks (
      task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      linked_entity_type VARCHAR(50),
      linked_entity_id VARCHAR(100),
      assigned_to VARCHAR(64),
      created_by VARCHAR(64),
      status VARCHAR(30) DEFAULT 'open'
        CHECK (status IN ('open','in_progress','completed','overdue','closed')),
      priority VARCHAR(20) DEFAULT 'medium',
      due_date DATE,
      completed_at TIMESTAMPTZ,
      root_cause_analysis TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".scoring_policies (
      policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      weights JSONB NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".grc_plans (
      plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      policy_ids TEXT[] DEFAULT '{}',
      control_ids TEXT[] DEFAULT '{}',
      assessment_ids TEXT[] DEFAULT '{}',
      vision_2030_tags TEXT[] DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'draft',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Workspace, scope, and common object tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".workspaces (
      workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      type VARCHAR(50) NOT NULL DEFAULT 'enterprise_grc',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".scope_dimensions (
      scope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES "${schema}".workspaces(workspace_id),
      dimension_type VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      parent_scope_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ux_scope_dimensions_ws_type_name
      ON "${schema}".scope_dimensions (workspace_id, dimension_type, name);

    CREATE TABLE IF NOT EXISTS "${schema}".object_scopes (
      object_type VARCHAR(50) NOT NULL,
      object_id VARCHAR(100) NOT NULL,
      scope_id UUID NOT NULL REFERENCES "${schema}".scope_dimensions(scope_id),
      PRIMARY KEY (object_type, object_id, scope_id)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".exceptions (
      exception_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES "${schema}".workspaces(workspace_id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      control_id VARCHAR(100),
      risk_id VARCHAR(16),
      status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','expired','closed')),
      approved_by VARCHAR(64),
      expiry_date DATE,
      lifecycle_phase VARCHAR(20) DEFAULT 'operate',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".findings (
      finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES "${schema}".workspaces(workspace_id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      source_type VARCHAR(50) NOT NULL,
      source_id VARCHAR(100) NOT NULL,
      severity VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'open',
      remediation_id UUID,
      lifecycle_phase VARCHAR(20) DEFAULT 'assure',
      confidentiality_level VARCHAR(20) DEFAULT 'internal' CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".assets (
      asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES "${schema}".workspaces(workspace_id),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL DEFAULT 'server',
      description TEXT DEFAULT '',
      owner VARCHAR(255),
      criticality VARCHAR(50) DEFAULT 'medium',
      department VARCHAR(255),
      location VARCHAR(255),
      ip_address VARCHAR(100),
      mac_address VARCHAR(100),
      os VARCHAR(200),
      classification VARCHAR(100) DEFAULT 'internal',
      status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive','retired','archived','under_review')),
      lifecycle_phase VARCHAR(20) DEFAULT 'plan',
      linked_controls UUID[] DEFAULT '{}',
      linked_risks UUID[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS "${schema}".object_mappings (
      mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(50) NOT NULL,
      source_id VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source_type, source_id, target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".control_risk_mappings (
      mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      control_id VARCHAR(100) NOT NULL,
      risk_id VARCHAR(100) NOT NULL,
      mapping_type VARCHAR(30) DEFAULT 'mitigates',
      effectiveness VARCHAR(20) DEFAULT 'partial',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(control_id, risk_id)
    );

    CREATE TABLE IF NOT EXISTS "${schema}".policy_control_mappings (
      mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      policy_id VARCHAR(16) NOT NULL,
      control_id VARCHAR(100) NOT NULL,
      alignment_status VARCHAR(30) DEFAULT 'aligned',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(policy_id, control_id)
    );
  `);
}
