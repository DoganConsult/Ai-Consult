-- Migration: Governance OS Configuration Tables
-- Purpose: Move all hardcoded mappings and rules to database-driven configuration
-- Version: 370
-- Date: 2026-03-20

-- ============================================================
-- 1. Module Configuration Tables
-- ============================================================

-- Module to table mapping (replaces MODULE_TABLE_MAP)
CREATE TABLE IF NOT EXISTS module_table_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  module_code VARCHAR(64) NOT NULL,
  table_name VARCHAR(128) NOT NULL,
  id_column VARCHAR(64) NOT NULL,
  org_unit_column VARCHAR(64),
  department_column VARCHAR(64),
  team_column VARCHAR(64),
  owner_column VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);

CREATE INDEX idx_module_table_mappings_tenant ON module_table_mappings(tenant_id);
CREATE INDEX idx_module_table_mappings_module ON module_table_mappings(module_code);

-- Module cross-link rules (replaces MODULE_CROSS_LINK_RULES)
CREATE TABLE IF NOT EXISTS module_cross_link_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  source_module VARCHAR(64) NOT NULL,
  trigger_statuses TEXT[] NOT NULL,
  target_module VARCHAR(64) NOT NULL,
  link_type VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL CHECK (action IN ('create_task', 'create_link', 'create_alert')),
  severity_filter TEXT[],
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cross_link_rules_tenant ON module_cross_link_rules(tenant_id);
CREATE INDEX idx_cross_link_rules_source ON module_cross_link_rules(source_module);
CREATE INDEX idx_cross_link_rules_target ON module_cross_link_rules(target_module);

-- Module to trigger type mapping (replaces MODULE_TO_TRIGGER)
CREATE TABLE IF NOT EXISTS module_trigger_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  module_code VARCHAR(64) NOT NULL,
  trigger_type VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);

CREATE INDEX idx_module_trigger_mappings_tenant ON module_trigger_mappings(tenant_id);

-- Task type mappings (replaces TASK_TYPE_MAP)
CREATE TABLE IF NOT EXISTS module_task_type_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  module_code VARCHAR(64) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);

CREATE INDEX idx_task_type_mappings_tenant ON module_task_type_mappings(tenant_id);

-- ============================================================
-- 2. Severity and Escalation Configuration
-- ============================================================

-- Severity escalation thresholds (replaces SEVERITY_ESCALATION_THRESHOLDS)
CREATE TABLE IF NOT EXISTS severity_escalation_thresholds (
  threshold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  severity VARCHAR(32) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  hours_threshold INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, severity)
);

CREATE INDEX idx_severity_thresholds_tenant ON severity_escalation_thresholds(tenant_id);

-- Escalation statuses (replaces ESCALATION_STATUSES)
CREATE TABLE IF NOT EXISTS escalation_statuses (
  status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  status_value VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, status_value)
);

CREATE INDEX idx_escalation_statuses_tenant ON escalation_statuses(tenant_id);

-- ============================================================
-- 3. Committee Visibility Configuration
-- ============================================================

-- Committee visibility thresholds (replaces COMMITTEE_VISIBILITY_THRESHOLDS)
CREATE TABLE IF NOT EXISTS committee_visibility_thresholds (
  threshold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  module_code VARCHAR(64) NOT NULL,
  visible_statuses TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);

CREATE INDEX idx_committee_visibility_tenant ON committee_visibility_thresholds(tenant_id);

-- ============================================================
-- 4. Recommendation Triggers
-- ============================================================

-- Recommendation triggers (replaces RECOMMENDATION_TRIGGERS)
CREATE TABLE IF NOT EXISTS recommendation_triggers (
  trigger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  module_code VARCHAR(64) NOT NULL,
  trigger_statuses TEXT[] NOT NULL,
  recommendation_type VARCHAR(128),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);

CREATE INDEX idx_recommendation_triggers_tenant ON recommendation_triggers(tenant_id);

-- ============================================================
-- 5. Route Permission Configuration
-- ============================================================

-- Route permission mappings (replaces hardcoded PERMS in rbac.ts)
CREATE TABLE IF NOT EXISTS route_permission_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64),
  route_pattern VARCHAR(256) NOT NULL,
  http_method VARCHAR(16) NOT NULL,
  permission_code VARCHAR(128) NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  is_global BOOLEAN DEFAULT FALSE, -- If TRUE, applies to all tenants
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_route_permissions_tenant ON route_permission_mappings(tenant_id);
CREATE INDEX idx_route_permissions_pattern ON route_permission_mappings(route_pattern, http_method);
CREATE INDEX idx_route_permissions_global ON route_permission_mappings(is_global) WHERE is_global = TRUE;

-- ============================================================
-- 6. Input Validation Rules
-- ============================================================

-- Input validation rules for endpoints
CREATE TABLE IF NOT EXISTS input_validation_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64),
  route_pattern VARCHAR(256) NOT NULL,
  http_method VARCHAR(16) NOT NULL,
  field_name VARCHAR(128) NOT NULL,
  field_type VARCHAR(64) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  min_length INTEGER,
  max_length INTEGER,
  min_value NUMERIC,
  max_value NUMERIC,
  pattern_regex VARCHAR(512),
  allowed_values TEXT[],
  validation_message_en TEXT,
  validation_message_ar TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_validation_rules_tenant ON input_validation_rules(tenant_id);
CREATE INDEX idx_validation_rules_route ON input_validation_rules(route_pattern, http_method);

-- ============================================================
-- 7. Default Agent Assignments (replaces DEFAULT_ASSIGNMENTS)
-- ============================================================

-- This table already exists (agent_context_assignments), but we'll add a template table
CREATE TABLE IF NOT EXISTS agent_assignment_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64),
  agent_id VARCHAR(64) NOT NULL,
  module_code VARCHAR(64) NOT NULL,
  trigger_events TEXT[] NOT NULL,
  priority INTEGER DEFAULT 50,
  activation_condition JSONB DEFAULT '{}',
  playbook_config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT TRUE,
  is_global BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_templates_tenant ON agent_assignment_templates(tenant_id);
CREATE INDEX idx_agent_templates_global ON agent_assignment_templates(is_global) WHERE is_global = TRUE;

-- ============================================================
-- 8. Audit Columns
-- ============================================================

-- Add audit columns to all config tables
ALTER TABLE module_table_mappings ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE module_table_mappings ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE module_cross_link_rules ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE module_cross_link_rules ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE module_trigger_mappings ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE module_trigger_mappings ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE module_task_type_mappings ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE module_task_type_mappings ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE severity_escalation_thresholds ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE severity_escalation_thresholds ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE escalation_statuses ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE escalation_statuses ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE committee_visibility_thresholds ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE committee_visibility_thresholds ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE recommendation_triggers ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE recommendation_triggers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE route_permission_mappings ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE route_permission_mappings ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE input_validation_rules ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE input_validation_rules ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

ALTER TABLE agent_assignment_templates ADD COLUMN IF NOT EXISTS created_by VARCHAR(64);
ALTER TABLE agent_assignment_templates ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64);

-- ============================================================
-- 9. Comments
-- ============================================================

COMMENT ON TABLE module_table_mappings IS 'Maps modules to their database tables and columns';
COMMENT ON TABLE module_cross_link_rules IS 'Rules for cross-module propagation when status changes';
COMMENT ON TABLE module_trigger_mappings IS 'Maps modules to AI workflow trigger types';
COMMENT ON TABLE module_task_type_mappings IS 'Maps modules to process task types';
COMMENT ON TABLE severity_escalation_thresholds IS 'Hours threshold for escalation by severity';
COMMENT ON TABLE escalation_statuses IS 'Status values that trigger escalation';
COMMENT ON TABLE committee_visibility_thresholds IS 'Status values that make entities visible to committees';
COMMENT ON TABLE recommendation_triggers IS 'Status values that trigger AI recommendations';
COMMENT ON TABLE route_permission_mappings IS 'Permission requirements for API routes';
COMMENT ON TABLE input_validation_rules IS 'Validation rules for API input fields';
COMMENT ON TABLE agent_assignment_templates IS 'Template agent assignments for seeding';
